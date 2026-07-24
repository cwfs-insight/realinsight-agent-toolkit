import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_json, post_agent_read_json } from "./http.mjs";
import {
  is_plain_object,
  optional_boolean,
  optional_string,
  optional_string_array,
  required_string,
  JsonRpcError,
} from "./json-rpc.mjs";

export async function get_records(positionals, options) {
  const payload = await agent_get_records({
    profile: option_value(options, "profile", undefined),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    entity_ids: option_values(options, "entity-ids", option_values(options, "entity_ids", positionals)),
    field_profile: option_value(options, "field-profile", option_value(options, "field_profile", undefined)),
    field_names: option_values(options, "field-names", option_values(options, "fields", undefined)),
    schema_codes: option_values(options, "schema-codes", option_values(options, "schema_codes", undefined)),
    accounts_projection: option_value(options, "accounts-projection", option_value(options, "accounts_projection", undefined)),
    as_of_date: option_value(options, "as-of-date", option_value(options, "as_of_date", undefined)),
    target_currency_id: option_value(options, "target-currency-id", option_value(options, "target_currency_id", undefined)),
  });

  print_records_payload(payload, options);
}

export async function set_record(positionals, options) {
  const record_json = option_value(options, "record-json", option_value(options, "record_json", option_value(options, "record", undefined)));
  const payload = await agent_set_record({
    profile: option_value(options, "profile", undefined),
    entity_id: option_value(options, "entity-id", option_value(options, "entity_id", positionals[0])),
    record: parse_json_object(record_json, "record_json"),
    update_fields: option_values(options, "update-fields", option_values(options, "update_fields", option_values(options, "fields", undefined))),
    approved: option_bool(options, "approved", false),
    confirm_update: option_bool(options, "confirm-update", option_bool(options, "confirm_update", false)),
  });

  print_set_record_payload(payload, options);
}

export async function agent_get_records(input) {
  const feature_code = required_string(input, "feature_code", "get_records requires feature_code.");
  const entity_ids = optional_string_array(input, "entity_ids") || [];
  const field_names = optional_string_array(input, "field_names");
  const schema_codes = optional_string_array(input, "schema_codes");
  const accounts_projection = optional_string(input, "accounts_projection");
  const field_profile = optional_string(input, "field_profile");

  if (entity_ids.length === 0) {
    throw new JsonRpcError(-32602, "get_records requires at least one entity_id.");
  }

  if (field_profile === "explicit_fields" && !field_names?.length && !schema_codes?.length) {
    throw new JsonRpcError(-32602, "get_records field_profile explicit_fields requires field_names or schema_codes.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/records/get", {
    feature_code,
    entity_ids,
    field_profile,
    field_names,
    schema_codes,
    accounts_projection,
    as_of_date: optional_string(input, "as_of_date"),
    target_currency_id: optional_string(input, "target_currency_id"),
  });
}

export async function agent_set_record(input) {
  const entity_id = required_string(input, "entity_id", "set_record requires entity_id.");
  const record = resolve_record_object(input);
  const update_fields = optional_string_array(input, "update_fields");
  const approved = optional_boolean(input, "approved") === true;
  const confirm_update = optional_boolean(input, "confirm_update") === true;

  if (!record || Object.keys(record).length === 0) {
    throw new JsonRpcError(-32602, "set_record requires record with at least one field value.");
  }

  if (!approved && !confirm_update) {
    throw new JsonRpcError(-32602, "set_record requires approved=true or confirm_update=true after explicit user approval.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, "/agent/records/set", {
    entity_id,
    record,
    update_fields,
    approved,
    confirm_update,
  });
}

function print_records_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_records_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_set_record_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_set_record_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_records_table(payload) {
  const items = payload.items || [];

  if (payload?.columns && payload?.items) {
    print_compact_records_table(payload, payload);
    return;
  }

  const table = items[0];

  if (table?.columns && table?.rows) {
    print_compact_records_table(payload, table);
    return;
  }

  if (items.length === 0) {
    console.log("No records found.");
    return;
  }

  console.log("entity_id\tfeature_code\tfield_name\tvalue");

  for (const item of items) {
    for (const value of item.values || []) {
      console.log([
        item.entity_id || "",
        item.feature_code || "",
        value.field_name || "",
        format_table_value(value.value),
      ].join("\t"));
    }
  }

  const details = [];

  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function print_compact_records_table(payload, table) {
  const columns = table.columns || [];
  const rows = table.rows || table.items || [];
  const field_names = columns
    .map((column) => column.field_name)
    .filter(Boolean);

  if (rows.length === 0) {
    console.log("No records found.");
    return;
  }

  console.log(["entity_id", "feature_code", ...field_names].join("\t"));

  for (const row of rows) {
    const display_values = row.display_values || {};
    const values = row.values || {};

    console.log([
      row.entity_id || "",
      row.feature_code || table.feature_code || "",
      ...field_names.map((field_name) => format_table_value(
        Object.prototype.hasOwnProperty.call(display_values, field_name)
          ? display_values[field_name]
          : values[field_name],
      )),
    ].join("\t"));
  }

  const details = [];

  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);
  details.push(`rows=${rows.length}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function print_set_record_table(payload) {
  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No record updated.");
    return;
  }

  console.log("entity_id\tfeature_code\tfield_name\tvalue");

  for (const item of items) {
    for (const value of item.values || []) {
      console.log([
        item.entity_id || "",
        item.feature_code || "",
        value.field_name || "",
        format_table_value(value.value),
      ].join("\t"));
    }
  }

  const details = [];

  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);

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

function resolve_record_object(input) {
  if (!is_plain_object(input)) return undefined;

  const record = input.record;
  if (record !== undefined) {
    if (!is_plain_object(record)) {
      throw new JsonRpcError(-32602, "record must be an object.");
    }

    return record;
  }

  const record_json = optional_string(input, "record_json");
  if (!record_json) return undefined;

  return parse_json_object(record_json, "record_json");
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

function format_table_value(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}
