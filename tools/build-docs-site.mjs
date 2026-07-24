#!/usr/bin/env node

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec_file = promisify(execFile);
const repo_root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs_root = path.join(repo_root, "docs");
const output_root = resolve_output(process.argv.slice(2));

await validate_site_sources();
await fs.rm(output_root, { recursive: true, force: true });
await fs.mkdir(path.dirname(output_root), { recursive: true });
await fs.cp(docs_root, output_root, { recursive: true });

console.log(`Built GitHub Pages site at ${path.relative(repo_root, output_root)}`);

function resolve_output(args) {
  const index = args.indexOf("--output");
  const value = index >= 0 ? args[index + 1] : ".tmp/pages-site";
  if (!value) {
    throw new Error("--output requires a path.");
  }

  const resolved = path.resolve(repo_root, value);
  const relative = path.relative(repo_root, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || resolved === docs_root) {
    throw new Error(`Refusing unsafe documentation output path: ${resolved}`);
  }
  return resolved;
}

async function validate_site_sources() {
  const required = [
    "index.html",
    ".nojekyll",
    "favicon.ico",
    "assets/site.css",
    "assets/site.js",
    "assets/brand/realinsight-agent-favicon.svg",
    "assets/brand/realinsight-agent-icon-180.png",
    "assets/brand/realinsight-logo-primary.svg",
    "assets/brand/realinsight-logo-white.svg",
    "install-data.json",
    "agent-install.md",
    "llms.txt",
  ];
  for (const relative of required) {
    await fs.access(path.join(docs_root, relative));
  }

  const catalog = JSON.parse(await fs.readFile(path.join(docs_root, "install-data.json"), "utf8"));
  if (
    catalog.schema_version !== 1
    || catalog.defaults?.surface !== "desktop"
    || catalog.defaults?.transport !== "remote"
    || catalog.defaults?.environment !== "prod"
  ) {
    throw new Error("Install catalog must default to the native desktop app, remote MCP, and production.");
  }
  const package_manifest = JSON.parse(await fs.readFile(path.join(repo_root, "packages/agent-toolkit/package.json"), "utf8"));
  if (catalog.release_version !== package_manifest.version) {
    throw new Error("Install catalog release version does not match the exported toolkit package.");
  }

  const expected = {
    prod: await read_mcp_endpoint("examples/mcp/mcp.prod.json"),
    qa: await read_mcp_endpoint("examples/mcp/mcp.qa.json"),
    dev: await read_mcp_endpoint("providers/cursor/dev/plugin/mcp.json"),
  };
  for (const [code, endpoint] of Object.entries(expected)) {
    if (catalog.environments?.[code]?.mcp_url !== endpoint) {
      throw new Error(`Install catalog ${code} endpoint does not match checked-in MCP configuration.`);
    }
  }
  for (const environment of Object.values(catalog.environments ?? {})) {
    for (const relative of [
      environment.remote_example,
      environment.local_example,
      ...Object.values(environment.providers ?? {}),
    ]) {
      await fs.access(path.join(repo_root, relative));
    }
  }
  for (const harness of Object.values(catalog.harnesses ?? {})) {
    await fs.access(path.join(docs_root, harness.guide));
  }

  const site_text = await Promise.all([
    "index.html",
    "agent-install.md",
    "install-data.json",
  ].map((relative) => fs.readFile(path.join(docs_root, relative), "utf8")));
  if (site_text.some((content) => /npx\s+(?:-y\s+)?@realinsight\/agent-toolkit/i.test(content))) {
    throw new Error("Documentation site must not present the unpublished native npx package as an install path.");
  }

  const html = site_text[0];
  for (const marker of ["harness-select", "surface-select", "transport-select", "environment-select", "install-output"]) {
    if (!html.includes(`id="${marker}"`)) {
      throw new Error(`Documentation site is missing required selector/output marker: ${marker}`);
    }
  }
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const link = match[1];
    if (/^(?:https?:|#)/.test(link)) {
      continue;
    }
    const target = path.resolve(docs_root, link.split(/[?#]/, 1)[0]);
    await fs.access(target);
  }

  await exec_file(process.execPath, ["--check", path.join(docs_root, "assets/site.js")]);
}

async function read_mcp_endpoint(relative) {
  const value = JSON.parse(await fs.readFile(path.join(repo_root, relative), "utf8"));
  const server = Object.values(value.mcpServers ?? {})[0];
  if (!server || server.type !== "http" || typeof server.url !== "string") {
    throw new Error(`Expected one hosted HTTP MCP server in ${relative}.`);
  }
  return server.url;
}
