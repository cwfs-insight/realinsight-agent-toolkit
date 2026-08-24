import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ACCESS_TOKEN = "riat_contract_test";
const REFRESH_TOKEN = "rirt_contract_test";
const NODE_BIN = process.env.NODE || "node";
const TOOLKIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CUSTOMER_CODE = "TEST";
const CUSTOMER_NAME = "Test Customer";
const CUSTOMER_ID = "customer-80";
const USER_ID = "contract-user";
const SCOPES = [
  "ri:profile.read",
  "ri:customer.list",
  "ri:customer.switch",
  "ri:schema.read",
  "ri:entity.search",
  "ri:entity.read",
  "ri:record.read",
  "ri:record.write",
  "ri:structure.read",
  "ri:analytics.read",
  "ri:model_forms.read",
  "ri:model_forms.write",
  "ri:chart_of_accounts.write",
  "ri:realviews.read",
  "ri:realviews.write",
  "ri:extended_data.read",
  "ri:extended_data.write",
  "ri:reports.write",
];

let base_url = "";
let agent_tools = [];
const requests = [];

async function main() {
  const temp_dir = await fs.mkdtemp(path.join(os.tmpdir(), "ri-agent-contract-"));
  const config_path = path.join(temp_dir, "agent-toolkit.json");
  process.env.REALINSIGHT_AGENT_CONFIG = config_path;

  const server = http.createServer(handle_request);
  await listen(server);

  try {
    const address = server.address();
    base_url = `http://127.0.0.1:${address.port}`;
    await write_config(config_path);

    const { AGENT_TOOLS, DEFAULT_SCOPE, MCP_INSTRUCTIONS } = await import("../src/tool-definitions.mjs");
    const { call_agent_tool } = await import("../src/agent-tools.mjs");
    const { build_url } = await import("../src/http.mjs");
    const { enforce_tool_result_limit } = await import("../src/tool-result-limits.mjs");

    agent_tools = AGENT_TOOLS;
    assert_no_pipeline_surface(DEFAULT_SCOPE, agent_tools);
    assert_no_chart_of_accounts_read_scope(DEFAULT_SCOPE, agent_tools);
    assert_complete_tool_input_schemas(agent_tools);
    assert_search_query_guidance(MCP_INSTRUCTIONS, agent_tools);

    run_build_url_smoke(build_url);
    await run_doctor_smoke(config_path);
    await run_tool_call_smoke(call_agent_tool, temp_dir);
    await run_mcp_smoke(config_path, MCP_INSTRUCTIONS);
    run_result_limit_smoke(enforce_tool_result_limit);

    assert(requests.some((request) => request.path === "/agent/metadata"), "doctor did not request /agent/metadata");

    console.log(JSON.stringify({
      ok: true,
      tool_count: agent_tools.length,
      requests: requests.length,
    }));
  }
  finally {
    server.closeAllConnections?.();
    server.close();
    await fs.rm(temp_dir, { recursive: true, force: true });
  }
}

function assert_no_pipeline_surface(default_scope, tools) {
  const forbidden = new Set(["ri:pipeline.read", "ri:pipeline.queue"]);
  const default_scopes = String(default_scope || "").split(/\s+/).filter(Boolean);
  const leaked_default_scope = default_scopes.find((scope) => forbidden.has(scope));
  assert(!leaked_default_scope, `default scope still includes unsupported pipeline scope: ${leaked_default_scope}`);

  const leaked_tool = tools.find((tool) => forbidden.has(tool.scope) || ["get_pipeline", "queue_pipeline"].includes(tool.name));
  assert(!leaked_tool, `tool inventory still includes unsupported pipeline surface: ${leaked_tool?.name || leaked_tool?.scope}`);
}

function assert_no_chart_of_accounts_read_scope(default_scope, tools) {
  const deprecated_scope = "ri:chart_of_accounts.read";
  const default_scopes = String(default_scope || "").split(/\s+/).filter(Boolean);
  assert(!default_scopes.includes(deprecated_scope), `default scope still includes deprecated COA read scope: ${deprecated_scope}`);

  const leaked_tool = tools.find((tool) => tool.scope === deprecated_scope);
  assert(!leaked_tool, `tool inventory still uses deprecated COA read scope: ${leaked_tool?.name || deprecated_scope}`);
}

function assert_complete_tool_input_schemas(tools) {
  for (const tool of tools) {
    assert(tool.inputSchema, `${tool.name} is missing inputSchema`);
    assert_schema_node(tool.inputSchema, tool.name, true);
  }

  const by_name = new Map(tools.map((tool) => [tool.name, tool]));
  assert(
    by_name.get("set_record")?.inputSchema?.properties?.record?.["x-runtime-defined-values"] === true,
    "set_record.record must explicitly identify its runtime field contract",
  );
  assert(
    by_name.get("set_chart_of_accounts")?.inputSchema?.properties?.chart?.properties?.chart_name,
    "set_chart_of_accounts.chart is missing generated metadata fields",
  );
  assert(
    object_schema(by_name.get("set_chart_of_accounts")?.inputSchema?.properties?.operations?.items?.properties?.account)?.properties?.item_name,
    "set_chart_of_accounts operations are missing generated account fields",
  );
  assert(
    object_schema(by_name.get("validate_create_model_form")?.inputSchema?.properties?.map?.properties?.nodes?.items)?.properties?.map_items,
    "model form map tools are missing generated node/item fields",
  );
  assert(
    object_schema(by_name.get("validate_update_model_form")?.inputSchema?.properties?.map_patch?.properties?.operations?.items?.properties?.node)?.properties?.feature_code,
    "model form patch tools are missing generated node fields",
  );
  assert(
    by_name.get("validate_create_report")?.inputSchema?.properties?.list?.properties?.data_sets?.items?.properties?.feature_code,
    "report tools are missing generated dataset fields",
  );
  assert(
    by_name.get("validate_create_report")?.inputSchema?.properties?.list?.properties?.columns?.items?.properties?.schema_code,
    "report tools are missing generated column fields",
  );
  assert(
    by_name.get("validate_create_report")?.inputSchema?.properties?.composite?.properties?.reports?.items?.properties?.data_sets,
    "report tools are missing generated composite component fields",
  );
  assert(
    by_name.get("import_report_into_composite")?.inputSchema?.properties?.source_report_id,
    "composite import tool is missing its source report id",
  );
  assert(
    schema_property(schema_property(by_name.get("set_realview")?.inputSchema?.properties?.realview, "maps")?.items, "relationship"),
    "set_realview is missing generated map fields",
  );
  assert(
    by_name.get("set_extended_data")?.inputSchema?.properties?.field?.properties?.field_display,
    "set_extended_data is missing generated field settings",
  );
}

function assert_search_query_guidance(instructions, tools) {
  assert(instructions.includes("one coherent concept"), "MCP instructions are missing one-intent-per-query guidance");
  assert(instructions.includes("independent searches in parallel"), "MCP instructions are missing parallel alternative-search guidance");

  const by_name = new Map(tools.map((tool) => [tool.name, tool]));
  for (const tool_name of ["search_features", "search_fields", "search_entities"]) {
    const query_description = by_name.get(tool_name)?.inputSchema?.properties?.query?.description || "";
    assert(query_description.includes("One coherent") || query_description.includes("One actual candidate"), `${tool_name}.query is missing one-intent guidance`);
  }

  assert(by_name.get("search_entities")?.description?.includes("exact field-targeted search"), "search_entities is missing exact-field preference guidance");
}

function object_schema(schema) {
  if (schema?.properties) return schema;
  return (schema?.oneOf || schema?.anyOf || []).find((candidate) => candidate?.properties);
}

function schema_property(schema, name) {
  if (schema?.properties?.[name]) return schema.properties[name];
  for (const candidate of [...(schema?.allOf || []), ...(schema?.oneOf || []), ...(schema?.anyOf || [])]) {
    const value = schema_property(candidate, name);
    if (value) return value;
  }
  return undefined;
}

