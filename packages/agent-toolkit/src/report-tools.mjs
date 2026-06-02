import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { request_agent_json } from "./http.mjs";
import {
  optional_boolean,
  optional_integer,
  optional_string,
  required_string,
} from "./json-rpc.mjs";

export async function list_dashboard_pages(positionals, options) {
  const payload = await agent_list_dashboard_pages({
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_dashboard_pages_payload(payload, options);
}

export async function get_dashboard_page(positionals, options) {
  const payload = await agent_get_dashboard_page({
    page_id: option_value(options, "page-id", option_value(options, "page_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
  });

  print_dashboard_page_payload(payload, options);
}

export async function get_analytic_data(positionals, options) {
  const payload = await agent_get_analytic_data({
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    all: option_bool_if_present(options, "all"),
    include_rows: option_bool_alias(options, "rows", "include-rows"),
    include_columns: option_bool_alias(options, "columns", "include-columns"),
    include_analytic_json: option_bool_alias(options, "analytic-json", "include-analytic-json"),
  });

  print_report_data_payload(payload, options);
}

export async function get_analytic_csv(positionals, options) {
  const payload = await agent_get_analytic_csv({
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    all: option_bool_if_present(options, "all"),
  });

  print_report_csv_payload(payload, options);
}

export async function extract_analytic_entities(positionals, options) {
  const payload = await agent_extract_analytic_entities({
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    all: option_bool_if_present(options, "all"),
  });

  print_report_entity_refs_payload(payload, options);
}

export async function list_workbenches(positionals, options) {
  const payload = await agent_list_workbenches({
    profile: option_value(options, "profile", undefined),
    workbench_code: option_value(options, "workbench-code", option_value(options, "workbench_code", undefined)),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_workbenches_payload(payload, options);
}

export async function get_workbench_data(positionals, options) {
  const payload = await agent_get_workbench_data({
    workbench_id: option_value(options, "workbench-id", option_value(options, "workbench_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    all: option_bool_if_present(options, "all"),
    include_rows: option_bool_alias(options, "rows", "include-rows"),
    include_columns: option_bool_alias(options, "columns", "include-columns"),
  });

  print_report_data_payload(payload, options);
}

export async function get_workbench_csv(positionals, options) {
  const payload = await agent_get_workbench_csv({
    workbench_id: option_value(options, "workbench-id", option_value(options, "workbench_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    all: option_bool_if_present(options, "all"),
  });

  print_report_csv_payload(payload, options);
}

export async function extract_workbench_entities(positionals, options) {
  const payload = await agent_extract_workbench_entities({
    workbench_id: option_value(options, "workbench-id", option_value(options, "workbench_id", positionals[0])),
    profile: option_value(options, "profile", undefined),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
    all: option_bool_if_present(options, "all"),
  });

  print_report_entity_refs_payload(payload, options);
}

export async function agent_list_dashboard_pages(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/dashboards/pages", {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  });
}

export async function agent_get_dashboard_page(input) {
  const page_id = required_string(input, "page_id", "Dashboard page id is required. Example: ri-agent get-dashboard-page PAGE_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/dashboards/pages/${encodeURIComponent(page_id)}`, {});
}

export async function agent_get_analytic_data(input) {
  const report_id = required_string(input, "report_id", "Analytic report id is required. Example: ri-agent get-analytic-data REPORT_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/analytics/${encodeURIComponent(report_id)}/data`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    all: optional_boolean(input, "all"),
    include_rows: optional_boolean(input, "include_rows"),
    include_columns: optional_boolean(input, "include_columns"),
    include_analytic_json: optional_boolean(input, "include_analytic_json"),
  });
}

export async function agent_get_analytic_csv(input) {
  const report_id = required_string(input, "report_id", "Analytic report id is required. Example: ri-agent get-analytic-csv REPORT_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/analytics/${encodeURIComponent(report_id)}/csv`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    all: optional_boolean(input, "all"),
  });
}

export async function agent_extract_analytic_entities(input) {
  const report_id = required_string(input, "report_id", "Analytic report id is required. Example: ri-agent extract-analytic-entities REPORT_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/analytics/${encodeURIComponent(report_id)}/entities`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    all: optional_boolean(input, "all"),
  });
}

export async function agent_list_workbenches(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/workbenches", {
    workbench_code: optional_string(input, "workbench_code"),
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  });
}

export async function agent_get_workbench_data(input) {
  const workbench_id = required_string(input, "workbench_id", "Workbench id is required. Example: ri-agent get-workbench-data WORKBENCH_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/workbenches/${encodeURIComponent(workbench_id)}/data`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    all: optional_boolean(input, "all"),
    include_rows: optional_boolean(input, "include_rows"),
    include_columns: optional_boolean(input, "include_columns"),
  });
}

export async function agent_get_workbench_csv(input) {
  const workbench_id = required_string(input, "workbench_id", "Workbench id is required. Example: ri-agent get-workbench-csv WORKBENCH_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/workbenches/${encodeURIComponent(workbench_id)}/csv`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    all: optional_boolean(input, "all"),
  });
}

export async function agent_extract_workbench_entities(input) {
  const workbench_id = required_string(input, "workbench_id", "Workbench id is required. Example: ri-agent extract-workbench-entities WORKBENCH_ID");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/workbenches/${encodeURIComponent(workbench_id)}/entities`, {
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
    all: optional_boolean(input, "all"),
  });
}

function print_dashboard_pages_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("page_id\ttitle\tanalytics\tfilters\tpage_type");
  for (const item of payload.items || []) {
    console.log([
      item.page_id || "",
      item.title || "",
      item.analytic_count ?? "",
      item.filter_count ?? "",
      item.page_type || "",
    ].join("\t"));
  }

  print_payload_footer(payload);
}

function print_dashboard_page_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const page = payload.items?.[0];
  if (!page) {
    console.log("No dashboard page returned.");
    return;
  }

  console.log(`page_id\t${page.page_id || ""}`);
  console.log(`title\t${page.title || ""}`);
  console.log("");
  console.log("analytic_report_id\tname\tbase_report_id\tbase_report_name\tcache_status\trows");

  for (const analytic of page.analytics || []) {
    console.log([
      analytic.analytic_report_id || "",
      analytic.analytic_report_name || "",
      analytic.base_report_id || "",
      analytic.base_report_name || "",
      analytic.cache_status || "",
      analytic.row_count ?? "",
    ].join("\t"));
  }

  print_payload_footer(payload);
}

function print_workbenches_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log("workbench_id\tworkbench_code\titem_name\tlist_report_name\tcache_status\trows");
  for (const item of payload.items || []) {
    console.log([
      item.workbench_id || "",
      item.workbench_code || "",
      item.workbench_item_name || "",
      item.list_report_name || "",
      item.cache_status || "",
      item.row_count ?? "",
    ].join("\t"));
  }

  print_payload_footer(payload);
}

function print_report_data_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const data = payload.items?.[0];
  if (!data) {
    console.log("No report data returned.");
    return;
  }

  const columns = data.columns || [];
  const visible_columns = columns.filter((column) => column.column_id);
  const rows = data.rows || [];

  if (rows.length === 0) {
    console.log(`cache_status\t${data.cache_status || ""}`);
    console.log(`total_rows\t${data.total_rows ?? 0}`);
    print_payload_footer(payload);
    return;
  }

  const headers = visible_columns.length > 0
    ? visible_columns.map((column) => column.label || column.schema_code || column.column_id)
    : Object.keys(rows[0]);
  const keys = visible_columns.length > 0
    ? visible_columns.map((column) => column.column_id)
    : headers;

  console.log(headers.join("\t"));
  for (const row of rows) {
    console.log(keys.map((key) => stringify_cell(row[key])).join("\t"));
  }

  print_payload_footer(payload);
}

function print_report_csv_payload(payload, options) {
  const item = payload.items?.[0];

  if (option_bool(options, "raw", false)) {
    if (item?.csv) process.stdout.write(item.csv);
    return;
  }

  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!item) {
    console.log("No CSV data returned.");
    return;
  }

  console.log("source_type\treport_id\trows\ttotal_rows\ttruncated\tnext_cursor");
  console.log([
    item.source_type || "",
    item.report_id || item.workbench_id || "",
    item.row_count ?? "",
    item.total_rows ?? "",
    item.is_truncated ? "true" : "false",
    item.next_cursor || "",
  ].join("\t"));

  print_payload_footer(payload);
}

function print_report_entity_refs_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const data = payload.items?.[0];
  const refs = data?.entities || [];

  if (refs.length === 0) {
    console.log("No entity refs found.");
    print_payload_footer(payload);
    return;
  }

  console.log("row_index\tentity_id\tfeature_code\tsource\tlabel\tdisplay_value");

  for (const ref of refs) {
    console.log([
      ref.row_index ?? "",
      ref.entity_id || "",
      ref.feature_code || "",
      ref.source || "",
      ref.label || ref.schema_code || "",
      stringify_cell(ref.display_value),
    ].join("\t"));
  }

  print_payload_footer(payload);
}

function print_payload_footer(payload) {
  const details = [];

  if (payload.is_truncated) details.push("truncated=true");
  if (payload.next_cursor) details.push(`next_cursor=${payload.next_cursor}`);
  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function stringify_cell(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function option_bool_alias(options, primary, alias) {
  if (options[primary] !== undefined) return option_bool_if_present(options, primary);
  if (options[alias] !== undefined) return option_bool_if_present(options, alias);

  return undefined;
}
