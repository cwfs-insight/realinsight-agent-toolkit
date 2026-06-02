import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { request_agent_json } from "./http.mjs";
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

function print_entity_search_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_entity_search_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
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
