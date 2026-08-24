import { promises as fs } from "node:fs";
import path from "node:path";

import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { delete_agent_json, post_agent_json, post_agent_read_json, request_agent_json } from "./http.mjs";
import {
  is_plain_object,
  JsonRpcError,
  optional_boolean,
  optional_integer,
  optional_string,
  required_string,
} from "./json-rpc.mjs";

const REPORT_SAVE_FIELDS = [
  "report_type",
  "parent_folder_id",
  "report_name",
  "report_description",
  "publish_to_users",
  "list",
  "composite",
  "expected_conflict_token",
  "change_reason",
  "reverses_operation_id",
  "correlation_id",
  "source_reference",
  "audit_detail",
];

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

export async function search_reports(positionals, options) {
  const payload = await agent_search_reports({
    profile: option_value(options, "profile", undefined),
    report_type: option_value(options, "report-type", option_value(options, "report_type", undefined)),
    parent_folder_id: option_value(options, "parent-folder-id", option_value(options, "parent_folder_id", undefined)),
    search_text: option_value(options, "search-text", option_value(options, "search_text", positionals[0])),
    include_inactive: option_bool_if_present(options, "include-inactive") ?? option_bool_if_present(options, "include_inactive"),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_report_configuration_payload(payload, options);
}

export async function search_report_folders(positionals, options) {
  const payload = await agent_search_report_folders({
    profile: option_value(options, "profile", undefined),
    parent_folder_id: option_value(options, "parent-folder-id", option_value(options, "parent_folder_id", positionals[0])),
    include_inactive: option_bool_if_present(options, "include-inactive") ?? option_bool_if_present(options, "include_inactive"),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_report_configuration_payload(payload, options);
}

export async function get_report(positionals, options) {
  const payload = await agent_get_report({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
  });

  print_report_configuration_payload(payload, options);
}

export async function validate_create_report(positionals, options) {
  const request = await read_report_request_from_options(options);
  const payload = await agent_validate_create_report({
    profile: option_value(options, "profile", undefined),
    ...request,
  });

  print_report_configuration_payload(payload, options);
}

export async function validate_update_report(positionals, options) {
  const request = await read_report_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_validate_update_report({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
  });

  print_report_configuration_payload(payload, options);
}

export async function validate_delete_report(positionals, options) {
  const payload = await agent_validate_delete_report({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    expected_conflict_token: option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined)),
  });

  print_report_configuration_payload(payload, options);
}

export async function create_report(positionals, options) {
  const request = await read_report_request_from_options(options);
  const payload = await agent_create_report({
    profile: option_value(options, "profile", undefined),
    ...request,
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    approved: option_bool(options, "approved", false),
    confirm_save: option_bool(options, "confirm-save", option_bool(options, "confirm_save", false)),
  });

  print_report_configuration_payload(payload, options);
}

export async function update_report(positionals, options) {
  const request = await read_report_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_update_report({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    approved: option_bool(options, "approved", false),
    confirm_update: option_bool(options, "confirm-update", option_bool(options, "confirm_update", false)),
    confirm_save: option_bool(options, "confirm-save", option_bool(options, "confirm_save", false)),
  });

  print_report_configuration_payload(payload, options);
}

export async function delete_report(positionals, options) {
  const payload = await agent_delete_report({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    expected_conflict_token: option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined)),
    change_reason: option_value(options, "change-reason", option_value(options, "change_reason", undefined)),
    reverses_operation_id: option_value(options, "reverses-operation-id", option_value(options, "reverses_operation_id", undefined)),
    correlation_id: option_value(options, "correlation-id", option_value(options, "correlation_id", undefined)),
    source_reference: option_value(options, "source-reference", option_value(options, "source_reference", undefined)),
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", undefined)),
    approved: option_bool(options, "approved", false),
    confirm_delete: option_bool(options, "confirm-delete", option_bool(options, "confirm_delete", false)),
  });

  print_report_configuration_payload(payload, options);
}

export async function import_report_into_composite(positionals, options) {
  const payload = await agent_import_report_into_composite({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    source_report_id: option_value(options, "source-report-id", option_value(options, "source_report_id", positionals[1])),
    insert_at: option_value(options, "insert-at", option_value(options, "insert_at", undefined)),
    report_header: option_value(options, "report-header", option_value(options, "report_header", undefined)),
    report_sheet: option_value(options, "report-sheet", option_value(options, "report_sheet", undefined)),
    expected_conflict_token: option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined)),
    change_reason: option_value(options, "change-reason", option_value(options, "change_reason", undefined)),
    reverses_operation_id: option_value(options, "reverses-operation-id", option_value(options, "reverses_operation_id", undefined)),
    correlation_id: option_value(options, "correlation-id", option_value(options, "correlation_id", undefined)),
    source_reference: option_value(options, "source-reference", option_value(options, "source_reference", undefined)),
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", undefined)),
    approved: option_bool(options, "approved", false),
    confirm_import: option_bool(options, "confirm-import", option_bool(options, "confirm_import", false)),
  });
  print_report_configuration_payload(payload, options);
}