function assert_schema_node(schema, path, allow_empty_object = false) {
  assert(schema && typeof schema === "object" && !Array.isArray(schema), `${path} is not a JSON Schema object`);
  assert(!schema.$ref, `${path} contains an unresolved schema reference`);

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.includes("object") || schema.properties) {
    const runtime_defined = schema["x-runtime-defined-values"] === true;
    if (runtime_defined) {
      assert(
        schema.additionalProperties && schema.additionalProperties !== true,
        `${path} runtime-defined values must carry an explicit value schema`,
      );
    }
    else {
      assert(schema.additionalProperties === false, `${path} must set additionalProperties=false`);
      assert(
        allow_empty_object || Object.keys(schema.properties || {}).length > 0,
        `${path} is an opaque object with no properties`,
      );
    }

    for (const [name, property] of Object.entries(schema.properties || {})) {
      assert_schema_node(property, `${path}.${name}`);
    }
  }

  if (types.includes("array")) {
    assert(schema.items, `${path} array is missing items`);
    assert_schema_node(schema.items, `${path}[]`);
  }

  for (const keyword of ["oneOf", "anyOf", "allOf"]) {
    for (const [index, child] of (schema[keyword] || []).entries()) {
      assert_schema_node(child, `${path}.${keyword}[${index}]`);
    }
  }
}

function run_build_url_smoke(build_url) {
  const url = build_url("https://www.realinsight.cloud/api/v1/", "/agent/metadata", {
    scope: ["ri:schema.read", "ri:entity.read"],
    empty: "",
  });

  assert(
    url === "https://www.realinsight.cloud/api/v1/agent/metadata?scope=ri%3Aschema.read&scope=ri%3Aentity.read",
    `build_url did not preserve path-bearing base URL: ${url}`,
  );
}

async function run_doctor_smoke(config_path) {
  const result = await run_node_cli(["doctor", "--json"], config_path);

  assert(result.status === 0, `doctor failed: ${result.stderr || result.stdout}`);
  assert(!result.stdout.includes(ACCESS_TOKEN), "doctor output leaked access token");
  assert(!result.stdout.includes(REFRESH_TOKEN), "doctor output leaked refresh token");
  assert(!result.stdout.includes("customer_number"), "doctor output leaked customer_number");
  assert(!result.stdout.includes("customer_id"), "doctor output leaked customer_id");

  const payload = JSON.parse(result.stdout);
  assert(payload.ok === true, "doctor did not report ok=true");
  assert(payload.summary.fail === 0, "doctor reported failures");
  assert(payload.profile.customer_code === CUSTOMER_CODE, "doctor did not include customer_code");
  assert(payload.profile.customer_name === CUSTOMER_NAME, "doctor did not include customer_name");
  assert(payload.checks.some((check) => check.name === "tool_inventory" && check.status === "pass"), "doctor did not pass tool inventory check");
}

