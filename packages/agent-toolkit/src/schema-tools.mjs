import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { request_agent_json } from "./http.mjs";
import {
  optional_boolean,
  optional_integer,
  optional_string,
  required_string,
} from "./json-rpc.mjs";

export async function search_features(positionals, options) {
  const payload = await agent_search_features({
    query: option_value(options, "q", positionals.join(" ").trim()),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    type: option_value(options, "type", undefined),
    include_virtuals: option_bool_if_present(options, "include-virtuals"),
  });

  print_payload(payload, options, print_feature_table);
}

export async function agent_search_features(input) {
  const query = required_string(input, "query", "Feature search query is required. Example: ri-agent search-features loan");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/schema/features/search", {
    q: query,
    limit: optional_integer(input, "limit"),
    type: optional_string(input, "type"),
    include_virtuals: optional_boolean(input, "include_virtuals"),
  });
}

export async function search_fields(positionals, options) {
  const payload = await agent_search_fields({
    query: option_value(options, "q", positionals.join(" ").trim()),
    profile: option_value(options, "profile", undefined),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    limit: option_value(options, "limit", undefined),
    include_computed: option_bool_if_present(options, "include-computed"),
    include_read_only: option_bool_if_present(options, "include-read-only"),
    include_sensitive: option_bool_if_present(options, "include-sensitive"),
    postable_only: option_bool_if_present(options, "postable-only"),
  });

  print_payload(payload, options, print_field_table);
}

export async function agent_search_fields(input) {
  const query = required_string(input, "query", "Field search query is required. Example: ri-agent search-fields balance --feature-code Loan");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/schema/fields/search", {
    q: query,
    feature_code: optional_string(input, "feature_code"),
    limit: optional_integer(input, "limit"),
    include_computed: optional_boolean(input, "include_computed"),
    include_read_only: optional_boolean(input, "include_read_only"),
    include_sensitive: optional_boolean(input, "include_sensitive"),
    postable_only: optional_boolean(input, "postable_only"),
  });
}

export async function get_fields(positionals, options) {
  const payload = await agent_get_fields({
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    include_excluded: option_bool_if_present(options, "include-excluded"),
    include_computed: option_bool_if_present(options, "include-computed"),
    include_read_only: option_bool_if_present(options, "include-read-only"),
    include_sensitive: option_bool_if_present(options, "include-sensitive"),
    postable_only: option_bool_if_present(options, "postable-only"),
  });

  print_payload(payload, options, print_field_table);
}

export async function agent_get_fields(input) {
  const feature_code = required_string(input, "feature_code", "Feature code is required. Example: ri-agent get-fields Loan");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/schema/features/${encodeURIComponent(feature_code)}/fields`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    include_excluded: optional_boolean(input, "include_excluded"),
    include_computed: optional_boolean(input, "include_computed"),
    include_read_only: optional_boolean(input, "include_read_only"),
    include_sensitive: optional_boolean(input, "include_sensitive"),
    postable_only: optional_boolean(input, "postable_only"),
  });
}

function print_payload(payload, options, table_printer) {
  if (option_bool(options, "table", false)) {
    table_printer(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_feature_table(payload) {
  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No features found.");
    return;
  }

  console.log("feature_code\ttype\ttype_name\tmaster_feature_code\tparent_feature_code");

  for (const item of items) {
    console.log([
      item.feature_code || "",
      item.type || "",
      item.type_name || "",
      item.master_feature_code || "",
      item.parent_feature_code || "",
    ].join("\t"));
  }

  print_result_footer(payload);
}

function print_field_table(payload) {
  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No fields found.");
    return;
  }

  console.log("schema_code\tfield_type\tdisplay\tpostable\tref_feature_code");

  for (const item of items) {
    console.log([
      item.schema_code || "",
      item.field_type || "",
      item.display || "",
      item.is_postable === undefined ? "" : String(item.is_postable),
      item.ref_feature_code || "",
    ].join("\t"));
  }

  print_result_footer(payload);
}

function print_result_footer(payload) {
  const details = [];

  if (payload.is_truncated) details.push("truncated=true");
  if (payload.next_cursor) details.push(`next_cursor=${payload.next_cursor}`);
  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}
