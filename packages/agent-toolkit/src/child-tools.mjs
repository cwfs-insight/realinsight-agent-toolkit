import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_read_json } from "./http.mjs";
import {
  optional_integer,
  optional_string,
  optional_string_array,
  required_string,
  JsonRpcError,
} from "./json-rpc.mjs";

export async function get_children(positionals, options) {
  const payload = await agent_get_children({
    profile: option_value(options, "profile", undefined),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    parent_ids: option_values(options, "parent-ids", option_values(options, "parent_ids", positionals)),
    limit: option_value(options, "limit", undefined),
    skip: option_value(options, "skip", undefined),
    limit_per_parent: option_value(options, "limit-per-parent", option_value(options, "limit_per_parent", undefined)),
    mode: option_value(options, "mode", undefined),
    mode_field_name: option_value(options, "mode-field", option_value(options, "mode_field_name", undefined)),
    mode_schema_code: option_value(options, "mode-schema-code", option_value(options, "mode_schema_code", undefined)),
    filters: parse_filter_options(option_value(options, "filter", option_value(options, "filters", undefined))),
    sorts: parse_sort_options(option_value(options, "sort", option_value(options, "sorts", undefined))),
  });

  print_children_payload(payload, options);
}

export async function get_latest_children(positionals, options) {
  const payload = await agent_get_latest_children({
    profile: option_value(options, "profile", undefined),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    parent_ids: option_values(options, "parent-ids", option_values(options, "parent_ids", positionals)),
    mode: option_value(options, "mode", "recent"),
    mode_field_name: option_value(options, "mode-field", option_value(options, "mode_field_name", undefined)),
    mode_schema_code: option_value(options, "mode-schema-code", option_value(options, "mode_schema_code", undefined)),
    filters: parse_filter_options(option_value(options, "filter", option_value(options, "filters", undefined))),
    sorts: parse_sort_options(option_value(options, "sort", option_value(options, "sorts", undefined))),
  });

  print_latest_children_payload(payload, options);
}

export async function agent_get_children(input) {
  const feature_code = required_string(input, "feature_code", "get_children requires feature_code.");
  const parent_ids = optional_string_array(input, "parent_ids")
    || optional_string_array(input, "parent_entity_ids")
    || [];

  if (parent_ids.length === 0) {
    throw new JsonRpcError(-32602, "get_children requires at least one parent_id.");
  }

  const filters = optional_object_array(input, "filters");
  const sorts = optional_object_array(input, "sorts");
  const mode = optional_string(input, "mode");

  if (mode && sorts.length > 0) {
    throw new JsonRpcError(-32602, "get_children accepts mode or sorts, not both.");
  }

  if (mode && !optional_string(input, "mode_field_name") && !optional_string(input, "mode_schema_code")) {
    throw new JsonRpcError(-32602, "get_children mode requires mode_field_name or mode_schema_code.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/entities/children", {
    feature_code,
    parent_ids,
    limit: optional_integer(input, "limit"),
    skip: optional_integer(input, "skip"),
    limit_per_parent: optional_integer(input, "limit_per_parent"),
    mode,
    mode_field_name: optional_string(input, "mode_field_name"),
    mode_schema_code: optional_string(input, "mode_schema_code"),
    filters,
    sorts,
  });
}

export async function agent_get_latest_children(input) {
  const feature_code = required_string(input, "feature_code", "get_latest_children requires feature_code.");
  const parent_ids = optional_string_array(input, "parent_ids")
    || optional_string_array(input, "parent_entity_ids")
    || [];

  if (parent_ids.length === 0) {
    throw new JsonRpcError(-32602, "get_latest_children requires at least one parent_id.");
  }

  const filters = optional_object_array(input, "filters");
  const sorts = optional_object_array(input, "sorts");
  const requested_mode = optional_string(input, "mode");
  const mode = requested_mode || (sorts.length === 0 ? "recent" : undefined);

  if (mode && sorts.length > 0) {
    throw new JsonRpcError(-32602, "get_latest_children accepts mode or sorts, not both.");
  }

  if (sorts.length === 0 && !optional_string(input, "mode_field_name") && !optional_string(input, "mode_schema_code")) {
    throw new JsonRpcError(-32602, "get_latest_children requires mode_field_name, mode_schema_code, or a descending sort.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/entities/children/latest", {
    feature_code,
    parent_ids,
    mode,
    mode_field_name: optional_string(input, "mode_field_name"),
    mode_schema_code: optional_string(input, "mode_schema_code"),
    filters,
    sorts,
  });
}

function print_children_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_children_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_latest_children_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No parent results returned.");
    return;
  }

  console.log("parent_id\tfound\tchild_entity_id\tchild_feature_code\tmaster_id\tsort_field");

  for (const item of items) {
    console.log([
      item.parent_id || "",
      item.found ? "true" : "false",
      item.child_entity_id || "",
      item.child_feature_code || "",
      item.master_id || "",
      item.sort_schema_code || item.sort_field_name || "",
    ].join("\t"));
  }

  const details = [];

  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function print_children_table(payload) {
  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No children found.");
    return;
  }

  console.log("entity_id\tfeature_code\tparent_id\tmaster_id");

  for (const item of items) {
    console.log([
      item.entity_id || "",
      item.feature_code || "",
      item.parent_id || "",
      item.master_id || "",
    ].join("\t"));
  }

  const details = [];

  if (payload.is_truncated) details.push("truncated=true");
  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function parse_filter_options(raw) {
  if (!raw) return undefined;

  return compact_values(String(raw).split(",")).map((item) => {
    const parts = item.split("|").map((part) => part.trim());

    if (parts.length < 2 || !parts[0]) {
      throw new JsonRpcError(-32602, "Child filters use Field|Value|Operator|AND_OR. Example: --filter 'Status|Active|eq'");
    }

    return {
      field_name: parts[0],
      value: parts[1],
      op: parts[2] || "eq",
      and_or: parts[3] || "and",
    };
  });
}

function parse_sort_options(raw) {
  if (!raw) return undefined;

  return compact_values(String(raw).split(",")).map((item) => {
    const parts = item.split("|").map((part) => part.trim());

    if (!parts[0]) {
      throw new JsonRpcError(-32602, "Child sorts use Field|Direction. Example: --sort 'PaymentDate|desc'");
    }

    return {
      field_name: parts[0],
      direction: parts[1] || "ascending",
    };
  });
}

function optional_object_array(input, name) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];

  const value = input[name];
  if (value === undefined || value === null || value === "") return [];

  const values = Array.isArray(value) ? value : [value];

  for (const item of values) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new JsonRpcError(-32602, `${name} must be an object or array of objects.`);
    }
  }

  return values;
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
