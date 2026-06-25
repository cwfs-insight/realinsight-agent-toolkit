#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROVIDERS_ROOT = path.join(REPO_ROOT, "providers");
const EXPECTED = {
  prod: {
    marketplace: "realinsight",
    plugin: "realinsight-connector",
    server: "realinsight-agent-toolkit",
    url: "https://www.realinsight.cloud/api/v1/mcp",
  },
  dev: {
    marketplace: "realinsight-dev",
    plugin: "realinsight-connector-dev",
    server: "realinsight-agent-toolkit-dev",
    url: "https://www.ri2-dev.com/api/v1/mcp",
  },
  qa: {
    marketplace: "realinsight-qa",
    plugin: "realinsight-connector-qa",
    server: "realinsight-agent-toolkit-qa",
    url: "https://www.ri2-qa.com/api/v1/mcp",
  },
};

const failures = [];

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

async function main() {
  await validate_root_codex_marketplace();

  for (const [env, expected] of Object.entries(EXPECTED)) {
    await validate_codex_provider(env, expected);
    await validate_claude_provider(env, expected);
    await validate_cursor_provider(env, expected);
  }

  if (failures.length) {
    console.error("Provider validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("Provider validation passed.");
}

async function validate_root_codex_marketplace() {
  const marketplace = await read_json(path.join(REPO_ROOT, ".agents/plugins/marketplace.json"));
  const expected_entries = [
    ["prod", "./plugins/codex/realinsight-connector"],
    ["dev", "./providers/codex/dev/plugins/codex/realinsight-connector-dev"],
    ["qa", "./providers/codex/qa/plugins/codex/realinsight-connector-qa"],
  ];

  if (marketplace.name !== "realinsight") fail("root", `Codex marketplace name is ${marketplace.name || "(missing)"}.`);

  for (const [env, plugin_path] of expected_entries) {
    const expected = EXPECTED[env];
    const entry = marketplace.plugins?.find((plugin) => plugin.name === expected.plugin);
    if (!entry) {
      fail("root", `Codex marketplace missing ${expected.plugin}.`);
      continue;
    }
    if (entry.source?.path !== plugin_path) {
      fail("root", `Codex ${expected.plugin} source path is ${entry.source?.path || "(missing)"}.`);
      continue;
    }
    if (entry.policy?.installation !== "AVAILABLE") {
      fail("root", `Codex ${expected.plugin} installation policy is ${entry.policy?.installation || "(missing)"}.`);
    }
    if (entry.policy?.authentication !== "ON_INSTALL") {
      fail("root", `Codex ${expected.plugin} authentication policy is ${entry.policy?.authentication || "(missing)"}.`);
    }

    const plugin_root = path.resolve(REPO_ROOT, plugin_path);
    const manifest = await read_json(path.join(plugin_root, ".codex-plugin/plugin.json"));
    const mcp = await read_json(path.join(plugin_root, ".mcp.json"));
    const server = mcp.mcpServers?.[expected.server];
    if (manifest.name !== expected.plugin) fail("root", `Codex manifest name for ${expected.plugin} is ${manifest.name || "(missing)"}.`);
    if (server?.type !== "http") fail("root", `Codex ${expected.plugin} MCP server type must be http.`);
    if (server?.url !== expected.url) fail("root", `Codex ${expected.plugin} MCP URL is ${server?.url || "(missing)"}.`);
  }
}

async function validate_claude_provider(env, expected) {
  const root = path.join(PROVIDERS_ROOT, "claude", env);
  const marketplace = await read_json(path.join(root, ".claude-plugin/marketplace.json"));
  const entry = marketplace.plugins?.[0];
  const plugin_rel = entry?.source;

  if (marketplace.name !== expected.marketplace) fail(env, `Claude marketplace name is ${marketplace.name || "(missing)"}.`);
  if (entry?.name !== expected.plugin) fail(env, `Claude plugin entry name is ${entry?.name || "(missing)"}.`);
  if (!plugin_rel || typeof plugin_rel !== "string") {
    fail(env, "Claude plugin entry is missing relative source.");
    return;
  }
  if (!plugin_rel.startsWith("./")) {
    fail(env, `Claude plugin source must be relative to marketplace root; got ${plugin_rel}.`);
    return;
  }

  const plugin_root = path.resolve(root, plugin_rel);
  if (!plugin_root.startsWith(root)) {
    fail(env, `Claude plugin source escapes provider root: ${plugin_rel}`);
    return;
  }

  const manifest = await read_json(path.join(plugin_root, ".claude-plugin/plugin.json"));
  const mcp = await read_json(path.join(plugin_root, ".mcp.json"));
  const server = mcp.mcpServers?.[expected.server];

  if (manifest.name !== expected.plugin) fail(env, `Claude manifest name is ${manifest.name || "(missing)"}.`);
  if (entry.version !== manifest.version) {
    fail(env, `Claude marketplace version ${entry.version || "(missing)"} does not match manifest version ${manifest.version || "(missing)"}.`);
  }
  if (!manifest.version) fail(env, "Claude manifest version is missing.");
  if (env !== "prod" && !manifest.version.endsWith(`-${env}`)) {
    fail(env, `Claude non-prod manifest version should end with -${env}; got ${manifest.version}.`);
  }
  if (!server) fail(env, `Claude missing MCP server ${expected.server}.`);
  if (server?.type !== "http") fail(env, "Claude MCP server type must be http.");
  if (server?.url !== expected.url) fail(env, `Claude MCP URL is ${server?.url || "(missing)"}.`);
  if (server?.command) fail(env, "Claude HTTP MCP config must not include a local command.");
}

async function validate_codex_provider(env, expected) {
  const root = path.join(PROVIDERS_ROOT, "codex", env);
  const marketplace = await read_json(path.join(root, ".agents/plugins/marketplace.json"));
  const entry = marketplace.plugins?.[0];
  const plugin_rel = entry?.source?.path;

  if (marketplace.name !== expected.marketplace) fail(env, `marketplace name is ${marketplace.name || "(missing)"}.`);
  if (entry?.name !== expected.plugin) fail(env, `plugin entry name is ${entry?.name || "(missing)"}.`);
  if (!plugin_rel) {
    fail(env, "plugin entry is missing source.path.");
    return;
  }

  const plugin_root = path.resolve(root, plugin_rel);
  if (!plugin_root.startsWith(root)) {
    fail(env, `plugin source escapes provider root: ${plugin_rel}`);
    return;
  }

  const manifest = await read_json(path.join(plugin_root, ".codex-plugin/plugin.json"));
  const mcp = await read_json(path.join(plugin_root, ".mcp.json"));
  const server = mcp.mcpServers?.[expected.server];

  if (manifest.name !== expected.plugin) fail(env, `manifest name is ${manifest.name || "(missing)"}.`);
  if (!manifest.version) fail(env, "manifest version is missing.");
  if (env !== "prod" && !manifest.version.endsWith(`-${env}`)) {
    fail(env, `non-prod manifest version should end with -${env}; got ${manifest.version}.`);
  }
  if (Object.keys(mcp).some((key) => key !== "mcpServers")) {
    fail(env, "companion .mcp.json must contain only top-level mcpServers.");
  }
  if (!server) fail(env, `missing MCP server ${expected.server}.`);
  if (server?.type !== "http") fail(env, "MCP server type must be http.");
  if (server?.url !== expected.url) fail(env, `MCP URL is ${server?.url || "(missing)"}.`);
  if (server?.command) fail(env, "HTTP MCP config must not include a local command.");

  const long_description = manifest.interface?.longDescription || "";
  if (!long_description.includes("hosted Realinsight Streamable HTTP MCP server")) {
    fail(env, "Codex longDescription must describe hosted Streamable HTTP MCP.");
  }
  if (long_description.includes("local ri-agent MCP server")) {
    fail(env, "Codex longDescription still says local ri-agent MCP server.");
  }
}

async function validate_cursor_provider(env, expected) {
  const root = env === "prod"
    ? path.join(PROVIDERS_ROOT, "cursor", "plugin")
    : path.join(PROVIDERS_ROOT, "cursor", env, "plugin");
  const manifest = await read_json(path.join(root, ".cursor-plugin/plugin.json"));
  const mcp = await read_json(path.join(root, "mcp.json"));
  const server = mcp.mcpServers?.[expected.server];

  if (manifest.name !== expected.plugin) fail(env, `Cursor manifest name is ${manifest.name || "(missing)"}.`);
  if (!manifest.version) fail(env, "Cursor manifest version is missing.");
  if (env !== "prod" && !manifest.version.endsWith(`-${env}`)) {
    fail(env, `Cursor non-prod manifest version should end with -${env}; got ${manifest.version}.`);
  }
  if (manifest.homepage !== "https://www.realinsight.com") {
    fail(env, `Cursor homepage is ${manifest.homepage || "(missing)"}.`);
  }
  if (manifest.author?.url !== "https://www.realinsight.com") {
    fail(env, `Cursor author URL is ${manifest.author?.url || "(missing)"}.`);
  }
  if (!server) fail(env, `Cursor missing MCP server ${expected.server}.`);
  if (server?.type !== "http") fail(env, "Cursor MCP server type must be http.");
  if (server?.url !== expected.url) fail(env, `Cursor MCP URL is ${server?.url || "(missing)"}.`);
  if (server?.command) fail(env, "Cursor HTTP MCP config must not include a local command.");
}

async function read_json(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  }
  catch (error) {
    fail("global", `unable to read ${path.relative(REPO_ROOT, file)}: ${error.message}`);
    return {};
  }
}

function fail(env, message) {
  failures.push(`${env}: ${message}`);
}
