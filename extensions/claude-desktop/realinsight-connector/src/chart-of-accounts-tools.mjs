import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_json, post_agent_read_json } from "./http.mjs";
import {
  is_plain_object,
  JsonRpcError,
  optional_boolean,
  optional_integer,
  optional_string,
  optional_string_array,
} from "./json-rpc.mjs";

const CHART_OF_ACCOUNTS_GET_FIELDS = [
  "coa_id",
  "coa_ids",
  "chart_code",
  "chart_name",
  "search_text",
  "item_ids",
  "account_numbers",
  "account_names",
  "item_types",
  "account_types",
  "sections",
  "include_accounts",
  "limit",
  "cursor",
];

const CHART_OF_ACCOUNTS_SET_FIELDS = [
  "coa_id",
  "chart",
  "operations",
  "expected_conflict_token",
  "dry_run",
  "change_reason",
  "reverses_operation_id",
  "correlation_id",
  "source_reference",
  "audit_detail",
];

export async function get_chart_of_accounts(positionals, options) {
  const payload = await agent_get_chart_of_accounts({
    profile: option_value(options, "profile", undefined),
    coa_id: option_value(options, "coa-id", option_value(options, "coa_id", positionals[0])),
    coa_ids: option_values(options, "coa-ids", option_values(options, "coa_ids", undefined)),
    chart_code: option_value(options, "chart-code", option_value(options, "chart_code", undefined)),
    chart_name: option_value(options, "chart-name", option_value(options, "chart_name", undefined)),
    search_text: option_value(options, "search-text", option_value(options, "search_text", undefined)),
    item_ids: option_values(options, "item-ids", option_values(options, "item_ids", undefined)),
    account_numbers: option_values(options, "account-numbers", option_values(options, "account_numbers", undefined)),
    account_names: option_values(options, "account-names", option_values(options, "account_names", undefined)),
    item_types: option_values(options, "item-types", option_values(options, "item_types", undefined)),
    account_types: option_values(options, "account-types", option_values(options, "account_types", undefined)),
    sections: option_value(options, "sections", undefined),
    include_accounts: option_bool_if_present(options, "include-accounts") ?? option_bool_if_present(options, "include_accounts"),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_payload(payload);
}

export async function get_coa_data(positionals, options) {
  const payload = await agent_get_coa_data({
    profile: option_value(options, "profile", undefined),
    coa_data_id: option_value(options, "coa-data-id", option_value(options, "coa_data_id", positionals[0])),
    projection: option_value(options, "projection", "values"),
    sources: option_values(options, "sources", undefined),
    item_ids: option_values(options, "item-ids", option_values(options, "item_ids", undefined)),
    years: option_values(options, "years", undefined)?.map(Number),
    periods: option_values(options, "periods", undefined)?.map(Number),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_payload(payload);
}

export async function set_chart_of_accounts(positionals, options) {
  const request = read_chart_of_accounts_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const dry_run = option_bool(options, "dry-run", option_bool(options, "dry_run", false));
  const payload = await agent_set_chart_of_accounts({
    profile: option_value(options, "profile", undefined),
    coa_id: option_value(options, "coa-id", option_value(options, "coa_id", positionals[0])),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    dry_run: dry_run || request.dry_run === true,
    approved: option_bool(options, "approved", false),
    confirm_update: option_bool(options, "confirm-update", option_bool(options, "confirm_update", false)),
    confirm_save: option_bool(options, "confirm-save", option_bool(options, "confirm_save", false)),
  });

  print_payload(payload);
}

export async function agent_get_chart_of_accounts(input) {
  const request = resolve_chart_of_accounts_get_request(input);
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/chart-of-accounts/get", request);
}

export async function agent_get_coa_data(input) {
  if (!is_plain_object(input)) throw new JsonRpcError(-32602, "get_coa_data requires an object.");
  const coa_data_id = optional_string(input, "coa_data_id");
  if (!coa_data_id) throw new JsonRpcError(-32602, "get_coa_data requires coa_data_id.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/chart-of-accounts/data/get", remove_undefined({
    coa_data_id,
    projection: optional_string(input, "projection") || "values",
    sources: optional_string_array(input, "sources"),
    item_ids: optional_string_array(input, "item_ids"),
    years: optional_integer_array(input, "years"),
    periods: optional_integer_array(input, "periods"),
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  }));
}

export async function agent_set_chart_of_accounts(input) {
  const request = resolve_chart_of_accounts_set_request(input);
  const approved = optional_boolean(input, "approved")
    || optional_boolean(input, "confirm_update")
    || optional_boolean(input, "confirm_save")
    || false;

  if (request.coa_id && !request.expected_conflict_token) {
    throw new JsonRpcError(-32602, "set_chart_of_accounts requires expected_conflict_token from get_chart_of_accounts when updating an existing chart.");
  }

  if (!request.dry_run && !approved) {
    throw new JsonRpcError(-32602, "set_chart_of_accounts requires approved=true after explicit user approval, unless dry_run=true.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, "/agent/chart-of-accounts/set", {
    ...request,
    approved: approved === true,
    confirm_update: optional_boolean(input, "confirm_update") === true,
    confirm_save: optional_boolean(input, "confirm_save") === true,
  });
}

function read_chart_of_accounts_request_from_options(options) {
  const request_json = option_value(options, "request-json", option_value(options, "request_json", undefined));

  if (!request_json) return {};

  return parse_json_object(request_json, "request_json");
}

function resolve_chart_of_accounts_get_request(input) {
  if (!is_plain_object(input)) return {};

  const request_json = optional_string(input, "request_json");
  if (request_json) return parse_json_object(request_json, "request_json");

  const request = {};

  for (const field of CHART_OF_ACCOUNTS_GET_FIELDS) {
    if (input[field] !== undefined) request[field] = input[field];
  }

  request.coa_ids = optional_string_array(request, "coa_ids");
  request.item_ids = optional_string_array(request, "item_ids");
  request.account_numbers = optional_string_array(request, "account_numbers");
  request.account_names = optional_string_array(request, "account_names");
  request.item_types = optional_string_array(request, "item_types");
  request.account_types = optional_string_array(request, "account_types");
  request.limit = optional_integer(request, "limit");
  request.include_accounts = optional_boolean(request, "include_accounts");

  return remove_undefined(request);
}

function optional_integer_array(input, name) {
  if (input[name] === undefined || input[name] === null) return undefined;
  if (!Array.isArray(input[name])) throw new JsonRpcError(-32602, `${name} must be an array of integers.`);
  const values = input[name].map(Number);
  if (values.some((value) => !Number.isInteger(value))) {
    throw new JsonRpcError(-32602, `${name} must be an array of integers.`);
  }
  return values;
}

function resolve_chart_of_accounts_set_request(input) {
  if (!is_plain_object(input)) return {};

  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) {
      throw new JsonRpcError(-32602, "request must be an object.");
    }

    return { ...input.request };
  }

  const request_json = optional_string(input, "request_json");
  if (request_json) return parse_json_object(request_json, "request_json");

  const request = {};

  for (const field of CHART_OF_ACCOUNTS_SET_FIELDS) {
    if (input[field] !== undefined) request[field] = input[field];
  }

  return remove_undefined(request);
}

function option_values(options, name, fallback) {
  const raw = option_value(options, name, undefined);
  if (!raw) return fallback;

  return compact_values(String(raw).split(","));
}

function compact_values(values) {
  const compacted = [];
  const seen = new Set();

  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;

    seen.add(text);
    compacted.push(text);
  }

  return compacted;
}

function parse_json_object(value, name) {
  if (!value) return undefined;

  let parsed;

  try {
    parsed = JSON.parse(value);
  }
  catch (error) {
    throw new JsonRpcError(-32602, `${name} must be valid JSON: ${error.message}`);
  }

  if (!is_plain_object(parsed)) {
    throw new JsonRpcError(-32602, `${name} must be a JSON object.`);
  }

  return parsed;
}

function remove_undefined(value) {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) delete value[key];
  }

  return value;
}

function print_payload(payload) {
  console.log(JSON.stringify(payload, null, 2));
}