export async function download_report_template(positionals, options) {
  const payload = await agent_download_report_template({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    output_path: option_value(options, "output-path", option_value(options, "output_path", undefined)),
  });
  print_report_configuration_payload(payload, options);
}

export async function stage_report_template_file(positionals, options) {
  const payload = await agent_stage_report_template_file({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    file_path: option_value(options, "file-path", option_value(options, "file_path", positionals[1])),
    file_name: option_value(options, "file-name", option_value(options, "file_name", undefined)),
    content_type: option_value(options, "content-type", option_value(options, "content_type", undefined)),
    approved: option_bool(options, "approved", false),
    confirm_upload: option_bool(options, "confirm-upload", option_bool(options, "confirm_upload", false)),
  });
  print_report_configuration_payload(payload, options);
}

export async function upload_report_template(positionals, options) {
  const payload = await agent_upload_report_template({
    profile: option_value(options, "profile", undefined),
    report_id: option_value(options, "report-id", option_value(options, "report_id", positionals[0])),
    file_path: option_value(options, "file-path", option_value(options, "file_path", positionals[1])),
    staged_file_id: option_value(options, "staged-file-id", option_value(options, "staged_file_id", undefined)),
    expected_conflict_token: option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined)),
    change_reason: option_value(options, "change-reason", option_value(options, "change_reason", undefined)),
    reverses_operation_id: option_value(options, "reverses-operation-id", option_value(options, "reverses_operation_id", undefined)),
    correlation_id: option_value(options, "correlation-id", option_value(options, "correlation_id", undefined)),
    source_reference: option_value(options, "source-reference", option_value(options, "source_reference", undefined)),
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", undefined)),
    approved: option_bool(options, "approved", false),
    confirm_update: option_bool(options, "confirm-update", option_bool(options, "confirm_update", false)),
  });
  print_report_configuration_payload(payload, options);
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

export async function agent_search_reports(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/reports/configurations/search", {
    report_type: optional_string(input, "report_type"),
    parent_folder_id: optional_string(input, "parent_folder_id"),
    search_text: optional_string(input, "search_text"),
    include_inactive: optional_boolean(input, "include_inactive"),
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  });
}

export async function agent_search_report_folders(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/reports/folders/search", {
    parent_folder_id: optional_string(input, "parent_folder_id"),
    include_inactive: optional_boolean(input, "include_inactive"),
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  });
}

