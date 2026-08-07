#!/usr/bin/env node
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate_agent_plugin } from "./validate-agent-plugin.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "realinsight-agent-plugin-validator-"));
const plugin_root = path.join(scratch, "plugin");

try {
  await fs.mkdir(plugin_root, { recursive: true });
  for (const file of ["plugin.json", "mcp.json"]) {
    await fs.copyFile(path.join(REPO_ROOT, file), path.join(plugin_root, file));
  }
  await fs.cp(path.join(REPO_ROOT, "skills"), path.join(plugin_root, "skills"), { recursive: true });

  assert.deepEqual(await validate_agent_plugin(plugin_root), [], "the checked-in portable package fixture should pass");

  await with_json_mutation("plugin.json", (manifest) => {
    manifest.displayName = "not portable";
  }, async () => {
    await assert_failure("plugin.json.displayName", "unknown manifest fields must fail");
  });

  await with_json_mutation("mcp.json", (mcp) => {
    mcp.mcpServers["realinsight-agent-toolkit"].url = "http://www.realinsight.cloud/api/v1/mcp";
  }, async () => {
    await assert_failure("non-loopback endpoints must use HTTPS", "insecure remote URLs must fail");
  });

  await with_json_mutation("mcp.json", (mcp) => {
    mcp.mcpServers["realinsight-agent-toolkit"].url = "http://[::1]/mcp";
  }, async () => {
    assert.deepEqual(await validate_agent_plugin(plugin_root), [], "loopback HTTP URLs should remain portable");
  });

  const outside_server = path.join(scratch, "outside-server");
  await fs.writeFile(outside_server, "not executable in this structural test\n");
  await fs.mkdir(path.join(plugin_root, "bin"), { recursive: true });
  await fs.symlink(outside_server, path.join(plugin_root, "bin/server"));
  await with_json_mutation("mcp.json", (mcp) => {
    mcp.mcpServers["realinsight-agent-toolkit"] = {
      type: "stdio",
      command: "./bin/server",
    };
  }, async () => {
    await assert_failure("must not resolve through a symlink outside the plugin root", "stdio command symlink escapes must fail");
  });

  const skill_file = path.join(plugin_root, "skills/realinsight-agent-toolkit/SKILL.md");
  const original_skill = await fs.readFile(skill_file, "utf8");
  try {
    await fs.writeFile(skill_file, original_skill.replace("name: realinsight-agent-toolkit", "name: wrong-name"));
    await assert_failure("must match its parent directory", "skill names must match their directory");
  }
  finally {
    await fs.writeFile(skill_file, original_skill);
  }

  const outside_skill = path.join(scratch, "outside-SKILL.md");
  await fs.writeFile(outside_skill, original_skill);
  try {
    await fs.rm(skill_file);
    await fs.symlink(outside_skill, skill_file);
    await assert_failure("resolves outside the plugin root", "skill symlink escapes must fail");
  }
  finally {
    await fs.rm(skill_file, { force: true });
    await fs.writeFile(skill_file, original_skill);
  }

  console.log("Agent Plugin validator tests passed.");
}
finally {
  await fs.rm(scratch, { recursive: true, force: true });
}

async function with_json_mutation(relative, mutate, check) {
  const file = path.join(plugin_root, relative);
  const original = await fs.readFile(file, "utf8");
  try {
    const value = JSON.parse(original);
    mutate(value);
    await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
    await check();
  }
  finally {
    await fs.writeFile(file, original);
  }
}

async function assert_failure(expected, message) {
  const failures = await validate_agent_plugin(plugin_root);
  assert.ok(failures.some((failure) => failure.includes(expected)), `${message}: ${failures.join("; ")}`);
}