async function run_tool_call_smoke(call_agent_tool, temp_dir) {
  const auth_status_result = await call_agent_tool("auth_status", {});
  assert(auth_status_result.status === "connected", "auth_status did not report connected");
  assert(!("customer_number" in auth_status_result), "auth_status returned customer_number");
  assert(!("customer_id" in auth_status_result), "auth_status returned customer_id");
  assert(auth_status_result.customer_code === CUSTOMER_CODE, "auth_status did not include customer_code");
  assert(auth_status_result.customer_name === CUSTOMER_NAME, "auth_status did not include customer_name");

  const profiles_result = await call_agent_tool("list_profiles", {});
  assert(profiles_result.profiles[0].customer_code === CUSTOMER_CODE, "list_profiles did not include customer_code");
  assert(!("customer_number" in profiles_result.profiles[0]), "list_profiles returned customer_number");
  assert(!("customer_id" in profiles_result.profiles[0]), "list_profiles returned customer_id");

  const switch_result = await call_agent_tool("switch_profile", { profile: "default" });
  assert(switch_result.status === "active_profile_switched", "switch_profile did not activate an existing profile");
  assert(switch_result.customer_code === CUSTOMER_CODE, "switch_profile did not return customer_code");

  const pending_switch_result = await call_agent_tool("switch_profile", {
    customer_code: "NEXT",
    base_url,
    open_browser: false,
    wait_for_approval: false,
  });
  assert(pending_switch_result.status === "authorization_pending", "switch_profile did not start a pending customer login");
  assert(pending_switch_result.profile === "NEXT", "switch_profile did not use customer_code as the profile name");
  assert(pending_switch_result.customer_code === "NEXT", "switch_profile did not keep the customer_code login hint");
  assert(pending_switch_result.force_login === true, "switch_profile did not default force_login to true");
  assert(pending_switch_result.verification_uri_complete.includes("customer_code=NEXT"), "switch_profile verification URL did not include customer_code");
  assert(pending_switch_result.verification_uri_complete.includes("prompt=login"), "switch_profile verification URL did not include prompt=login");

  const return_switch_result = await call_agent_tool("switch_profile", { profile: "default" });
  assert(return_switch_result.status === "active_profile_switched", "switch_profile did not switch back to default");

  const tool_reference_result = await call_agent_tool("get_tool_reference", {
    topic: "reports",
    format: "schema",
  });
  assert(tool_reference_result.topic === "reports", "get_tool_reference did not return reports topic");
  assert(tool_reference_result.schema.list_fields.includes("master_feature_code"), "get_tool_reference did not return report schema fields");

  const report_computed_reference_result = await call_agent_tool("get_tool_reference", {
    topic: "report_computed_fields",
    format: "schema",
  });
  assert(report_computed_reference_result.topic === "report_computed_fields", "get_tool_reference did not return report_computed_fields topic");
  assert(report_computed_reference_result.schema.computed_column_types.includes("DATA"), "get_tool_reference did not return computed column types");

  const model_form_map_reference_result = await call_agent_tool("get_tool_reference", {
    topic: "model_form_map_schema",
    format: "schema",
  });
  assert(model_form_map_reference_result.topic === "model_form_map_schema", "get_tool_reference did not return model_form_map_schema topic");
  assert(model_form_map_reference_result.schema.map_item.fields.includes("coa_actuals_layout"), "model form map reference did not include coa_actuals_layout");
  assert(model_form_map_reference_result.schema.coa_actuals_layout.fields.includes("coa_adjustment_column"), "model form map reference did not include actual adjustment column");
  assert(model_form_map_reference_result.schema.coa_budget_layout.fields.includes("coa_total_column"), "model form map reference did not include budget total column");
  assert(model_form_map_reference_result.schema.coa_servicing_balance_layout.fields.includes("value_column"), "model form map reference did not include servicing balance value column");

  const feature_result = await call_agent_tool("search_features", { query: "loan" });
  assert(feature_result.items[0].feature_code === "Loan", "search_features did not return Loan");
  assert(!("customer_number" in feature_result.provenance), "tool provenance returned customer_number");
  assert(!("customer_id" in feature_result.provenance), "tool provenance returned customer_id");
  assert(feature_result.provenance.customer_code === CUSTOMER_CODE, "tool provenance did not include customer_code");
  assert(feature_result.provenance.customer_name === CUSTOMER_NAME, "tool provenance did not include customer_name");

  const field_result = await call_agent_tool("search_fields", { query: "balance", feature_code: "Loan" });
  assert(field_result.items[0].schema_code === "Loan.Balance", "search_fields did not return Loan.Balance");

  const get_fields_result = await call_agent_tool("get_fields", { feature_code: "Loan" });
  assert(get_fields_result.items.some((field) => field.schema_code === "Loan.LoanNumber"), "get_fields did not return Loan.LoanNumber");
  const loan_status_field = get_fields_result.items.find((field) => field.schema_code === "Loan.Status");
  assert(loan_status_field?.description === "Current lifecycle status for the loan.", "get_fields did not retain the field description");
  assert(loan_status_field?.value_type === "dictionary", "get_fields did not retain the field value type");
  assert(loan_status_field?.values?.[0]?.code === "ACTIVE", "get_fields did not retain the allowed value code");
  assert(loan_status_field?.values?.[0]?.description === "The loan is currently active.", "get_fields did not retain the allowed value description");

  const entity_result = await call_agent_tool("search_entities", { query: "Madison", feature_code: "Loan" });
  assert(entity_result.items[0].entity_id === "loan-1", "search_entities did not return loan-1");

  const children_result = await call_agent_tool("get_children", {
    feature_code: "LoanPaymentHistory",
    parent_ids: ["loan-1"],
    limit: 5,
  });
  assert(children_result.items[0].entity_id === "payment-1", "get_children did not return payment-1");

  const structure_result = await call_agent_tool("get_entity_structure", {
    traversal: "parent",
    entity_ids: ["loan-1"],
  });
  assert(structure_result.items[0].nodes.some((node) => node.entity_id === "deal-1"), "get_entity_structure did not return deal-1");

  const record_result = await call_agent_tool("get_records", {
    feature_code: "Loan",
    entity_ids: ["loan-1"],
    schema_codes: ["Loan.LoanNumber"],
    accounts_projection: "summary",
  });
  assert(record_result.items[0].values[0].value === "LN-001", "get_records did not return LN-001");

  const dashboard_pages_result = await call_agent_tool("list_dashboard_pages", {});
  assert(dashboard_pages_result.items[0].page_id === "page-1", "list_dashboard_pages did not return page-1");

  const dashboard_page_result = await call_agent_tool("get_dashboard_page", { page_id: "page-1" });
  assert(dashboard_page_result.items[0].analytics[0].analytic_report_id === "analytic-1", "get_dashboard_page did not return analytic-1");

  const analytic_data_result = await call_agent_tool("get_analytic_data", { report_id: "analytic-1", limit: 1 });
  assert(analytic_data_result.items[0].rows[0]["col-tenant"] === "Tenant A", "get_analytic_data did not return Tenant A");

  const workbenches_result = await call_agent_tool("list_workbenches", {});
  assert(workbenches_result.items[0].workbench_id === "workbench-list-1", "list_workbenches did not return workbench-list-1");

  const workbench_data_result = await call_agent_tool("get_workbench_data", { workbench_id: "workbench-list-1", limit: 1 });
  assert(workbench_data_result.items[0].rows[0]["col-balance"] === 1250000, "get_workbench_data did not return balance");

  const report_search_result = await call_agent_tool("search_reports", { search_text: "Loan" });
  assert(report_search_result.items[0].report_id === "report-2", "search_reports did not return report-2");

  const report_folder_search_result = await call_agent_tool("search_report_folders", { parent_folder_id: "REPORT" });
  assert(report_folder_search_result.items[0].folder_id === "report-folder-agent", "search_report_folders did not return report-folder-agent");

  const report_config_result = await call_agent_tool("get_report", { report_id: "report-2" });
  assert(report_config_result.items[0].conflict_token === "conflict-report-2", "get_report did not return latest conflict token");

  const composite_import_result = await call_agent_tool("import_report_into_composite", {
    report_id: "composite-1",
    source_report_id: "report-2",
    expected_conflict_token: "conflict-composite-1",
    approved: true,
  });
  assert(composite_import_result.items[0].report.composite.reports[0].report_list_id === "embedded-report-new", "import_report_into_composite did not return the independent embedded report");

  const report_template_download_path = path.join(temp_dir, "composite-download.xlsx");
  const report_template_result = await call_agent_tool("download_report_template", {
    report_id: "composite-1",
    output_path: report_template_download_path,
  });
  assert(report_template_result.items[0].template_id === "report-template-1", "download_report_template did not return report-template-1");
  assert((await fs.readFile(report_template_download_path, "utf8")) === "report template download", "download_report_template did not fetch signed download_url");

  const report_template_path = path.join(temp_dir, "composite.xlsx");
  await fs.writeFile(report_template_path, "report template upload");
  const report_template_stage_result = await call_agent_tool("stage_report_template_file", {
    report_id: "composite-1",
    file_path: report_template_path,
    approved: true,
  });
  assert(report_template_stage_result.items[0].staged_file_id === "staged-report-template-1", "stage_report_template_file did not return staged id");
  assert(!("upload_url" in report_template_stage_result.items[0]), "stage_report_template_file should remove signed upload_url after local upload");

  const report_template_upload_result = await call_agent_tool("upload_report_template", {
    report_id: "composite-1",
    staged_file_id: "staged-report-template-1",
    expected_conflict_token: "conflict-composite-2",
    approved: true,
  });
  assert(report_template_upload_result.items[0].template_file.template_id === "report-template-2", "upload_report_template did not return a fresh template id");

  const coa_result = await call_agent_tool("get_chart_of_accounts", {
    coa_id: "coa-1",
    include_accounts: true,
  });
  assert(coa_result.items[0].chart._id === "coa-1", "get_chart_of_accounts did not return coa-1");
  assert(coa_result.items[0].chart.Layout[0].AccountType === "REV", "get_chart_of_accounts did not return revenue account");

  const coa_data_result = await call_agent_tool("get_coa_data", {
    coa_data_id: "coa-data-1",
    projection: "values",
    item_ids: ["coa-item-1"],
    limit: 10,
  });
  assert(coa_data_result.items[0].summary.coa_data_id === "coa-data-1", "get_coa_data did not return coa-data-1");
  assert(coa_data_result.items[0].values[0].entry.decimal === 125000, "get_coa_data did not return the flat value");

  const coa_dry_run_result = await call_agent_tool("set_chart_of_accounts", {
    coa_id: "coa-1",
    expected_conflict_token: "conflict-coa-1",
    operations: [
      { op: "update_account", item_id: "coa-item-1", account: { item_name: "Revenue Updated" } },
    ],
    dry_run: true,
  });
  assert(coa_dry_run_result.items[0].can_apply === true, "set_chart_of_accounts dry_run did not return can_apply");
  assert(coa_dry_run_result.items[0].normalized_preview.chart.Layout[0].ItemName === "Revenue Updated", "set_chart_of_accounts dry_run did not preview account update");

  const coa_update_result = await call_agent_tool("set_chart_of_accounts", {
    coa_id: "coa-1",
    expected_conflict_token: "conflict-coa-1",
    operations: [
      { op: "update_account", item_id: "coa-item-1", account: { item_name: "Revenue Updated" } },
    ],
    approved: true,
  });
  assert(coa_update_result.items[0].chart_of_accounts.chart.Layout[0].ItemName === "Revenue Updated", "set_chart_of_accounts did not update account name");

  const realview_result = await call_agent_tool("get_realviews", { realview_id: "realview-1" });
  assert(realview_result.items[0].realview_id === "realview-1", "get_realviews did not return realview-1");
  assert(realview_result.items[0].conflict_token === "conflict-realview-1", "get_realviews did not return conflict token");

  const realview_execution = await call_agent_tool("execute_realview", {
    realview_id: "realview-1",
    entity_ids: ["loan-1", "loan-2"],
  });
  assert(realview_execution.items[0].entity_id === "loan-1", "execute_realview did not preserve entity order");
  assert(realview_execution.items[0].value === 1250000, "execute_realview did not return the computed value");
  assert(realview_execution.items[1].has_result === false, "execute_realview did not return the blank second result");

  const realview_dry_run = await call_agent_tool("set_realview", {
    realview_id: "realview-1",
    expected_conflict_token: "conflict-realview-1",
    realview: { display: "Loan Balance", root_feature_code: "Loan", maps: [] },
    dry_run: true,
  });
  assert(realview_dry_run.items[0].can_apply === true, "set_realview dry_run did not return can_apply");
  const realview_update = await call_agent_tool("set_realview", {
    realview_id: "realview-1",
    expected_conflict_token: "conflict-realview-1",
    realview: { display: "Loan Balance", root_feature_code: "Loan", maps: [] },
    approved: true,
  });
  assert(realview_update.items[0].realview.conflict_token === "conflict-realview-2", "set_realview did not return updated conflict token");

  const extended_data_result = await call_agent_tool("get_extended_data", { configuration_id: "extended-1" });
  assert(extended_data_result.items[0].kind === "custom", "get_extended_data did not distinguish custom configuration");
  assert(extended_data_result.items[0].field.field_display === "Watch List", "get_extended_data did not return configuration metadata");

  const extended_data_dry_run = await call_agent_tool("set_extended_data", {
    configuration_id: "extended-1",
    operation: "upsert",
    expected_conflict_token: "conflict-extended-1",
    field: { field_display: "Watch List Updated" },
    dry_run: true,
  });
  assert(extended_data_dry_run.items[0].can_apply === true, "set_extended_data dry_run did not return can_apply");
  const extended_data_update = await call_agent_tool("set_extended_data", {
    configuration_id: "extended-1",
    operation: "upsert",
    expected_conflict_token: "conflict-extended-1",
    field: { field_display: "Watch List Updated" },
    approved: true,
  });
  assert(extended_data_update.items[0].extended_data.configuration.field_display === "Watch List Updated", "set_extended_data did not return updated configuration");

  const model_form_search_result = await call_agent_tool("search_model_forms", { search_text: "Loan" });
  assert(model_form_search_result.items[0].model_form_id === "model-form-1", "search_model_forms did not return model-form-1");

  const model_form_folder_search_result = await call_agent_tool("search_model_form_folders", { parent_folder_id: "WORKBOOKPROCESS" });
  assert(model_form_folder_search_result.items[0].folder_id === "model-form-folder-agent", "search_model_form_folders did not return model-form-folder-agent");

  const model_form_result = await call_agent_tool("get_model_form", { model_form_id: "model-form-1" });
  assert(model_form_result.items[0].model_form.conflict_token === "conflict-model-form-1", "get_model_form did not return latest conflict token");

  const model_form_detail_result = await call_agent_tool("get_model_form", {
    model_form_id: "model-form-1",
    sections: "template,map_tree,node,item,used_fields",
    node_id: "map-1",
    map_item_id: "map-item-1",
  });
  assert(model_form_detail_result.items[0].template.template.template_id === "template-1", "get_model_form did not return template-1");
  assert(model_form_detail_result.items[0].map_tree.nodes[0].node_id === "map-1", "get_model_form did not return map-1");
  assert(model_form_detail_result.items[0].node.map_items[0].map_item_id === "map-item-1", "get_model_form did not return map-item-1");
  assert(model_form_detail_result.items[0].item.item.schema_code === "Loan.Balance", "get_model_form did not return Loan.Balance item");
  assert(model_form_detail_result.items[0].used_fields.fields[0].schema_code === "Loan.Balance", "get_model_form did not return Loan.Balance field");

  const model_form_download_path = path.join(temp_dir, "loan-model-download.xlsx");
  const model_form_download_result = await call_agent_tool("download_model_form_template", {
    model_form_id: "model-form-1",
    output_path: model_form_download_path,
  });
  assert(model_form_download_result.items[0].local_file_path === model_form_download_path, "download_model_form_template did not write local_file_path");
  assert((await fs.readFile(model_form_download_path, "utf8")) === "contract download", "download_model_form_template did not fetch signed download_url");

  const model_form_update_request = {
    process_name: "Loan Model Updated",
    process_description: "Updated by contract smoke",
    parent_folder_id: "WORKBOOKPROCESS",
    global_assignment: true,
    file_name_template: "Loan Model",
    expected_conflict_token: "conflict-model-form-1",
    change_reason: "contract smoke",
  };
  const model_form_validation_result = await call_agent_tool("validate_update_model_form", {
    model_form_id: "model-form-1",
    ...model_form_update_request,
  });
  assert(model_form_validation_result.items[0].can_apply === true, "validate_update_model_form did not return can_apply");

  const model_form_update_result = await call_agent_tool("update_model_form", {
    model_form_id: "model-form-1",
    ...model_form_update_request,
    approved: true,
  });
  assert(model_form_update_result.items[0].model_form.process_name === "Loan Model Updated", "update_model_form did not update process_name");

  const model_form_template_path = path.join(temp_dir, "loan-model.xlsx");
  await fs.writeFile(model_form_template_path, "contract smoke");

  const model_form_stage_result = await call_agent_tool("stage_model_form_template_file", {
    model_form_id: "model-form-1",
    file_path: model_form_template_path,
    approved: true,
  });
  assert(model_form_stage_result.items[0].staged_file_id === "staged-file-1", "stage_model_form_template_file did not return staged_file_id");
  assert(!("upload_url" in model_form_stage_result.items[0]), "stage_model_form_template_file should remove signed upload_url after local upload");

  const model_form_upload_result = await call_agent_tool("upload_model_form_template", {
    model_form_id: "model-form-1",
    staged_file_id: "staged-file-1",
    expected_conflict_token: "conflict-model-form-1",
    approved: true,
  });
  assert(model_form_upload_result.items[0].model_form.template_file_name === "loan-model.xlsx", "upload_model_form_template did not consume staged file handle");
}

