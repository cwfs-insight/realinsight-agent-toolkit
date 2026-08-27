import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { is_plain_object, JsonRpcError } from "./json-rpc.mjs";

export const MCP_SKILLS_EXTENSION = "io.modelcontextprotocol/skills";
export const REALINSIGHT_SKILL_NAME = "realinsight-agent-toolkit";
export const REALINSIGHT_SKILL_URI = `skill://${REALINSIGHT_SKILL_NAME}/SKILL.md`;

const MAX_RESOURCES_PER_SKILL = 512;
const MAX_TOTAL_SKILL_BYTES = 16 * 1024 * 1024;
const TOOLKIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILL_ROOT = path.join(TOOLKIT_ROOT, "skills", REALINSIGHT_SKILL_NAME);

let catalog_promise;

export async function list_mcp_skills(params) {
  reject_unsupported_cursor(params, "skills/list");
  const catalog = await load_catalog();

  return {
    resultType: "complete",
    skills: [build_skill_entry(catalog)],
  };
}

export async function get_mcp_skill(params) {
  const uri = optional_string(params, "uri");
  if (uri !== REALINSIGHT_SKILL_URI) {
    throw new JsonRpcError(-32602, `Unknown Realinsight MCP skill URI: ${uri || ""}`);
  }

  const catalog = await load_catalog();
  return {
    resultType: "complete",
    skill: build_skill_entry(catalog),
  };
}

export async function list_mcp_resources(params) {
  reject_unsupported_cursor(params, "resources/list");
  const catalog = await load_catalog();

  return {
    resources: [
      {
        uri: REALINSIGHT_SKILL_URI,
        name: REALINSIGHT_SKILL_NAME,
        title: "Realinsight Agent Toolkit",
        description: catalog.frontmatter.description,
        mimeType: "text/markdown",
      },
    ],
  };
}

export async function read_mcp_resource(params) {
  const uri = optional_string(params, "uri");
  const catalog = await load_catalog();
  const file = catalog.files_by_uri.get(uri);

  if (!file) {
    throw new JsonRpcError(-32602, `Unknown Realinsight MCP resource URI: ${uri || ""}`);
  }

  const content = {
    uri: file.uri,
    mimeType: file.mime_type,
  };

  if (file.is_text) {
    content.text = new TextDecoder("utf-8", { fatal: true }).decode(file.content);
  }
  else {
    content.blob = file.content.toString("base64");
  }

  return { contents: [content] };
}

function load_catalog() {
  catalog_promise ??= build_catalog();
  return catalog_promise;
}

async function build_catalog() {
  const relative_paths = await list_skill_files(SKILL_ROOT);
  if (relative_paths.length === 0) {
    throw new Error("No public Realinsight MCP skill resources were packaged.");
  }
  if (relative_paths.length > MAX_RESOURCES_PER_SKILL) {
    throw new Error("The public Realinsight MCP skill exceeds the 512-resource SEP-2640 limit.");
  }

  const files_by_uri = new Map();
  let total_size = 0;

  for (const relative_path of relative_paths) {
    const content = await fs.readFile(path.join(SKILL_ROOT, ...relative_path.split("/")));
    total_size += content.byteLength;
    const uri = `skill://${REALINSIGHT_SKILL_NAME}/${encode_relative_uri_path(relative_path)}`;

    files_by_uri.set(uri, {
      uri,
      content,
      digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
      mime_type: get_mime_type(relative_path),
      is_text: is_text_file(relative_path),
    });
  }

  if (total_size > MAX_TOTAL_SKILL_BYTES) {
    throw new Error("The public Realinsight MCP skill exceeds the 16 MiB SEP-2640 limit.");
  }

  const skill_file = files_by_uri.get(REALINSIGHT_SKILL_URI);
  if (!skill_file) throw new Error("The public Realinsight MCP skill is missing SKILL.md.");

  const frontmatter = parse_scalar_frontmatter(
    new TextDecoder("utf-8", { fatal: true }).decode(skill_file.content),
  );
  if (frontmatter.name !== REALINSIGHT_SKILL_NAME) {
    throw new Error("The public Realinsight MCP skill name must match its skill URI.");
  }
  if (typeof frontmatter.description !== "string" || !frontmatter.description.trim()) {
    throw new Error("The public Realinsight MCP skill requires a description.");
  }

  return { files_by_uri, frontmatter };
}

