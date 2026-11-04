import { promises as fs } from "node:fs";
import path from "node:path";
import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { request_agent_json, post_agent_json, post_agent_read_json } from "./http.mjs";
import { is_plain_object, JsonRpcError, optional_string } from "./json-rpc.mjs";

const POSTS = {
  search_integrators: ["/agent/integrators/search", true],
  set_integrator: ["/agent/integrators/set", false],
  stage_integrator_source_file: ["/agent/integrators/sources/stage", false],
  inspect_integrator_source: ["/agent/integrators/sources/inspect", true],
  run_integrator: ["/agent/integrators/run", false],
  get_integrator_run: ["/agent/integrators/runs/get", true],
};

export async function call_integrator_tool(name, input) {
  if (!is_plain_object(input)) throw new JsonRpcError(-32602, `${name} requires an object.`);
  const { profile: profile_name, file_path, ...request } = input;
  if (["stage_integrator_source_file", "run_integrator"].includes(name) || (name === "set_integrator" && request.dry_run === false)) {
    if (request.approved !== true) throw new JsonRpcError(-32602, `${name} requires approved=true after explicit user approval.`);
  }
  if (["get_integrator", "run_integrator"].includes(name) && !request.integrator_id) throw new JsonRpcError(-32602, "integrator_id is required.");
  if ((name === "run_integrator" || (name === "set_integrator" && request.integrator_id)) && !request.expected_conflict_token) throw new JsonRpcError(-32602, "Read get_integrator and supply expected_conflict_token.");
  let bytes;
  if (name === "stage_integrator_source_file" && file_path) {
    bytes = await fs.readFile(file_path);
    if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new JsonRpcError(-32602, "Source files must be between 1 byte and 25 MiB.");
    request.file_name ||= path.basename(file_path);
    if (request.file_name !== path.basename(file_path)) throw new JsonRpcError(-32602, "file_name must match the local file basename.");
  }
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  if (name === "get_integrator") return await request_agent_json(profile, `/agent/integrators/${encodeURIComponent(request.integrator_id)}`);
  if (name === "get_integrator_match_schema") {
    if (!request.feature_code) throw new JsonRpcError(-32602, "feature_code is required.");
    return await request_agent_json(profile, `/agent/integrators/schema/${encodeURIComponent(request.feature_code)}`);
  }
  if (name === "get_integrator_connections" || name === "get_integrator_folders") {
    const query = new URLSearchParams();
    for (const key of ["limit", "cursor", "parent_folder_id"]) if (request[key] !== undefined) query.set(key, String(request[key]));
    return await request_agent_json(profile, `/agent/integrators/${name === "get_integrator_folders" ? "folders" : "connections"}?${query}`);
  }
  const entry = POSTS[name];
  if (!entry) throw new JsonRpcError(-32601, `Unknown integrator tool: ${name}`);
  const payload = await (entry[1] ? post_agent_read_json : post_agent_json)(profile, entry[0], request);
  if (!bytes) return payload;
  const item = payload?.items?.[0];
  if (!item?.upload_url || !item?.staged_file_id) throw new JsonRpcError(-32603, "Source stage response did not include upload_url and staged_file_id.");
  const upload_url = new URL(item.upload_url, profile.base_url);
  if (upload_url.origin !== new URL(profile.base_url).origin) throw new JsonRpcError(-32603, "Source upload URL must belong to the connected Realinsight server.");
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: "application/octet-stream" }), request.file_name);
  const response = await fetch(upload_url, { method: "POST", body: form, signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new JsonRpcError(-32603, `Source upload failed (${response.status}): ${await response.text()}`);
  Object.assign(item, await response.json());
  delete item.upload_url;
  return payload;
}

export async function run_integrator_command(positionals, options) {
  const commands = { folders: "get_integrator_folders", search: "search_integrators", get: "get_integrator", "match-schema": "get_integrator_match_schema", connections: "get_integrator_connections", set: "set_integrator", "stage-source": "stage_integrator_source_file", "inspect-source": "inspect_integrator_source", run: "run_integrator", status: "get_integrator_run" };
  const name = commands[positionals[0]];
  if (!name) throw new JsonRpcError(-32602, "integrators requires search, get, folders, match-schema, connections, set, stage-source, inspect-source, run, or status.");
  const request_file = option_value(options, "request-file", undefined);
  const request_json = option_value(options, "request-json", undefined);
  let request = request_file ? JSON.parse(await fs.readFile(request_file, "utf8")) : request_json ? JSON.parse(request_json) : {};
  if (!is_plain_object(request)) throw new JsonRpcError(-32602, "Integrator request must be an object.");
  request = { ...request, profile: option_value(options, "profile", undefined) };
  for (const field of ["integrator_id", "feature_code", "search_text", "parent_folder_id", "expected_conflict_token", "staged_file_id", "sheet_name", "delimiter", "mode", "run_id", "run_kind", "section", "scan_column", "file_path", "file_name", "cursor"]) {
    const value = option_value(options, field.replaceAll("_", "-"), undefined);
    if (value !== undefined) request[field] = value;
  }
  for (const field of ["limit", "header_row", "first_data_row"]) {
    const value = option_value(options, field.replaceAll("_", "-"), undefined);
    if (value !== undefined) request[field] = Number(value);
  }
  if (name === "get_integrator") request.integrator_id ||= positionals[1];
  if (name === "get_integrator_match_schema") request.feature_code ||= positionals[1];
  if (name === "get_integrator_run") request.run_id ||= positionals[1];
  if (name === "stage_integrator_source_file") request.file_path ||= positionals[1];
  if (options["approved"] !== undefined) request.approved = option_bool(options, "approved", false);
  if (options["dry-run"] !== undefined) request.dry_run = option_bool(options, "dry-run", true);
  console.log(JSON.stringify(await call_integrator_tool(name, request), null, 2));
}