async function run_mcp_smoke(config_path, mcp_instructions) {
  const child = spawn(NODE_BIN, ["./src/ri-agent.mjs", "mcp"], {
    cwd: TOOLKIT_ROOT,
    env: {
      ...process.env,
      REALINSIGHT_AGENT_CONFIG: config_path,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const responses = [];
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);

    while (stdout.includes("\n")) {
      const index = stdout.indexOf("\n");
      const line = stdout.slice(0, index);
      stdout = stdout.slice(index + 1);

      if (line.trim()) responses.push(JSON.parse(line));
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18" },
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "search_features",
      arguments: { query: "loan" },
    },
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 4,
    method: "server/discover",
    params: {
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientInfo": {
          name: "contract-smoke",
          version: "1.0.0",
        },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/list",
    params: {
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 6,
    method: "initialize",
    params: {
      protocolVersion: "2026-07-28",
      _meta: {
        "io.modelcontextprotocol/protocolVersion": "2026-07-28",
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 7,
    method: "initialize",
    params: { protocolVersion: "2026-07-28" },
  }) + "\n");
  child.stdin.end();

  const exit_code = await wait_for_child(child);
  assert(exit_code === 0, `mcp exited with ${exit_code}: ${stderr}`);
  assert(responses.find((response) => response.id === 1)?.result?.serverInfo?.name === "realinsight-agent-toolkit", "mcp initialize failed");
  const listed_tools = responses.find((response) => response.id === 2)?.result?.tools;
  assert(listed_tools?.length === agent_tools.length, "mcp tools/list returned unexpected tool count");
  assert_complete_tool_input_schemas(listed_tools);
  assert(listed_tools.every((tool) => (
    typeof tool.annotations?.readOnlyHint === "boolean"
    && typeof tool.annotations?.destructiveHint === "boolean"
    && typeof tool.annotations?.openWorldHint === "boolean"
  )), "mcp tools/list omitted review annotations");
  const destructive_tools = listed_tools
    .filter((tool) => tool.annotations.destructiveHint)
    .map((tool) => tool.name)
    .sort();
  const expected_destructive_tools = [
    "delete_report",
    "disconnect_realinsight",
    "import_report_into_composite",
    "set_chart_of_accounts",
    "set_extended_data",
    "set_realview",
    "set_record",
    "update_model_form",
    "update_report",
    "upload_model_form_template",
    "upload_report_template",
  ];
  assert(
    JSON.stringify(destructive_tools) === JSON.stringify(expected_destructive_tools),
    `mcp destructive annotations drifted: ${destructive_tools.join(", ")}`,
  );

  const call_response = responses.find((response) => response.id === 3);
  assert(call_response?.result?.structuredContent?.items?.[0]?.feature_code === "Loan", "mcp tools/call did not return Loan");
  const discover_response = responses.find((response) => response.id === 4)?.result;
  assert(discover_response?.supportedVersions?.includes("2026-07-28"), "mcp server/discover did not advertise 2026-07-28");
  assert(discover_response?.instructions === mcp_instructions, "mcp server/discover instructions drifted from initialize instructions");
  assert(discover_response?.resultType === "complete", "mcp server/discover resultType missing");
  assert(discover_response?._meta?.["io.modelcontextprotocol/serverInfo"]?.name === "realinsight-agent-toolkit", "mcp server/discover serverInfo metadata missing");
  const modern_tools_response = responses.find((response) => response.id === 5)?.result;
  assert(modern_tools_response?.resultType === "complete", "modern tools/list resultType missing");
  assert(modern_tools_response?.cacheScope === "private", "modern tools/list cache scope missing");
  assert(responses.find((response) => response.id === 6)?.error?.code === -32601, "modern initialize should be removed");
  assert(responses.find((response) => response.id === 7)?.result?.protocolVersion === "2025-11-25", "legacy initialize negotiated a modern version");
}

function run_result_limit_smoke(enforce_tool_result_limit) {
  const original_limit = process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES;
  process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES = "20000";

  try {
    const payload = {
      items: Array.from({ length: 1000 }, (_, index) => ({
        entity_id: `entity-${index}`,
        value: "x".repeat(200),
      })),
      count: 1000,
      is_truncated: false,
      warnings: [],
      provenance: {
        tool: "contract",
        source: "test",
      },
    };
    const limited = enforce_tool_result_limit("contract", payload);
    const size = new TextEncoder().encode(JSON.stringify(limited)).length;

    assert(size <= 20000, `limited payload too large: ${size}`);
    assert(limited.is_truncated === true, "limited payload was not marked truncated");
    assert(limited.items.length < payload.items.length, "limited payload was not trimmed");
    assert(limited.warnings.length > 0, "limited payload warning missing");
  }
  finally {
    if (original_limit === undefined) {
      delete process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES;
    }
    else {
      process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES = original_limit;
    }
  }
}

async function handle_request(request, response) {
  const url = new URL(request.url, base_url || "http://127.0.0.1");
  const body = await read_request_body(request);
  requests.push({
    method: request.method,
    path: url.pathname,
  });

  if (url.pathname.startsWith("/agent/") || url.pathname === "/oauth/me") {
    const authorization = request.headers.authorization || "";

    if (authorization !== `Bearer ${ACCESS_TOKEN}`) {
      write_json(response, 401, {
        error: "invalid_token",
        error_description: "Missing or invalid bearer token.",
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
    write_json(response, 200, {
      resource: base_url,
      authorization_servers: [base_url],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/oauth/me") {
    write_json(response, 200, {
      credential_type: "oauth_access_token",
      client_id: "realinsight-agent-toolkit",
      grant_id: "grant-1",
      token_id: "token-1",
      customer_name: CUSTOMER_NAME,
      customer_code: CUSTOMER_CODE,
      customer_id: CUSTOMER_ID,
      user_id: USER_ID,
      scopes: SCOPES,
      expires_at_utc: new Date(Date.now() + 3600000).toISOString(),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/oauth/device_authorization") {
    assert(body.customer_code === "NEXT", "device authorization did not receive customer_code");
    assert(body.prompt === "login", "device authorization did not receive prompt=login");
    assert(body.force_login === true, "device authorization did not receive force_login");
    write_json(response, 200, {
      device_code: "ridc_pending_switch",
      user_code: "NEXT-CODE",
      verification_uri: `${base_url}/oauth/device`,
      verification_uri_complete: `${base_url}/oauth/device?user_code=NEXT-CODE&customer_code=NEXT&prompt=login`,
      expires_in: 600,
      interval: 5,
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/metadata") {
    write_json(response, 200, {
      api_version: "0.1.0",
        tools: agent_tools.map((tool) => ({
          name: tool.name,
          route: tool.route,
          required_scope: tool.scope,
          description: tool.description,
        })).filter((tool) => !agent_tools.find((local_tool) => local_tool.name === tool.name)?.local_only),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/schema/features/search") {
    write_json(response, 200, agent_result("search_features", "ri:schema.read", [
      {
        feature_code: "Loan",
        type_name: "Loan",
        type: "MASTER",
        master_feature_code: "Loan",
        parent_feature_code: "Deal",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/schema/fields/search") {
    write_json(response, 200, agent_result("search_fields", "ri:schema.read", [
      {
        schema_code: "Loan.Balance",
        feature_code: "Loan",
        field_name: "Balance",
        display: "Balance",
        field_type: "MONEY",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/schema/features/Loan/fields") {
    write_json(response, 200, agent_result("get_fields", "ri:schema.read", [
      {
        schema_code: "Loan.LoanNumber",
        feature_code: "Loan",
        field_name: "LoanNumber",
        display: "Loan Number",
        field_type: "TEXT",
      },
      {
        schema_code: "Loan.Balance",
        feature_code: "Loan",
        field_name: "Balance",
        display: "Balance",
        field_type: "MONEY",
      },
      {
        schema_code: "Loan.Status",
        feature_code: "Loan",
        field_name: "Status",
        display: "Status",
        description: "Current lifecycle status for the loan.",
        field_type: "TEXT",
        value_type: "dictionary",
        values: [
          {
            code: "ACTIVE",
            display: "Active",
            description: "The loan is currently active.",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/entities/search") {
    write_json(response, 200, agent_result("search_entities", "ri:entity.search", [
      {
        entity_id: "loan-1",
        feature_code: "Loan",
        schema_code: "Loan.LoanNumber",
        field_name: "LoanNumber",
        matched_value: url.searchParams.get("q") || "Madison",
        parent_id: "deal-1",
        master_id: "deal-1",
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/entities/children") {
    assert(body.feature_code === "LoanPaymentHistory", "unexpected child feature in contract request");
    write_json(response, 200, agent_result("get_children", "ri:entity.read", [
      {
        entity_id: "payment-1",
        feature_code: "LoanPaymentHistory",
        parent_id: "loan-1",
        master_id: "deal-1",
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/entities/structure") {
    write_json(response, 200, agent_result("get_entity_structure", "ri:structure.read", [
      {
        nodes: [
          {
            entity_id: "loan-1",
            feature_code: "Loan",
            parent_id: "deal-1",
            master_id: "deal-1",
          },
          {
            entity_id: "deal-1",
            feature_code: "Deal",
            parent_id: "",
            master_id: "deal-1",
          },
        ],
        edges: [
          {
            from_entity_id: "loan-1",
            to_entity_id: "deal-1",
            relationship: "parent",
            feature_code: "Deal",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/records/get") {
    assert(body.accounts_projection === "summary", "get_records did not forward accounts_projection");
    write_json(response, 200, agent_result("get_records", "ri:record.read", [
      {
        entity_id: "loan-1",
        feature_code: "Loan",
        parent_id: "deal-1",
        master_id: "deal-1",
        field_profile: "explicit_fields",
        values: [
          {
            schema_code: "Loan.LoanNumber",
            field_name: "LoanNumber",
            display: "Loan Number",
            field_type: "TEXT",
            value: "LN-001",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/dashboards/pages") {
    write_json(response, 200, agent_result("list_dashboard_pages", "ri:analytics.read", [
      {
        page_id: "page-1",
        title: "Portfolio Overview",
        description: "Core portfolio dashboard",
        page_type: "USER",
        page_order: 1,
        analytic_count: 1,
        filter_count: 1,
        is_home_snapshot: true,
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/dashboards/pages/page-1") {
    write_json(response, 200, agent_result("get_dashboard_page", "ri:analytics.read", [
      {
        page_id: "page-1",
        title: "Portfolio Overview",
        analytics: [
          {
            analytic_report_id: "analytic-1",
            analytic_report_name: "Top Tenants",
            base_report_id: "report-1",
            base_report_name: "Tenant List",
            cache_status: "ready",
            row_count: 2,
          },
        ],
        filters: [
          {
            filter_id: "Market",
            label: "Market",
            schema_code: "CREMaster.Market",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/analytics/analytic-1/data") {
    write_json(response, 200, agent_result("get_analytic_data", "ri:analytics.read", [
      {
        source_type: "analytic",
        report_id: "analytic-1",
        report_name: "Top Tenants",
        analytic_report_id: "analytic-1",
        base_report_id: "report-1",
        base_report_name: "Tenant List",
        cache_key: "cache:user:contract-user:analytic:analytic-1",
        cache_status: "ready",
        total_rows: 1,
        offset: 0,
        limit: Number(url.searchParams.get("limit") || 100),
        columns: [
          {
            column_id: "col-tenant",
            label: "Tenant",
            schema_code: "RentRoll.TenantName",
          },
        ],
        rows: [
          {
            "col-tenant": "Tenant A",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/workbenches") {
    write_json(response, 200, agent_result("list_workbenches", "ri:analytics.read", [
      {
        workbench_id: "workbench-list-1",
        workbench_code: "LOAN_WORKBENCH",
        workbench_item_name: "Active Loans",
        list_report_id: "report-2",
        list_report_name: "Loan List",
        cache_status: "ready",
        row_count: 1,
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/workbenches/workbench-list-1/data") {
    write_json(response, 200, agent_result("get_workbench_data", "ri:analytics.read", [
      {
        source_type: "workbench",
        report_id: "report-2",
        report_name: "Loan List",
        workbench_id: "workbench-list-1",
        workbench_code: "LOAN_WORKBENCH",
        cache_key: "cache:user:contract-user:workbench:workbench-list-1",
        cache_status: "ready",
        total_rows: 1,
        offset: 0,
        limit: Number(url.searchParams.get("limit") || 100),
        columns: [
          {
            column_id: "col-balance",
            label: "Balance",
            schema_code: "Loan.Balance",
          },
        ],
        rows: [
          {
            "col-balance": 1250000,
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/reports/configurations/search") {
    write_json(response, 200, agent_result("search_reports", "ri:analytics.read", [
      {
        report_id: "report-2",
        report_type: "LIST",
        active: true,
        parent_folder_id: "REPORT",
        report_name: "Loan List",
        master_feature_code: "Loan",
        column_count: 1,
        conflict_token: "conflict-report-2",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/reports/folders/search") {
    write_json(response, 200, agent_result("search_report_folders", "ri:analytics.read", [
      {
        folder_id: "report-folder-agent",
        active: true,
        parent_folder_id: "REPORT",
        folder_name: "agent",
        child_folder_count: 1,
        report_count: 0,
        conflict_token: "conflict-report-folder-agent",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/reports/configurations/report-2") {
    write_json(response, 200, agent_result("get_report", "ri:analytics.read", [
      {
        report_id: "report-2",
        report_type: "LIST",
        active: true,
        parent_folder_id: "REPORT",
        report_name: "Loan List",
        master_feature_code: "Loan",
        column_count: 1,
        conflict_token: "conflict-report-2",
        list: {
          master_feature_code: "Loan",
          data_sets: [
            {
              data_set_id: "dataset-1",
              feature_code: "Loan",
            },
          ],
          columns: [
            {
              column_id: "column-1",
              data_set_id: "dataset-1",
              field_name: "Balance",
              schema_code: "Loan.Balance",
            },
          ],
        },
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/reports/configurations/composite-1/composite/import-list-report") {
    assert(body.approved === true, "import_report_into_composite did not send approved=true");
    assert(body.source_report_id === "report-2", "import_report_into_composite did not send source_report_id");
    assert(!("insert_at" in body), "import_report_into_composite should omit insert_at to append");
    write_json(response, 200, agent_result("import_report_into_composite", "ri:reports.write", [
      {
        report: {
          report_id: "composite-1",
          report_type: "COMPOSITE",
          conflict_token: "conflict-composite-2",
          composite: { reports: [{ report_list_id: "embedded-report-new", report_sheet: "Loan List" }] },
        },
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/reports/configurations/composite-1/template-file") {
    write_json(response, 200, agent_result("download_report_template", "ri:analytics.read", [
      {
        report_id: "composite-1",
        template_id: "report-template-1",
        file_name: "composite.xlsx",
        download_url: `${base_url}/signed/report-template-download`,
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/signed/report-template-download") {
    response.writeHead(200, { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    response.end("report template download");
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/reports/configurations/composite-1/template-file/stage") {
    assert(body.approved === true, "stage_report_template_file did not send approved=true");
    assert(body.file_name === "composite.xlsx", "stage_report_template_file did not send file_name");
    write_json(response, 200, agent_result("stage_report_template_file", "ri:reports.write", [
      {
        report_id: "composite-1",
        staged_file_id: "staged-report-template-1",
        file_name: body.file_name,
        upload_url: `${base_url}/signed/report-template-upload`,
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/signed/report-template-upload") {
    assert(String(request.headers["content-type"] || "").startsWith("multipart/form-data"), "signed report template upload did not use multipart/form-data");
    assert(body.__raw_text.includes("report template upload"), "signed report template upload did not include file bytes");
    write_json(response, 200, {
      report_id: "composite-1",
      staged_file_id: "staged-report-template-1",
      file_name: "composite.xlsx",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/reports/configurations/composite-1/template-file") {
    assert(body.approved === true, "upload_report_template did not send approved=true");
    assert(body.staged_file_id === "staged-report-template-1", "upload_report_template did not send staged_file_id");
    write_json(response, 200, agent_result("upload_report_template", "ri:reports.write", [
      {
        report: { report_id: "composite-1", conflict_token: "conflict-composite-3" },
        template_file: { report_id: "composite-1", template_id: "report-template-2", file_name: "composite.xlsx" },
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/chart-of-accounts/get") {
    write_json(response, 200, agent_result("get_chart_of_accounts", "", [
      {
        chart: {
          _id: body.coa_id || "coa-1",
          ChartOfAccountsCode: "OPERATING",
          ChartName: "Operating Statement COA",
          ChartDescription: "Contract smoke COA",
          MasterFeatureCode: "CREMaster",
          Availability: [
            {
              feature_code: "CREOpStmt",
              template: "C",
            },
          ],
          Layout: [
            {
              ItemId: "coa-item-1",
              ChartOfAccountsItemCode: "4000",
              ChartOrder: 1,
              ItemType: "ACCT",
              AccountId: "4000",
              ItemName: "Revenue",
              FieldType: "money",
              AccountType: "REV",
              ExternalGlXref: [
                {
                  ExternalGlSystemRef: "gl-1",
                  AccountCode: "4000",
                },
              ],
            },
          ],
          RollUpToCharts: [],
          MonitorRuleSets: [],
        },
        conflict_token: "conflict-coa-1",
        account_type_values: [
          {
            id: "acct-rev",
            code: "REV",
            display: "Revenue",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/chart-of-accounts/data/get") {
    assert(body.coa_data_id === "coa-data-1", "get_coa_data missing coa_data_id");
    assert(body.item_ids[0] === "coa-item-1", "get_coa_data missing item filter");
    write_json(response, 200, agent_result("get_coa_data", "", [
      {
        summary: {
          coa_data_id: "coa-data-1",
          chart_id: "coa-1",
          value_count: 1,
        },
        values: [
          {
            source: "annual_item",
            item_id: "coa-item-1",
            year: 2025,
            period: 1,
            entry: { decimal: 125000 },
          },
        ],
        is_truncated: false,
        next_cursor: null,
        limit: 10,
        offset: 0,
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/chart-of-accounts/set") {
    assert(body.expected_conflict_token === "conflict-coa-1", "set_chart_of_accounts missing conflict token");
    const dry_run = body.dry_run === true;

    if (dry_run) {
      write_json(response, 200, agent_result("set_chart_of_accounts", "ri:chart_of_accounts.write", [
        {
          can_apply: true,
          errors: [],
          warnings: [],
          normalized_preview: {
            chart: {
              _id: body.coa_id || "coa-1",
              ChartName: "Operating Statement COA",
              Layout: [
                {
                  ItemId: "coa-item-1",
                  ItemName: "Revenue Updated",
                  AccountType: "REV",
                },
              ],
            },
            conflict_token: "conflict-coa-1",
          },
        },
      ]));
      return;
    }

    assert(body.approved === true, "set_chart_of_accounts did not send approved=true");
    write_json(response, 200, agent_result("set_chart_of_accounts", "ri:chart_of_accounts.write", [
      {
        chart_of_accounts: {
          chart: {
            _id: body.coa_id || "coa-1",
            ChartName: "Operating Statement COA",
            Layout: [
              {
                ItemId: "coa-item-1",
                ItemName: "Revenue Updated",
                AccountType: "REV",
              },
            ],
          },
          conflict_token: "conflict-coa-2",
        },
        audit_log: {
          resource_family: "configuration",
          resource_type: "chart_of_accounts",
          resource_id: body.coa_id || "coa-1",
          action: "update",
          operation_id: "op-coa-1",
          changes: [],
        },
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/realviews/get") {
    assert(body.realview_id === "realview-1", "get_realviews missing realview_id");
    write_json(response, 200, agent_result("get_realviews", "ri:realviews.read", [{
      realview_id: "realview-1",
      active: true,
      definition: {
        display: "Loan Balance",
        root_feature_code: "Loan",
        maps: [{ order: 1, relationship: "root" }],
      },
      conflict_token: "conflict-realview-1",
    }]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/realviews/execute") {
    assert(body.realview_id === "realview-1", "execute_realview missing realview_id");
    assert(JSON.stringify(body.entity_ids) === JSON.stringify(["loan-1", "loan-2"]), "execute_realview missing entity_ids");
    write_json(response, 200, agent_result("execute_realview", "ri:realviews.read", [
      { entity_id: "loan-1", has_result: true, value: 1250000, is_aggregate: false },
      { entity_id: "loan-2", has_result: false, value: null, is_aggregate: false },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/realviews/set") {
    assert(body.expected_conflict_token === "conflict-realview-1", "set_realview missing conflict token");
    if (body.dry_run === true) {
      write_json(response, 200, agent_result("set_realview", "ri:realviews.write", [{ can_apply: true, errors: [], warnings: [], normalized_preview: { realview: body.realview, conflict_token: "conflict-realview-1" } }]));
      return;
    }
    assert(body.approved === true, "set_realview did not send approved=true");
    write_json(response, 200, agent_result("set_realview", "ri:realviews.write", [{
      realview: { realview: { id: "realview-1", ...body.realview }, conflict_token: "conflict-realview-2" },
      audit_log: { resource_type: "realview", action: "update", operation_id: "op-realview-1" },
      warnings: [],
    }]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/extended-data/get") {
    assert(body.configuration_id === "extended-1", "get_extended_data missing configuration_id");
    write_json(response, 200, agent_result("get_extended_data", "ri:extended_data.read", [{
      configuration_id: "extended-1",
      kind: "custom",
      active: true,
      schema_code: "Loan.extended-1",
      field: { feature_code: "Loan", field_display: "Watch List" },
      conflict_token: "conflict-extended-1",
    }]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/extended-data/set") {
    assert(body.operation === "upsert", "set_extended_data missing explicit upsert operation");
    assert(body.expected_conflict_token === "conflict-extended-1", "set_extended_data missing conflict token");
    if (body.dry_run === true) {
      write_json(response, 200, agent_result("set_extended_data", "ri:extended_data.write", [{ can_apply: true, errors: [], warnings: [], normalized_preview: { kind: "custom", configuration: { _id: "extended-1", ...body.field }, conflict_token: "conflict-extended-1" } }]));
      return;
    }
    assert(body.approved === true, "set_extended_data did not send approved=true");
    write_json(response, 200, agent_result("set_extended_data", "ri:extended_data.write", [{
      extended_data: { kind: "custom", configuration: { _id: "extended-1", ...body.field }, conflict_token: "conflict-extended-2" },
      audit_log: { resource_type: "extended_data", action: "update", operation_id: "op-extended-1" },
      warnings: [],
    }]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/search") {
    write_json(response, 200, agent_result("search_model_forms", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        active: true,
        global_assignment: true,
        parent_folder_id: "WORKBOOKPROCESS",
        process_type: "FORM",
        process_name: "Loan Model",
        root_feature_code: "Loan",
        map_id: "map-1",
        template_id: "template-1",
        map_node_count: 1,
        map_item_count: 1,
        conflict_token: "conflict-model-form-1",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/folders/search") {
    write_json(response, 200, agent_result("search_model_form_folders", "ri:model_forms.read", [
      {
        folder_id: "model-form-folder-agent",
        active: true,
        parent_folder_id: "WORKBOOKPROCESS",
        folder_name: "agent",
        child_folder_count: 1,
        model_form_count: 0,
        conflict_token: "conflict-model-form-folder-agent",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1") {
    write_json(response, 200, agent_result("get_model_form", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        detail_level: url.searchParams.get("detail_level") || "overview",
        sections: (url.searchParams.get("sections") || "").split(",").filter(Boolean),
        model_form: {
          model_form_id: "model-form-1",
          active: true,
          global_assignment: true,
          parent_folder_id: "WORKBOOKPROCESS",
          process_type: "FORM",
          process_name: "Loan Model",
          root_feature_code: "Loan",
          map_id: "map-1",
          template_id: "template-1",
          map_node_count: 1,
          map_item_count: 1,
          conflict_token: "conflict-model-form-1",
          template: {
            template_id: "template-1",
            template_name: "Loan Model Template",
            template_type: "EXCEL",
          },
          map: {
            map_id: "map-1",
            root_feature_code: "Loan",
            total_map_node_count: 1,
            total_map_item_count: 1,
          },
        },
        template: {
          model_form_id: "model-form-1",
          template: {
            template_id: "template-1",
            active: true,
            template_name: "Loan Model Template",
            template_type: "EXCEL",
            has_repository_file: true,
            version_count: 1,
            form_field_count: 0,
          },
        },
        map_tree: {
          model_form_id: "model-form-1",
          map_id: "map-1",
          root_node_id: "map-1",
          nodes: [
            {
              node_id: "map-1",
              node_type: "root",
              map_name: "Loan Map",
              relationship: "ROOT",
              feature_code: "Loan",
              map_item_count: 1,
            },
          ],
        },
        node: {
          node_id: "map-1",
          node_type: "root",
          map_name: "Loan Map",
          relationship: "ROOT",
          feature_code: "Loan",
          child_node_ids: [],
          map_items: [
            {
              node_id: "map-1",
              map_item_id: "map-item-1",
              map_order: 1,
              item_type: "FIELD",
              schema_code: "Loan.Balance",
              cell: "B2",
            },
          ],
        },
        item: {
          model_form_id: "model-form-1",
          map_id: "map-1",
          node_id: "map-1",
          item: {
            node_id: "map-1",
            map_item_id: "map-item-1",
            map_order: 1,
            item_type: "FIELD",
            schema_code: "Loan.Balance",
            cell: "B2",
            feature_code: "Loan",
            is_field_mapping: true,
            is_marker: false,
            pdf_field_mappings: [],
          },
        },
        used_fields: {
          model_form_id: "model-form-1",
          map_id: "map-1",
          total_node_count: 1,
          total_field_reference_count: 1,
          nodes: [
            {
              node_id: "map-1",
              feature_code: "Loan",
              map_name: "Loan Map",
              relationship: "ROOT",
              field_reference_count: 1,
              marker_count: 0,
              non_field_map_item_count: 0,
            },
          ],
          fields: [
            {
              node_id: "map-1",
              map_item_id: "map-item-1",
              map_order: 1,
              item_type: "FIELD",
              schema_code: "Loan.Balance",
              cell: "B2",
              feature_code: "Loan",
            },
          ],
        },
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/model-forms/configurations/model-form-1/validate-update") {
    assert(body.expected_conflict_token === "conflict-model-form-1", "validate_update_model_form did not send expected_conflict_token");
    write_json(response, 200, agent_result("validate_update_model_form", "ri:model_forms.write", [
      {
        can_apply: true,
        errors: [],
        warnings: [],
        normalized_preview: {
          model_form_id: "model-form-1",
          active: true,
          global_assignment: body.global_assignment,
          parent_folder_id: body.parent_folder_id,
          process_type: "FORM",
          process_name: body.process_name,
          process_description: body.process_description,
          root_feature_code: "Loan",
          map_id: "map-1",
          template_id: "template-1",
          map_node_count: 1,
          map_item_count: 1,
          conflict_token: "conflict-model-form-1",
        },
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/model-forms/configurations/model-form-1") {
    assert(body.approved === true, "update_model_form did not send approved=true");
    write_json(response, 200, agent_result("update_model_form", "ri:model_forms.write", [
      {
        model_form: {
          model_form_id: "model-form-1",
          active: true,
          global_assignment: body.global_assignment,
          parent_folder_id: body.parent_folder_id,
          process_type: "FORM",
          process_name: body.process_name,
          process_description: body.process_description,
          root_feature_code: "Loan",
          map_id: "map-1",
          template_id: "template-1",
          map_node_count: 1,
          map_item_count: 1,
          conflict_token: "conflict-model-form-2",
        },
        audit_log: {
          operation_id: "config-op-1",
          resource_family: "model_forms",
          resource_type: "model_form",
          resource_id: "model-form-1",
        },
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1/template-file") {
    write_json(response, 200, agent_result("download_model_form_template", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        template_id: "template-1",
        repository_id: "repo-template-1",
        file_name: "loan-model.xlsx",
        content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size_bytes: 17,
        download_url: `${base_url}/signed/model-form-download`,
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/signed/model-form-download") {
    response.writeHead(200, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    response.end("contract download");
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/model-forms/configurations/model-form-1/template-file/stage") {
    assert(body.approved === true, "stage_model_form_template_file did not send approved=true");
    assert(body.file_name === "loan-model.xlsx", "stage_model_form_template_file did not send file_name");
    assert(!("content_base64" in body), "stage_model_form_template_file should not send content_base64");
    write_json(response, 200, agent_result("stage_model_form_template_file", "ri:model_forms.write", [
      {
        model_form_id: "model-form-1",
        staged_file_id: "staged-file-1",
        file_name: body.file_name,
        content_type: body.content_type,
        upload_url: `${base_url}/signed/model-form-upload`,
        upload_method: "POST",
        upload_form_field: "file",
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/signed/model-form-upload") {
    assert(String(request.headers["content-type"] || "").startsWith("multipart/form-data"), "signed template upload did not use multipart/form-data");
    assert(body.__raw_text.includes("contract smoke"), "signed template upload did not include file bytes");
    write_json(response, 200, {
      model_form_id: "model-form-1",
      staged_file_id: "staged-file-1",
      file_name: "loan-model.xlsx",
      content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/model-forms/configurations/model-form-1/template-file") {
    assert(body.approved === true, "upload_model_form_template did not send approved=true");
    assert(body.staged_file_id === "staged-file-1", "upload_model_form_template did not send staged_file_id");
    assert(!("content_base64" in body), "upload_model_form_template should not send content_base64 when staged_file_id is supplied");
    assert(body.expected_conflict_token === "conflict-model-form-1", "upload_model_form_template did not send expected_conflict_token");
    write_json(response, 200, agent_result("upload_model_form_template", "ri:model_forms.write", [
      {
        model_form: {
          model_form_id: "model-form-1",
          active: true,
          process_type: "FORM",
          process_name: "Loan Model",
          root_feature_code: "Loan",
          template_file_name: "loan-model.xlsx",
          conflict_token: "conflict-model-form-3",
        },
        audit_log: {
          operation_id: "config-op-2",
          resource_family: "model_forms",
          resource_type: "model_form_template",
          resource_id: "model-form-1",
        },
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1/template") {
    write_json(response, 200, agent_result("get_model_form_template", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        template: {
          template_id: "template-1",
          active: true,
          template_name: "Loan Model Template",
          template_type: "EXCEL",
          has_repository_file: true,
          version_count: 1,
          form_field_count: 0,
        },
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1/map-tree") {
    write_json(response, 200, agent_result("get_model_form_map_tree", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        map_id: "map-1",
        root_node_id: "map-1",
        nodes: [
          {
            node_id: "map-1",
            node_type: "root",
            map_name: "Loan Map",
            relationship: "ROOT",
            feature_code: "Loan",
            map_item_count: 1,
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1/map-nodes/map-1") {
    write_json(response, 200, agent_result("get_model_form_map_node", "ri:model_forms.read", [
      {
        node_id: "map-1",
        node_type: "root",
        map_name: "Loan Map",
        relationship: "ROOT",
        feature_code: "Loan",
        child_node_ids: [],
        map_items: [
          {
            node_id: "map-1",
            map_item_id: "map-item-1",
            map_order: 1,
            item_type: "FIELD",
            schema_code: "Loan.Balance",
            cell: "B2",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1/map-nodes/map-1/map-items/map-item-1") {
    write_json(response, 200, agent_result("get_model_form_map_item", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        map_id: "map-1",
        node_id: "map-1",
        item: {
          node_id: "map-1",
          map_item_id: "map-item-1",
          map_order: 1,
          item_type: "FIELD",
          schema_code: "Loan.Balance",
          cell: "B2",
          feature_code: "Loan",
          is_field_mapping: true,
          is_marker: false,
          pdf_field_mappings: [],
        },
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/model-forms/configurations/model-form-1/used-fields") {
    write_json(response, 200, agent_result("get_model_form_used_fields", "ri:model_forms.read", [
      {
        model_form_id: "model-form-1",
        map_id: "map-1",
        total_node_count: 1,
        total_field_reference_count: 1,
        nodes: [
          {
            node_id: "map-1",
            feature_code: "Loan",
            map_name: "Loan Map",
            relationship: "ROOT",
            field_reference_count: 1,
            marker_count: 0,
            non_field_map_item_count: 0,
          },
        ],
        fields: [
          {
            node_id: "map-1",
            map_item_id: "map-item-1",
            map_order: 1,
            item_type: "FIELD",
            schema_code: "Loan.Balance",
            feature_code: "Loan",
            cell: "B2",
          },
        ],
      },
    ]));
    return;
  }

  write_json(response, 404, {
    error: "not_found",
    error_description: `${request.method} ${url.pathname} was not mocked.`,
  });
}

function agent_result(tool, required_scope, items) {
  return {
    items,
    count: items.length,
    is_truncated: false,
    provenance: {
      tool,
      source: "mock_core_api",
      required_scope,
      customer_name: CUSTOMER_NAME,
      customer_code: CUSTOMER_CODE,
      generated_at_utc: new Date().toISOString(),
    },
  };
}

async function run_node_cli(args, config_path) {
  return await new Promise((resolve, reject) => {
    const child = spawn(NODE_BIN, ["./src/ri-agent.mjs", ...args], {
      cwd: TOOLKIT_ROOT,
      env: {
        ...process.env,
        REALINSIGHT_AGENT_CONFIG: config_path,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function wait_for_child(child) {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
}

async function write_config(config_path) {
  await fs.writeFile(config_path, JSON.stringify({
    version: 1,
    active_profile: "default",
    profiles: {
      default: {
        base_url,
        client_id: "realinsight-agent-toolkit",
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
        token_type: "Bearer",
        expires_at_utc: new Date(Date.now() + 3600000).toISOString(),
        scope: SCOPES,
        customer_name: CUSTOMER_NAME,
        customer_code: CUSTOMER_CODE,
        customer_id: CUSTOMER_ID,
        user_id: USER_ID,
        updated_at_utc: new Date().toISOString(),
      },
    },
  }, null, 2));
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

async function read_request_body(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  const buffer = Buffer.concat(chunks);
  const content_type = String(request.headers["content-type"] || "");
  if (!content_type.includes("application/json")) {
    return {
      __raw_buffer: buffer,
      __raw_text: buffer.toString("utf8"),
    };
  }

  return JSON.parse(buffer.toString("utf8"));
}

function write_json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