async function list_skill_files(root) {
  const files = [];

  async function visit(current, prefix) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const relative_path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const entry_path = path.join(current, entry.name);

      if (entry.isSymbolicLink()) {
        throw new Error(`MCP skill resources cannot contain symbolic links: ${relative_path}`);
      }
      if (entry.isDirectory()) {
        await visit(entry_path, relative_path);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`MCP skill resources must be regular files: ${relative_path}`);
      }

      validate_relative_path(relative_path);
      files.push(relative_path);
    }
  }

  await visit(root, "");
  return files.sort((left, right) => left.localeCompare(right));
}

function build_skill_entry(catalog) {
  return {
    uri: REALINSIGHT_SKILL_URI,
    frontmatter: { ...catalog.frontmatter },
    resources: [...catalog.files_by_uri.values()]
      .sort((left, right) => left.uri.localeCompare(right.uri))
      .map((file) => ({
        uri: file.uri,
        digest: file.digest,
        size: file.content.byteLength,
      })),
  };
}

function parse_scalar_frontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== "---") {
    throw new Error("The public Realinsight MCP skill must begin with YAML frontmatter.");
  }

  const result = {};
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "---") return result;
    if (!line.trim()) continue;
    if (/^\s/.test(line)) {
      throw new Error("Nested YAML frontmatter requires an MCP skill catalog parser update.");
    }

    const separator = line.indexOf(":");
    if (separator <= 0) {
      throw new Error(`Invalid public Realinsight MCP skill frontmatter line: ${line}`);
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!key || !value) {
      throw new Error("MCP skill frontmatter fields must be non-empty scalar values.");
    }
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (Object.hasOwn(result, key)) {
      throw new Error(`Duplicate MCP skill frontmatter field: ${key}`);
    }

    result[key] = value;
  }

  throw new Error("The public Realinsight MCP skill frontmatter is not terminated.");
}

function reject_unsupported_cursor(params, method) {
  const cursor = optional_string(params, "cursor");
  if (cursor) throw new JsonRpcError(-32602, `${method} received an unknown cursor.`);
}

function optional_string(input, name) {
  if (!is_plain_object(input)) return undefined;
  const value = input[name];
  return typeof value === "string" ? value : undefined;
}

function validate_relative_path(relative_path) {
  const segments = relative_path.split("/").filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error(`Invalid MCP skill resource path: ${relative_path}`);
  }
}

function encode_relative_uri_path(relative_path) {
  return relative_path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function is_text_file(relative_path) {
  return new Set([
    ".md", ".txt", ".json", ".yaml", ".yml", ".py", ".ts", ".js", ".mjs",
    ".cs", ".html", ".css", ".csv", ".xml", ".sh", ".ps1",
  ]).has(path.extname(relative_path).toLowerCase());
}

function get_mime_type(relative_path) {
  const extension = path.extname(relative_path).toLowerCase();
  const mime_types = new Map([
    [".md", "text/markdown"],
    [".json", "application/json"],
    [".yaml", "application/yaml"],
    [".yml", "application/yaml"],
    [".py", "text/x-python"],
    [".ts", "text/typescript"],
    [".js", "text/javascript"],
    [".mjs", "text/javascript"],
    [".html", "text/html"],
    [".css", "text/css"],
    [".csv", "text/csv"],
    [".xml", "application/xml"],
  ]);

  return mime_types.get(extension) ?? (is_text_file(relative_path) ? "text/plain" : "application/octet-stream");
}