export async function agent_get_report(input) {
  const report_id = required_string(input, "report_id", "get_report requires report_id.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}`, {});
}

export async function agent_validate_create_report(input) {
  const request = resolve_report_save_request(input);
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/reports/configurations/validate-create", request);
}

export async function agent_validate_update_report(input) {
  const report_id = required_string(input, "report_id", "validate_update_report requires report_id.");
  const request = resolve_report_save_request(input);

  if (!request.expected_conflict_token) {
    throw new JsonRpcError(-32602, "validate_update_report requires expected_conflict_token from get_report.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}/validate-update`, request);
}

export async function agent_validate_delete_report(input) {
  const report_id = required_string(input, "report_id", "validate_delete_report requires report_id.");
  const expected_conflict_token = required_string(input, "expected_conflict_token", "validate_delete_report requires expected_conflict_token from get_report.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}/validate-delete`, {
    expected_conflict_token,
  });
}

export async function agent_create_report(input) {
  const request = resolve_report_save_request(input);
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_save") || false;

  if (!approved) {
    throw new JsonRpcError(-32602, "create_report requires approved=true after explicit user approval.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, "/agent/reports/configurations", {
    ...request,
    approved: true,
    confirm_save: optional_boolean(input, "confirm_save") === true,
  });
}

export async function agent_update_report(input) {
  const report_id = required_string(input, "report_id", "update_report requires report_id.");
  const request = resolve_report_save_request(input);
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_save") || false;

  if (!request.expected_conflict_token) {
    throw new JsonRpcError(-32602, "update_report requires expected_conflict_token from get_report.");
  }

  if (!approved) {
    throw new JsonRpcError(-32602, "update_report requires approved=true after explicit user approval.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}`, {
    ...request,
    approved: true,
    confirm_update: optional_boolean(input, "confirm_update") === true,
    confirm_save: optional_boolean(input, "confirm_save") === true,
  });
}

export async function agent_delete_report(input) {
  const report_id = required_string(input, "report_id", "delete_report requires report_id.");
  const expected_conflict_token = required_string(input, "expected_conflict_token", "delete_report requires expected_conflict_token from get_report.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_delete") || false;

  if (!approved) {
    throw new JsonRpcError(-32602, "delete_report requires approved=true after explicit user approval.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await delete_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}`, {
    expected_conflict_token,
    change_reason: optional_string(input, "change_reason"),
    reverses_operation_id: optional_string(input, "reverses_operation_id"),
    correlation_id: optional_string(input, "correlation_id"),
    source_reference: optional_string(input, "source_reference"),
    audit_detail: optional_string(input, "audit_detail"),
    approved: true,
    confirm_delete: optional_boolean(input, "confirm_delete") === true,
  });
}

export async function agent_import_report_into_composite(input) {
  const report_id = required_string(input, "report_id", "import_report_into_composite requires the target composite report_id.");
  const source_report_id = required_string(input, "source_report_id", "import_report_into_composite requires source_report_id for an active LIST report.");
  const expected_conflict_token = required_string(input, "expected_conflict_token", "import_report_into_composite requires the target composite conflict_token from get_report.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_import") || false;
  if (!approved) throw new JsonRpcError(-32602, "import_report_into_composite requires approved=true after explicit user approval.");

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}/composite/import-list-report`, {
    source_report_id,
    insert_at: optional_integer(input, "insert_at"),
    report_header: optional_string(input, "report_header"),
    report_sheet: optional_string(input, "report_sheet"),
    expected_conflict_token,
    change_reason: optional_string(input, "change_reason"),
    reverses_operation_id: optional_string(input, "reverses_operation_id"),
    correlation_id: optional_string(input, "correlation_id"),
    source_reference: optional_string(input, "source_reference"),
    audit_detail: optional_string(input, "audit_detail"),
    approved: true,
  });
}

export async function agent_download_report_template(input) {
  const report_id = required_string(input, "report_id", "download_report_template requires report_id.");
  const output_path = optional_string(input, "output_path");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  const payload = await request_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}/template-file`, {});

  if (output_path) {
    const item = first_payload_item(payload);
    if (!item?.download_url) throw new JsonRpcError(-32603, "Report template download did not return download_url.");
    const resolved_path = path.resolve(output_path);
    await fs.mkdir(path.dirname(resolved_path), { recursive: true });
    await download_signed_file(profile, item.download_url, resolved_path);
    item.local_file_path = resolved_path;
  }

  return payload;
}

