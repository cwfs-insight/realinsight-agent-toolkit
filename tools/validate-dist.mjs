#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_ROOT = path.resolve(REPO_ROOT, process.argv[2] || ".tmp/dist");
const NON_PROD_ENVS = new Set(["dev", "qa", "localhost"]);

const failures = [];

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

async function main() {
  const envs = await child_dirs(DIST_ROOT);

  for (const env of envs) {
    await validate_env(env);
  }

  if (failures.length > 0) {
    console.error("Dist validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Dist validation passed for ${path.relative(REPO_ROOT, DIST_ROOT) || "."}.`);
}

async function validate_env(env) {
  await validate_codex(env, "http");
  await validate_codex(env, "node");
  await validate_claude_plugin(env, "http");
  await validate_claude_plugin(env, "node");
  await validate_claude_plugin(env, "mcp-remote");
  await validate_readmes(env);
}

async function validate_codex(env, runtime) {
  const root = path.join(DIST_ROOT, env, runtime, "codex/marketplace");
  if (!await exists(root)) return;

  const marketplace = await read_json(path.join(root, ".agents/plugins/marketplace.json"));
  const entry = marketplace.plugins?.[0];
  const plugin_rel = entry?.source?.path;
  if (!plugin_rel) {
    fail(env, runtime, "Codex marketplace entry is missing source.path.");
    return;
  }

  const plugin_root = path.resolve(root, plugin_rel);
  const manifest = await read_json(path.join(plugin_root, ".codex-plugin/plugin.json"));
  const mcp = await read_json(path.join(plugin_root, ".mcp.json"));
  if (Object.keys(mcp).some((key) => key !== "mcpServers")) {
    fail(env, runtime, "Codex companion .mcp.json must contain only top-level mcpServers.");
  }
  const server = Object.values(mcp.mcpServers || {})[0];
  const long_description = manifest.interface?.longDescription || "";

  assert_non_prod_version(env, manifest.version, `${runtime} Codex plugin manifest`);

  if (runtime === "http") {
    if (server?.type !== "http") fail(env, runtime, "Codex HTTP MCP config must use type=http.");
    if (!server?.url?.endsWith("/mcp")) fail(env, runtime, "Codex HTTP MCP config must point at a /mcp URL.");
    if (server?.command) fail(env, runtime, "Codex HTTP MCP config must not include a local command.");
    if (!long_description.includes("hosted Realinsight Streamable HTTP MCP server")) {
      fail(env, runtime, "Codex HTTP longDescription must describe hosted Streamable HTTP MCP.");
    }
    if (long_description.includes("local ri-agent MCP server")) {
      fail(env, runtime, "Codex HTTP longDescription still says local ri-agent MCP server.");
    }
  }

  if (runtime === "node") {
    if (server?.type !== "stdio") fail(env, runtime, "Codex node MCP config must use type=stdio.");
    if (server?.command !== "node") fail(env, runtime, "Codex node MCP config must use command=node.");
    if (!long_description.includes("bundled local ri-agent MCP server")) {
      fail(env, runtime, "Codex node longDescription must describe bundled local ri-agent MCP.");
    }
  }
}

async function validate_claude_plugin(env, runtime) {
  const root = path.join(DIST_ROOT, env, runtime, "claude-plugin/marketplace");
  if (!await exists(root)) return;

  const marketplace = await read_json(path.join(root, ".claude-plugin/marketplace.json"));
  const entry = marketplace.plugins?.[0];
  const plugin_rel = entry?.source;
  if (!plugin_rel) {
    fail(env, runtime, "Claude marketplace entry is missing source.");
    return;
  }

  const plugin_root = path.resolve(root, plugin_rel);
  const manifest = await read_json(path.join(plugin_root, ".claude-plugin/plugin.json"));
  const mcp = await read_json(path.join(plugin_root, ".mcp.json"));
  const server = Object.values(mcp.mcpServers || {})[0];

  assert_non_prod_version(env, manifest.version, `${runtime} Claude plugin manifest`);
  if (entry.version !== manifest.version) {
    fail(env, runtime, `Claude marketplace version ${entry.version || "(missing)"} does not match plugin version ${manifest.version || "(missing)"}.`);
  }

  if (runtime === "http") {
    if (Object.hasOwn(manifest, "tools")) fail(env, runtime, "Claude HTTP plugin must not embed a static tools list.");
    if (server?.type !== "http") fail(env, runtime, "Claude HTTP MCP config must use type=http.");
    if (!server?.url?.endsWith("/mcp")) fail(env, runtime, "Claude HTTP MCP config must point at a /mcp URL.");
    if (server?.command) fail(env, runtime, "Claude HTTP MCP config must not include a local command.");
  }

  if (runtime === "node") {
    if (server?.type !== "stdio") fail(env, runtime, "Claude node MCP config must use type=stdio.");
    if (server?.command !== "node") fail(env, runtime, "Claude node MCP config must use command=node.");
    if (!server?.args?.some((arg) => String(arg).includes("${CLAUDE_PLUGIN_ROOT}/src/ri-agent.mjs"))) {
      fail(env, runtime, "Claude node MCP config must run the bundled plugin root ri-agent.mjs.");
    }
  }

  if (runtime === "mcp-remote") {
    if (server?.type !== "stdio") fail(env, runtime, "Claude mcp-remote MCP config must use type=stdio.");
    if (server?.command !== "npx") fail(env, runtime, "Claude mcp-remote MCP config must use command=npx.");
    if (!server?.args?.includes("mcp-remote@latest")) {
      fail(env, runtime, "Claude mcp-remote MCP config must run mcp-remote@latest.");
    }
    if (!server?.args?.some((arg) => String(arg).endsWith("/mcp"))) {
      fail(env, runtime, "Claude mcp-remote MCP config must include the hosted /mcp URL.");
    }
    if (server?.env) fail(env, runtime, "Claude mcp-remote MCP config must not include local ri-agent env.");
  }
}

async function validate_readmes(env) {
  const files = await list_files(path.join(DIST_ROOT, env));

  for (const file of files) {
    if (path.basename(file) !== "README.md") continue;
    const text = await fs.readFile(file, "utf8");
    const rel = path.relative(REPO_ROOT, file);

    if (/\btemporary\b/i.test(text)) fail(env, "readme", `${rel} uses temporary wording.`);
    if (file.includes(`${path.sep}http${path.sep}`) && /local auth profile/i.test(text)) {
      fail(env, "http", `${rel} mentions a local auth profile in an HTTP package.`);
    }
    if (file.includes(`${path.sep}http${path.sep}`) && /local ri-agent MCP server/i.test(text)) {
      fail(env, "http", `${rel} mentions local ri-agent MCP in an HTTP package.`);
    }
  }
}

function assert_non_prod_version(env, version, label) {
  if (!NON_PROD_ENVS.has(env)) return;
  if (!version || !version.includes(`-${env}.`)) {
    fail(env, "version", `${label} version must include -${env}. build metadata; got ${version || "(missing)"}.`);
  }
}

async function child_dirs(dir) {
  if (!await exists(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function list_files(root) {
  if (!await exists(root)) return [];
  const files = [];

  async function visit(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(abs);
      else if (entry.isFile()) files.push(abs);
    }
  }

  await visit(root);
  return files;
}

async function read_json(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function exists(file) {
  try {
    await fs.stat(file);
    return true;
  }
  catch {
    return false;
  }
}

function fail(env, runtime, message) {
  failures.push(`${env}/${runtime}: ${message}`);
}
