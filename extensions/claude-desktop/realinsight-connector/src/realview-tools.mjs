import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_json, post_agent_read_json } from "./http.mjs";
import { is_plain_object, JsonRpcError, optional_boolean, optional_string, optional_string_array } from "./json-rpc.mjs";

export async function get_realviews(positionals, options) {
  print_payload(await agent_get_realviews({
    profile: option_value(options, "profile", undefined),
    realview_id: option_value(options, "realview-id", option_value(options, "realview_id", positionals[0])),
    root_feature_code: option_value(options, "root-feature-code", option_value(options, "root_feature_code", undefined)),
    search_text: option_value(options, "search-text", option_value(options, "search_text", undefined)),
    include_inactive: option_bool(options, "include-inactive", option_bool(options, "include_inactive", false)),
  }));
}

export async function execute_realview(positionals, options) {
  const option_entity_ids = option_value(options, "entity-ids", option_value(options, "entity_ids", undefined));
  print_payload(await agent_execute_realview({
    profile: option_value(options, "profile", undefined),
    realview_id: option_value(options, "realview-id", option_value(options, "realview_id", positionals[0])),
    entity_ids: option_entity_ids ? option_entity_ids.split(",") : positionals.slice(1),
  }));
}

export async function set_realview(positionals, options) {
  const request = request_from_options(options);
  print_payload(await agent_set_realview({
    profile: option_value(options, "profile", undefined),
    realview_id: option_value(options, "realview-id", option_value(options, "realview_id", positionals[0])),
    ...request,
    expected_conflict_token: option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", request.expected_conflict_token)),
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    dry_run: option_bool(options, "dry-run", option_bool(options, "dry_run", request.dry_run === true)),
    approved: option_bool(options, "approved", false),
  }));
}

export async function agent_get_realviews(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_read_json(profile, "/agent/realviews/get", pick(input, ["realview_id", "root_feature_code", "search_text", "include_inactive"]));
}

export async function agent_execute_realview(input) {
  if (!is_plain_object(input)) throw new JsonRpcError(-32602, "execute_realview requires an object.");
  const realview_id = optional_string(input, "realview_id");
  if (!realview_id) throw new JsonRpcError(-32602, "execute_realview requires realview_id.");
  const entity_ids = optional_string_array(input, "entity_ids") || [];
  if (entity_ids.length === 0) throw new JsonRpcError(-32602, "execute_realview requires at least one entity id.");
  if (entity_ids.length > 100) throw new JsonRpcError(-32602, "execute_realview accepts at most 100 entity ids.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_read_json(profile, "/agent/realviews/execute", { realview_id, entity_ids });
}

export async function agent_set_realview(input) {
  const request = resolve_request(input);
  if (!request.realview || !is_plain_object(request.realview)) throw new JsonRpcError(-32602, "set_realview requires realview.");
  if (request.realview_id && !request.expected_conflict_token) throw new JsonRpcError(-32602, "set_realview requires expected_conflict_token from get_realviews when replacing an existing RealVIEW.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_save") || false;
  if (!request.dry_run && !approved) throw new JsonRpcError(-32602, "set_realview requires approved=true after explicit user approval, unless dry_run=true.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_json(profile, "/agent/realviews/set", { ...request, approved: approved === true });
}

function resolve_request(input) {
  if (!is_plain_object(input)) throw new JsonRpcError(-32602, "set_realview requires an object.");
  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) throw new JsonRpcError(-32602, "request must be an object.");
    return { ...input.request };
  }
  const request_json = optional_string(input, "request_json");
  if (request_json) return parse_json_object(request_json, "request_json");
  return pick(input, ["realview_id", "realview", "expected_conflict_token", "change_reason", "reverses_operation_id", "correlation_id", "source_reference", "audit_detail", "dry_run"]);
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
