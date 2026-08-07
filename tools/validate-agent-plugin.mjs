#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { validateHeaderName, validateHeaderValue } from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "yaml";

export const AGENT_PLUGIN_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
export const AGENT_PLUGIN_MCP_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json";

const DEFAULT_PLUGIN_ROOT = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const PLUGIN_FIELDS = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);
const SKILL_FIELDS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);

export async function validate_agent_plugin(plugin_root = DEFAULT_PLUGIN_ROOT) {
  const root = path.resolve(plugin_root);
  const failures = [];
  const fail = (location, message) => failures.push(`${location}: ${message}`);

  const root_real = await realpath_or_fail(root, ".", fail);
  if (!root_real) return failures;

  const manifest_path = path.join(root, "plugin.json");
  const manifest = await read_contained_json(manifest_path, root_real, "plugin.json", fail);
  if (manifest) validate_manifest(manifest, fail);

  const mcp_path = path.join(root, "mcp.json");
  const mcp = await read_contained_json(mcp_path, root_real, "mcp.json", fail);
  if (mcp) await validate_mcp(mcp, root_real, fail);

  await validate_skills(root, root_real, fail);
  return failures;
}

function validate_manifest(manifest, fail) {
  if (!is_object(manifest)) {
    fail("plugin.json", "must contain a JSON object.");
    return;
  }

  reject_unknown_fields(manifest, PLUGIN_FIELDS, "plugin.json", fail);

  if (manifest.$schema !== AGENT_PLUGIN_SCHEMA) {
    fail("plugin.json.$schema", `must be ${AGENT_PLUGIN_SCHEMA}.`);
  }

  if (typeof manifest.name !== "string" || manifest.name.length < 1 || manifest.name.length > 64) {
    fail("plugin.json.name", "must be a string between 1 and 64 characters.");
  }
  else if (!/^(?!.*(?:--|\.\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(manifest.name)) {
    fail("plugin.json.name", "must use lowercase letters, digits, hyphens, and periods without leading, trailing, or repeated separators.");
  }

  for (const field of ["version", "description", "homepage", "repository", "license"]) {
    if (Object.hasOwn(manifest, field) && typeof manifest[field] !== "string") {
      fail(`plugin.json.${field}`, "must be a string.");
    }
  }

  if (Object.hasOwn(manifest, "author")) {
    if (!is_object(manifest.author)) {
      fail("plugin.json.author", "must be an object.");
    }
    else {
      const author_fields = new Set(["name", "email", "url"]);
      reject_unknown_fields(manifest.author, author_fields, "plugin.json.author", fail);
      for (const [field, value] of Object.entries(manifest.author)) {
        if (typeof value !== "string") fail(`plugin.json.author.${field}`, "must be a string.");
      }
    }
  }

  if (Object.hasOwn(manifest, "keywords")) {
    if (!Array.isArray(manifest.keywords) || manifest.keywords.some((value) => typeof value !== "string")) {
      fail("plugin.json.keywords", "must be an array of strings.");
    }
  }

  if (Object.hasOwn(manifest, "extensions")) {
    if (!is_object(manifest.extensions)) {
      fail("plugin.json.extensions", "must be an object.");
    }
    else {
      for (const [namespace, value] of Object.entries(manifest.extensions)) {
        if (!is_reverse_domain_namespace(namespace)) {
          fail(`plugin.json.extensions.${namespace}`, "must use a stable reverse-domain namespace.");
        }
        if (!is_object(value)) fail(`plugin.json.extensions.${namespace}`, "must be an object.");
      }
    }
  }
}

async function validate_mcp(mcp, root_real, fail) {
  if (!is_object(mcp)) {
    fail("mcp.json", "must contain a JSON object.");
    return;
  }

  reject_unknown_fields(mcp, new Set(["$schema", "mcpServers"]), "mcp.json", fail);

  if (mcp.$schema !== AGENT_PLUGIN_MCP_SCHEMA) {
    fail("mcp.json.$schema", `must be ${AGENT_PLUGIN_MCP_SCHEMA}.`);
  }
  if (!is_object(mcp.mcpServers)) {
    fail("mcp.json.mcpServers", "must be an object.");
    return;
  }

  for (const [name, server] of Object.entries(mcp.mcpServers)) {
    const location = `mcp.json.mcpServers.${name || "(empty)"}`;
    if (!is_object(server)) {
      fail(location, "must be an object.");
      continue;
    }

    if (server.type === "stdio") await validate_stdio_server(server, root_real, location, fail);
    else if (server.type === "streamable-http" || server.type === "sse") validate_remote_server(server, location, fail);
    else fail(`${location}.type`, "must be stdio, streamable-http, or sse.");
  }
}

async function validate_stdio_server(server, root_real, location, fail) {
  reject_unknown_fields(server, new Set(["type", "command", "args", "env", "cwd"]), location, fail);

  if (typeof server.command !== "string" || !server.command) {
    fail(`${location}.command`, "must be a non-empty executable token.");
  }
  else if (server.command.startsWith("./")) {
    await validate_plugin_relative_path(server.command, root_real, `${location}.command`, fail);
  }
  else if (server.command.includes("/") || server.command.includes("\\")) {
    fail(`${location}.command`, "must be a bare executable name or a plugin-relative path beginning with ./.");
  }

  if (Object.hasOwn(server, "args") && (!Array.isArray(server.args) || server.args.some((value) => typeof value !== "string"))) {
    fail(`${location}.args`, "must be an array of strings.");
  }

  if (Object.hasOwn(server, "env")) {
    if (!is_object(server.env)) {
      fail(`${location}.env`, "must be an object of string values.");
    }
    else {
      for (const [name, value] of Object.entries(server.env)) {
        if (name === "PLUGIN_ROOT" || name === "PLUGIN_DATA") {
          fail(`${location}.env.${name}`, "is reserved and must be supplied by the client.");
        }
        if (typeof value !== "string") fail(`${location}.env.${name}`, "must be a string.");
      }
    }
  }

  if (Object.hasOwn(server, "cwd")) await validate_cwd(server.cwd, root_real, `${location}.cwd`, fail);
}

function validate_remote_server(server, location, fail) {
  reject_unknown_fields(server, new Set(["type", "url", "headers"]), location, fail);

  if (typeof server.url !== "string" || !server.url) {
    fail(`${location}.url`, "must be a non-empty absolute HTTP or HTTPS URL.");
  }
  else {
    try {
      const url = new URL(server.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
      if (url.username || url.password) throw new Error("must not include user information");
      if (url.hash) throw new Error("must not include a fragment");
      if (url.protocol !== "https:" && !is_loopback_host(url.hostname)) {
        throw new Error("non-loopback endpoints must use HTTPS");
      }
    }
    catch (error) {
      fail(`${location}.url`, error.message);
    }
  }

  if (Object.hasOwn(server, "headers")) {
    if (!is_object(server.headers)) {
      fail(`${location}.headers`, "must be an object of literal string values.");
    }
    else {
      const names = new Set();
      for (const [name, value] of Object.entries(server.headers)) {
        const normalized = name.toLowerCase();
        if (names.has(normalized)) fail(`${location}.headers.${name}`, "duplicates another header name case-insensitively.");
        names.add(normalized);

        try {
          validateHeaderName(name);
          validateHeaderValue(name, value);
        }
        catch (error) {
          fail(`${location}.headers.${name}`, error.message);
        }
        if (typeof value !== "string") fail(`${location}.headers.${name}`, "must be a string.");
        if (/authorization|api[-_]?key|token|secret|credential/i.test(name)) {
          fail(`${location}.headers.${name}`, "must not embed credentials or secrets in portable package data.");
        }
      }
    }
  }
}

async function validate_skills(root, root_real, fail) {
  const skills_path = path.join(root, "skills");
  const skills_real = await realpath_or_fail(skills_path, "skills", fail);
  if (!skills_real) return;
  if (!is_within(root_real, skills_real)) {
    fail("skills", "resolves outside the plugin root.");
    return;
  }
  if (!(await fs.stat(skills_path)).isDirectory()) {
    fail("skills", "must resolve to a directory.");
    return;
  }

  const entries = await fs.readdir(skills_path, { withFileTypes: true });
  for (const entry of entries) {
    const skill_root = path.join(skills_path, entry.name);
    let skill_stat;
    try {
      skill_stat = await fs.stat(skill_root);
    }
    catch {
      continue;
    }
    if (!skill_stat.isDirectory()) continue;

    const skill_file = path.join(skill_root, "SKILL.md");
    try {
      const skill_real = await fs.realpath(skill_file);
      const stat = await fs.stat(skill_file);
      if (!stat.isFile()) {
        fail(`skills/${entry.name}/SKILL.md`, "must resolve to a regular file.");
        continue;
      }
      if (!is_within(root_real, skill_real)) {
        fail(`skills/${entry.name}/SKILL.md`, "resolves outside the plugin root.");
        continue;
      }
      await validate_skill_file(skill_file, entry.name, fail);
    }
    catch (error) {
      if (error.code !== "ENOENT") fail(`skills/${entry.name}/SKILL.md`, error.message);
    }
  }
}

async function validate_skill_file(skill_file, directory_name, fail) {
  const location = `skills/${directory_name}/SKILL.md`;
  const source = await fs.readFile(skill_file, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    fail(location, "must contain YAML frontmatter followed by Markdown content.");
    return;
  }

  const document = parseDocument(match[1]);
  for (const error of document.errors) fail(location, `invalid YAML frontmatter: ${error.message}`);
  if (document.errors.length) return;

  const metadata = document.toJS();
  if (!is_object(metadata)) {
    fail(location, "frontmatter must be a YAML mapping.");
    return;
  }
  reject_unknown_fields(metadata, SKILL_FIELDS, location, fail);

  if (typeof metadata.name !== "string" || !/^(?!.*--)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(metadata.name) || metadata.name.length > 64) {
    fail(`${location} name`, "must be 1-64 lowercase letters, digits, or hyphens without leading, trailing, or consecutive hyphens.");
  }
  else if (metadata.name !== directory_name) {
    fail(`${location} name`, `must match its parent directory (${directory_name}).`);
  }

  if (typeof metadata.description !== "string" || metadata.description.length < 1 || metadata.description.length > 1024) {
    fail(`${location} description`, "must be a non-empty string of at most 1024 characters.");
  }

  if (Object.hasOwn(metadata, "license") && typeof metadata.license !== "string") {
    fail(`${location} license`, "must be a string.");
  }
  if (Object.hasOwn(metadata, "compatibility") && (typeof metadata.compatibility !== "string" || metadata.compatibility.length < 1 || metadata.compatibility.length > 500)) {
    fail(`${location} compatibility`, "must be a non-empty string of at most 500 characters.");
  }
  if (Object.hasOwn(metadata, "allowed-tools") && typeof metadata["allowed-tools"] !== "string") {
    fail(`${location} allowed-tools`, "must be a space-separated string.");
  }
  if (Object.hasOwn(metadata, "metadata")) {
    if (!is_object(metadata.metadata)) {
      fail(`${location} metadata`, "must be a mapping of string keys to string values.");
    }
    else {
      for (const [key, value] of Object.entries(metadata.metadata)) {
        if (typeof value !== "string") fail(`${location} metadata.${key}`, "must be a string.");
      }
    }
  }
  if (!match[2].trim()) fail(location, "must include Markdown instructions after the frontmatter.");
}

async function validate_cwd(value, root_real, location, fail) {
  if (typeof value !== "string") {
    fail(location, "must be a string.");
    return;
  }
  if (value.startsWith("./")) {
    await validate_plugin_relative_path(value, root_real, location, fail);
    return;
  }

  for (const variable of ["${PLUGIN_ROOT}", "${PLUGIN_DATA}"]) {
    if (value === variable || value.startsWith(`${variable}/`)) {
      const relative = value.slice(variable.length).replace(/^\//, "");
      if (path.posix.normalize(relative).startsWith("..")) fail(location, "must remain within the selected plugin directory.");
      return;
    }
  }
  fail(location, "must begin with ./, ${PLUGIN_ROOT}, or ${PLUGIN_DATA}.");
}

async function validate_plugin_relative_path(value, root_real, location, fail) {
  const resolved = path.resolve(root_real, value);
  if (!is_within(root_real, resolved)) {
    fail(location, "must resolve within the plugin root.");
    return;
  }
  try {
    const real = await fs.realpath(resolved);
    if (!is_within(root_real, real)) fail(location, "must not resolve through a symlink outside the plugin root.");
  }
  catch (error) {
    if (error.code !== "ENOENT") fail(location, error.message);
  }
}

async function read_contained_json(file, root_real, location, fail) {
  try {
    const real = await fs.realpath(file);
    const stat = await fs.stat(file);
    if (!stat.isFile()) {
      fail(location, "must resolve to a regular file.");
      return null;
    }
    if (!is_within(root_real, real)) {
      fail(location, "resolves outside the plugin root.");
      return null;
    }
    return JSON.parse(await fs.readFile(file, "utf8"));
  }
  catch (error) {
    fail(location, error.message);
    return null;
  }
}

async function realpath_or_fail(file, location, fail) {
  try {
    return await fs.realpath(file);
  }
  catch (error) {
    fail(location, error.message);
    return null;
  }
}

function reject_unknown_fields(value, allowed, location, fail) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${location}.${key}`, "is not defined by Agent Plugins 1.0.0.");
  }
}

function is_object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function is_reverse_domain_namespace(value) {
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value);
}

function is_within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function is_loopback_host(hostname) {
  const normalized = hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  if (normalized === "localhost") return true;
  const ip_version = net.isIP(normalized);
  if (ip_version === 4) return normalized.startsWith("127.");
  if (ip_version === 6) return normalized === "::1" || normalized.toLowerCase().startsWith("::ffff:127.");
  return false;
}

async function run_cli() {
  const plugin_root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_PLUGIN_ROOT;
  const failures = await validate_agent_plugin(plugin_root);
  if (failures.length) {
    console.error("Agent Plugin validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Agent Plugin validation passed for \`${path.relative(process.cwd(), plugin_root) || "."}\`.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run_cli();
