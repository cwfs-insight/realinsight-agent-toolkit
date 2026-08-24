import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_json, post_agent_read_json } from "./http.mjs";
import { is_plain_object, JsonRpcError, optional_boolean, optional_string } from "./json-rpc.mjs";

export async function get_extended_data(positionals, options) {
  print_payload(await agent_get_extended_data({
    profile: option_value(options, "profile", undefined),
    configuration_id: option_value(options, "configuration-id", option_value(options, "configuration_id", positionals[0])),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    schema_code: option_value(options, "schema-code", option_value(options, "schema_code", undefined)),
    search_text: option_value(options, "search-text", option_value(options, "search_text", undefined)),
    kind: option_value(options, "kind", undefined),
    include_inactive: option_bool(options, "include-inactive", option_bool(options, "include_inactive", false)),
  }));
}

export async function set_extended_data(positionals, options) {
  const request = request_from_options(options);
  print_payload(await agent_set_extended_data({
    profile: option_value(options, "profile", undefined),
    configuration_id: option_value(options, "configuration-id", option_value(options, "configuration_id", positionals[0])),
    ...request,
    expected_conflict_token: option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", request.expected_conflict_token)),
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    dry_run: option_bool(options, "dry-run", option_bool(options, "dry_run", request.dry_run === true)),
    approved: option_bool(options, "approved", false),
  }));
}

export async function agent_get_extended_data(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_read_json(profile, "/agent/extended-data/get", pick(input, ["configuration_id", "feature_code", "schema_code", "search_text", "kind", "include_inactive"]));
}

export async function agent_set_extended_data(input) {
  const request = resolve_request(input);
  const operation = String(request.operation || "upsert").trim().toLowerCase();
  if (!["upsert", "deactivate"].includes(operation)) throw new JsonRpcError(-32602, "set_extended_data operation must be upsert or deactivate.");
  if (operation === "deactivate" && !request.configuration_id) throw new JsonRpcError(-32602, "set_extended_data deactivate requires configuration_id.");
  if (request.configuration_id && !request.expected_conflict_token) throw new JsonRpcError(-32602, "set_extended_data requires expected_conflict_token from get_extended_data when changing an existing configuration.");
  if (operation === "upsert" && (!request.field || !is_plain_object(request.field))) throw new JsonRpcError(-32602, "set_extended_data upsert requires field.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_save") || optional_boolean(input, "confirm_delete") || false;
  if (!request.dry_run && !approved) throw new JsonRpcError(-32602, "set_extended_data requires approved=true after explicit user approval, unless dry_run=true.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_json(profile, "/agent/extended-data/set", { ...request, operation, approved: approved === true });
}

function resolve_request(input) {
  if (!is_plain_object(input)) throw new JsonRpcError(-32602, "set_extended_data requires an object.");
  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) throw new JsonRpcError(-32602, "request must be an object.");
    return { ...input.request };
  }
  const request_json = optional_string(input, "request_json");
  if (request_json) return parse_json_object(request_json, "request_json");
  return pick(input, ["configuration_id", "operation", "field", "expected_conflict_token", "change_reason", "reverses_operation_id", "correlation_id", "source_reference", "audit_detail", "dry_run"]);
}

function request_from_options(options) {
  const value = option_value(options, "request-json", option_value(options, "request_json", undefined));
  return value ? parse_json_object(value, "request_json") : {};
}

function parse_json_object(value, name) {
  try {
    const parsed = JSON.parse(value);
    if (!is_plain_object(parsed)) throw new Error("must be an object");
    return parsed;
  }
  catch (error) {
    throw new JsonRpcError(-32602, `${name} must be valid object JSON: ${error.message}`);
  }
}

function pick(input, fields) {
  if (!is_plain_object(input)) return {};
  return remove_undefined(Object.fromEntries(fields.map((field) => [field, input[field]])));
}

function remove_undefined(value) {
  for (const key of Object.keys(value)) if (value[key] === undefined) delete value[key];
  return value;
}

function print_payload(payload) {
  console.log(JSON.stringify(payload, null, 2));
}
