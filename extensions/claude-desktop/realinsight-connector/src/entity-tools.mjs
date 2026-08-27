import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_read_json, request_agent_json } from "./http.mjs";
import {
  optional_boolean,
  optional_integer,
  optional_string,
  optional_string_array,
  required_string,
  JsonRpcError,
} from "./json-rpc.mjs";

export async function search_entities(positionals, options) {
  const payload = await agent_search_entities({
    query: option_value(options, "q", positionals.join(" ").trim()),
    profile: option_value(options, "profile", undefined),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    field_name: option_value(options, "field-name", option_value(options, "field_name", undefined)),
    field_names: option_values(options, "field-names", option_values(options, "field_names", undefined)),
    schema_code: option_value(options, "schema-code", option_value(options, "schema_code", undefined)),
    schema_codes: option_values(options, "schema-codes", option_values(options, "schema_codes", undefined)),
    limit: option_value(options, "limit", undefined),
    exact: option_bool_if_present(options, "exact"),
  });

  print_entity_search_payload(payload, options);
}

export async function run_entity_query(positionals, options) {
  const payload = await agent_run_entity_query({
    profile: option_value(options, "profile", undefined),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", positionals[0])),
    parent_ids: option_values(options, "parent-ids", option_values(options, "parent_ids", undefined)),
    master_ids: option_values(options, "master-ids", option_values(options, "master_ids", undefined)),
    limit: option_value(options, "limit", undefined),
    skip: option_value(options, "skip", undefined),
    limit_per_master: option_value(options, "limit-per-master", option_value(options, "limit_per_master", undefined)),
    filters: parse_filter_options(option_value(options, "filter", option_value(options, "filters", undefined))),
    sorts: parse_sort_options(option_value(options, "sort", option_value(options, "sorts", undefined))),
  });

  print_entity_query_payload(payload, options);
}

export async function agent_search_entities(input) {
  const query = required_string(input, "query", "Entity search query is required. Example: ri-agent search-entities acme --schema-code CREMaster.PropertyName");
  const schema_code = optional_string(input, "schema_code");
  const schema_codes = compact_values([
    schema_code,
    ...(optional_string_array(input, "schema_codes") || []),
  ]);
  const feature_code = optional_string(input, "feature_code");
  const field_name = optional_string(input, "field_name");
  const field_names = compact_values([
    field_name,
    ...(optional_string_array(input, "field_names") || []),
  ]);

  if (schema_codes.length > 0 && field_names.length > 1) {
    throw new JsonRpcError(-32602, "search_entities accepts schema_codes or feature_code plus field_names; do not mix multiple field_names with schema_codes.");
  }

  if (field_names.length > 0 && !feature_code && schema_codes.length === 0) {
    throw new JsonRpcError(-32602, "search_entities requires feature_code when field_names are provided.");
  }

  if (optional_boolean(input, "exact") && schema_codes.length === 0 && field_names.length === 0) {
    throw new JsonRpcError(-32602, "search_entities exact matching requires schema_code or feature_code plus field_name.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/entities/search", {
    q: query,
    feature_code,
    field_name: field_names,
    schema_code: schema_codes,
    limit: optional_integer(input, "limit"),
    exact: optional_boolean(input, "exact"),
  });
}

export async function agent_run_entity_query(input) {
  const feature_code = required_string(input, "feature_code", "run_entity_query requires feature_code.");
  const parent_ids = optional_string_array(input, "parent_ids") || [];
  const master_ids = optional_string_array(input, "master_ids") || [];
  const filters = optional_object_array(input, "filters");
  const sorts = optional_object_array(input, "sorts");
  const limit = optional_integer(input, "limit");
  const skip = optional_integer(input, "skip");
  const limit_per_master = optional_integer(input, "limit_per_master");

  if (parent_ids.length > 0 && master_ids.length > 0) {
    throw new JsonRpcError(-32602, "run_entity_query accepts parent_ids or master_ids, not both.");
  }

  if (skip !== undefined && skip > 0 && sorts.length === 0) {
    throw new JsonRpcError(-32602, "run_entity_query paging with skip requires an explicit sort.");
  }

  if (limit_per_master !== undefined) {
    if (limit_per_master < 1) {
      throw new JsonRpcError(-32602, "run_entity_query limit_per_master must be at least 1.");
    }
    if (master_ids.length === 0) {
      throw new JsonRpcError(-32602, "run_entity_query limit_per_master requires master_ids.");
    }
    if (limit !== undefined || (skip !== undefined && skip > 0)) {
      throw new JsonRpcError(-32602, "run_entity_query limit_per_master cannot be combined with limit or skip.");
    }
    if (sorts.length === 0) {
      throw new JsonRpcError(-32602, "run_entity_query limit_per_master requires an explicit sort.");
    }
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/entities/query", {
    feature_code,
    parent_ids,
    master_ids,
    limit,
    skip,
    limit_per_master,
    filters,
    sorts,
  });
}

function print_entity_search_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_entity_search_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_entity_query_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No entities matched the query.");
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
  if (details.length > 0) console.log(`# ${details.join(" ")}`);
}

function print_entity_search_table(payload) {
  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No entities found.");
    return;
  }

  console.log("entity_id\tfeature_code\tschema_code\tmatched_value\tmaster_id\tparent_id");

  for (const item of items) {
    console.log([
      item.entity_id || "",
      item.feature_code || "",
      item.schema_code || "",
      item.matched_value || "",
      item.master_id || "",
      item.parent_id || "",
    ].join("\t"));
  }

  const details = [];

  if (payload.is_truncated) details.push("truncated=true");
  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function option_values(options, name, fallback) {
  const raw = option_value(options, name, undefined);
  if (!raw) return fallback;

  return compact_values(String(raw).split(","));
}

function parse_filter_options(raw) {
  if (!raw) return undefined;

  return compact_values(String(raw).split(",")).map((item) => {
    const parts = item.split("|").map((part) => part.trim());

    if (parts.length < 2 || !parts[0]) {
      throw new JsonRpcError(-32602, "Entity filters use Field|Value|Operator|AND_OR. Example: --filter 'Status|Active|eq'");
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
      throw new JsonRpcError(-32602, "Entity sorts use Field|Direction. Example: --sort 'Balance|desc'");
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