export async function agent_stage_report_template_file(input) {
  const report_id = required_string(input, "report_id", "stage_report_template_file requires report_id.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_upload") || false;
  if (!approved) throw new JsonRpcError(-32602, "stage_report_template_file requires approved=true after explicit user approval.");

  const request = resolve_report_template_stage_request(input);
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  const payload = await post_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}/template-file/stage`, {
    file_name: request.file_name,
    content_type: request.content_type,
    approved: true,
  }, { timeout_ms: 120000 });

  const file_path = optional_string(input, "file_path");
  if (!file_path) return payload;
  const item = first_payload_item(payload);
  if (!item?.upload_url || !item?.staged_file_id) throw new JsonRpcError(-32603, "stage_report_template_file did not return upload_url and staged_file_id.");
  await upload_file_to_signed_url(profile, item.upload_url, file_path, request.content_type);
  delete item.upload_url;
  return payload;
}

export async function agent_upload_report_template(input) {
  const report_id = required_string(input, "report_id", "upload_report_template requires report_id.");
  const expected_conflict_token = required_string(input, "expected_conflict_token", "upload_report_template requires expected_conflict_token from get_report.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_save") || false;
  if (!approved) throw new JsonRpcError(-32602, "upload_report_template requires approved=true after explicit user approval.");

  let staged_file_id = optional_string(input, "staged_file_id");
  const file_path = optional_string(input, "file_path");
  if (file_path) {
    const stage_payload = await agent_stage_report_template_file({
      profile: optional_string(input, "profile"),
      report_id,
      file_path,
      file_name: optional_string(input, "file_name"),
      content_type: optional_string(input, "content_type"),
      approved: true,
    });
    staged_file_id = first_payload_item(stage_payload)?.staged_file_id;
  }
  if (!staged_file_id) throw new JsonRpcError(-32602, "upload_report_template requires staged_file_id or file_path.");

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  return await post_agent_json(profile, `/agent/reports/configurations/${encodeURIComponent(report_id)}/template-file`, {
    staged_file_id,
    expected_conflict_token,
    change_reason: optional_string(input, "change_reason"),
    reverses_operation_id: optional_string(input, "reverses_operation_id"),
    correlation_id: optional_string(input, "correlation_id"),
    source_reference: optional_string(input, "source_reference"),
    audit_detail: optional_string(input, "audit_detail"),
    approved: true,
  }, { timeout_ms: 120000 });
}

function resolve_report_template_stage_request(input) {
  const file_path = optional_string(input, "file_path");
  let file_name = optional_string(input, "file_name");
  let content_type = optional_string(input, "content_type");
  if (file_path) {
    const resolved_path = path.resolve(file_path);
    file_name ||= path.basename(resolved_path);
    content_type ||= content_type_for_file_name(file_name);
  }
  if (!file_name) throw new JsonRpcError(-32602, "stage_report_template_file requires file_name or file_path.");
  return { file_name, content_type: content_type || content_type_for_file_name(file_name) };
}

function first_payload_item(payload) {
  return Array.isArray(payload?.items) ? payload.items[0] : undefined;
}

async function download_signed_file(profile, download_url, output_path) {
  const response = await fetch(new URL(download_url, profile.base_url));
  if (!response.ok) throw await transfer_error(response, "Report template download failed");
  await fs.writeFile(output_path, Buffer.from(await response.arrayBuffer()));
}

async function upload_file_to_signed_url(profile, upload_url, file_path, content_type) {
  const resolved_path = path.resolve(file_path);
  const file_name = path.basename(resolved_path);
  const bytes = await fs.readFile(resolved_path);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: content_type || content_type_for_file_name(file_name) }), file_name);
  const response = await fetch(new URL(upload_url, profile.base_url), { method: "POST", body: form });
  if (!response.ok) throw await transfer_error(response, "Report template upload failed");
  return await parse_transfer_response(response);
}

async function transfer_error(response, fallback) {
  const payload = await parse_transfer_response(response);
  const message = payload?.Message || payload?.message || payload?.error_description || payload?.error || response.statusText || fallback;
  return new JsonRpcError(-32603, `${fallback}: ${message}`);
}

async function parse_transfer_response(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch { return { text }; }
}

function content_type_for_file_name(file_name) {
  const lower = String(file_name || "").toLowerCase();
  if (lower.endsWith(".xlsm")) return "application/vnd.ms-excel.sheet.macroEnabled.12";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

async function read_report_request_from_options(options) {
  const request_file = option_value(options, "request-file", option_value(options, "request_file", undefined));
  const request_json = option_value(options, "request-json", option_value(options, "request_json", undefined));

  if (request_file) {
    const text = await fs.readFile(request_file, "utf8");

    return parse_json_object(text, "request_file");
  }

  if (request_json) {
    return parse_json_object(request_json, "request_json");
  }

  return {};
}

function resolve_report_save_request(input) {
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

  for (const field of REPORT_SAVE_FIELDS) {
    if (input[field] !== undefined) request[field] = input[field];
  }

  return request;
}

function parse_json_object(value, name) {
  if (!value) return {};

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

function print_report_configuration_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No report configuration results returned.");
    print_payload_footer(payload);
    return;
  }

  if (items.some((item) => item.can_apply !== undefined || item.errors !== undefined || item.normalized_preview !== undefined)) {
    console.log("can_apply\terrors\twarnings\treport_id\treport_name\tconflict_token");

    for (const item of items) {
      const preview = item.normalized_preview || {};
      console.log([
        item.can_apply ? "true" : "false",
        item.errors?.length ?? 0,
        item.warnings?.length ?? 0,
        preview.report_id || "",
        preview.report_name || "",
        preview.conflict_token || "",
      ].join("\t"));
    }

    print_payload_footer(payload);
    return;
  }

  if (items.some((item) => item.report !== undefined || item.audit_log !== undefined)) {
    console.log("report_id\treport_name\tactive\toperation_id\taudit_action");

    for (const item of items) {
      console.log([
        item.report?.report_id || "",
        item.report?.report_name || "",
        item.report?.active === false ? "false" : "true",
        item.audit_log?.operation_id || "",
        item.audit_log?.action || "",
      ].join("\t"));
    }

    print_payload_footer(payload);
    return;
  }

  console.log("report_id\treport_type\tactive\treport_name\tmaster_feature_code\tcolumns\tconflict_token");

  for (const item of items) {
    console.log([
      item.report_id || "",
      item.report_type || "",
      item.active === false ? "false" : "true",
      item.report_name || "",
      item.master_feature_code || item.list?.master_feature_code || "",
      item.column_count ?? item.list?.columns?.length ?? "",
      item.conflict_token || "",
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
