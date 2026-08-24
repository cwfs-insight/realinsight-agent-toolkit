#!/usr/bin/env node

import { parse_args } from "./args.mjs";
import { print_tools } from "./agent-tools.mjs";
import { login, list_profiles, logout, status } from "./auth.mjs";
import { get_children, get_latest_children } from "./child-tools.mjs";
import { get_chart_of_accounts, get_coa_data, set_chart_of_accounts } from "./chart-of-accounts-tools.mjs";
import { doctor } from "./doctor.mjs";
import { search_entities } from "./entity-tools.mjs";
import { get_extended_data, set_extended_data } from "./extended-data-tools.mjs";
import { format_error_message, HttpJsonError } from "./http.mjs";
import { start_mcp_server } from "./mcp-server.mjs";
import {
  create_model_form,
  download_model_form_template,
  get_model_form,
  search_model_form_folders,
  search_model_forms,
  stage_model_form_template_file,
  upload_model_form_template,
  update_model_form,
  validate_create_model_form,
  validate_update_model_form,
} from "./model-form-tools.mjs";
import { get_records, set_record } from "./record-tools.mjs";
import { execute_realview, get_realviews, set_realview } from "./realview-tools.mjs";
import {
  create_report,
  delete_report,
  download_report_template,
  extract_analytic_entities,
  extract_workbench_entities,
  get_analytic_data,
  get_analytic_csv,
  get_dashboard_page,
  get_report,
  get_workbench_data,
  get_workbench_csv,
  import_report_into_composite,
  list_dashboard_pages,
  list_workbenches,
  search_report_folders,
  search_reports,
  stage_report_template_file,
  update_report,
  upload_report_template,
  validate_create_report,
  validate_delete_report,
  validate_update_report,
} from "./report-tools.mjs";
import { get_fields, search_features, search_fields } from "./schema-tools.mjs";
import { get_entity_structure } from "./structure-tools.mjs";
import {
  CONFIG_PATH,
  CHART_OF_ACCOUNTS_WRITE_SCOPE,
  DEFAULT_BASE_URL,
  DEFAULT_CLIENT_ID,
  MODEL_FORMS_READ_SCOPE,
  MODEL_FORMS_WRITE_SCOPE,
  REALVIEWS_READ_SCOPE,
  REALVIEWS_WRITE_SCOPE,
  EXTENDED_DATA_READ_SCOPE,
  EXTENDED_DATA_WRITE_SCOPE,
  SCHEMA_READ_SCOPE,
  WRITE_TOOLS_ENABLED,
} from "./tool-definitions.mjs";

async function main() {
  const parsed = parse_args(process.argv.slice(2));
  const command = parsed.positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_help();
    return;
  }

  if (command === "auth") {
    await run_auth_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "login") {
    await login(parsed.options);
    return;
  }

  if (command === "status") {
    await status(parsed.options);
    return;
  }

  if (command === "doctor") {
    await doctor(parsed.options);
    return;
  }

  if (command === "schema") {
    await run_schema_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "reports" || command === "analytics") {
    await run_report_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "model-forms" || command === "model_forms" || command === "models") {
    await run_model_form_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "chart-of-accounts" || command === "chart_of_accounts" || command === "coa") {
    await run_chart_of_accounts_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "realviews" || command === "real-views" || command === "real_views") {
    await run_realview_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "extended-data" || command === "extended_data" || command === "xd") {
    await run_extended_data_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-features" || command === "search_features") {
    await search_features(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-fields" || command === "search_fields") {
    await search_fields(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-fields" || command === "get_fields") {
    await get_fields(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-entities" || command === "search_entities") {
    await search_entities(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-children" || command === "get_children") {
    await get_children(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-latest-children" || command === "get_latest_children") {
    await get_latest_children(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-records" || command === "get_records") {
    await get_records(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "set-record" || command === "set_record") {
    assert_write_tools_enabled();
    await set_record(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-entity-structure" || command === "get_entity_structure" || command === "get-structure" || command === "get_structure") {
    await get_entity_structure(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "list-dashboard-pages" || command === "list_dashboard_pages") {
    await list_dashboard_pages(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-dashboard-page" || command === "get_dashboard_page") {
    await get_dashboard_page(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-analytic-data" || command === "get_analytic_data") {
    await get_analytic_data(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-analytic-csv" || command === "get_analytic_csv") {
    await get_analytic_csv(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "extract-analytic-entities" || command === "extract_analytic_entities") {
    await extract_analytic_entities(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "list-workbenches" || command === "list_workbenches") {
    await list_workbenches(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-workbench-data" || command === "get_workbench_data") {
    await get_workbench_data(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-workbench-csv" || command === "get_workbench_csv") {
    await get_workbench_csv(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "extract-workbench-entities" || command === "extract_workbench_entities") {
    await extract_workbench_entities(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-reports" || command === "search_reports" || command === "search-report-configurations") {
    await search_reports(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-report-folders" || command === "search_report_folders") {
    await search_report_folders(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-report" || command === "get_report" || command === "get-report-configuration") {
    await get_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-chart-of-accounts" || command === "get_chart_of_accounts" || command === "get-coa" || command === "get_coa") {
    await get_chart_of_accounts(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-coa-data" || command === "get_coa_data") {
    await get_coa_data(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "set-chart-of-accounts" || command === "set_chart_of_accounts" || command === "set-coa" || command === "set_coa") {
    assert_write_tools_enabled();
    await set_chart_of_accounts(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-realviews" || command === "get_realviews") {
    await get_realviews(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "execute-realview" || command === "execute_realview") {
    await execute_realview(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "set-realview" || command === "set_realview") {
    assert_write_tools_enabled();
    await set_realview(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-extended-data" || command === "get_extended_data") {
    await get_extended_data(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "set-extended-data" || command === "set_extended_data") {
    assert_write_tools_enabled();
    await set_extended_data(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-model-forms" || command === "search_model_forms" || command === "search-model-form-configurations") {
    await search_model_forms(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "search-model-form-folders" || command === "search_model_form_folders") {
    await search_model_form_folders(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-model-form" || command === "get_model_form" || command === "get-model-form-configuration") {
    await get_model_form(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "get-model-form-template" || command === "get_model_form_template") {
    await get_model_form(parsed.positionals.slice(1), { ...parsed.options, sections: "template" });
    return;
  }

  if (command === "get-model-form-map-tree" || command === "get_model_form_map_tree") {
    await get_model_form(parsed.positionals.slice(1), { ...parsed.options, sections: "map_tree" });
    return;
  }

  if (command === "get-model-form-map-node" || command === "get_model_form_map_node") {
    await get_model_form(parsed.positionals.slice(1), {
      ...parsed.options,
      sections: "node",
      "node-id": parsed.options["node-id"] || parsed.options.node_id || parsed.positionals[2],
    });
    return;
  }

  if (command === "get-model-form-map-item" || command === "get_model_form_map_item") {
    await get_model_form(parsed.positionals.slice(1), {
      ...parsed.options,
      sections: "item",
      "node-id": parsed.options["node-id"] || parsed.options.node_id || parsed.positionals[2],
      "map-item-id": parsed.options["map-item-id"] || parsed.options.map_item_id || parsed.positionals[3],
    });
    return;
  }

  if (command === "get-model-form-used-fields" || command === "get_model_form_used_fields") {
    await get_model_form(parsed.positionals.slice(1), { ...parsed.options, sections: "used_fields" });
    return;
  }

  if (command === "validate-create-model-form" || command === "validate_create_model_form") {
    assert_write_tools_enabled();
    await validate_create_model_form(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "create-model-form" || command === "create_model_form") {
    assert_write_tools_enabled();
    await create_model_form(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "validate-update-model-form" || command === "validate_update_model_form") {
    assert_write_tools_enabled();
    await validate_update_model_form(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "update-model-form" || command === "update_model_form") {
    assert_write_tools_enabled();
    await update_model_form(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "download-model-form-template" || command === "download_model_form_template") {
    await download_model_form_template(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "stage-model-form-template" || command === "stage_model_form_template" || command === "stage-model-form-template-file" || command === "stage_model_form_template_file") {
    assert_write_tools_enabled();
    await stage_model_form_template_file(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "upload-model-form-template" || command === "upload_model_form_template") {
    assert_write_tools_enabled();
    await upload_model_form_template(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "validate-create-report" || command === "validate_create_report" || command === "validate-create-report-configuration") {
    assert_write_tools_enabled();
    await validate_create_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "validate-update-report" || command === "validate_update_report" || command === "validate-update-report-configuration") {
    assert_write_tools_enabled();
    await validate_update_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "validate-delete-report" || command === "validate_delete_report" || command === "validate-delete-report-configuration") {
    assert_write_tools_enabled();
    await validate_delete_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "create-report" || command === "create_report" || command === "create-report-configuration") {
    assert_write_tools_enabled();
    await create_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "update-report" || command === "update_report" || command === "update-report-configuration") {
    assert_write_tools_enabled();
    await update_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "delete-report" || command === "delete_report" || command === "delete-report-configuration") {
    assert_write_tools_enabled();
    await delete_report(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "download-report-template" || command === "download_report_template") {
    await download_report_template(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "import-report-into-composite" || command === "import_report_into_composite") {
    assert_write_tools_enabled();
    await import_report_into_composite(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "stage-report-template" || command === "stage_report_template" || command === "stage_report_template_file") {
    assert_write_tools_enabled();
    await stage_report_template_file(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "upload-report-template" || command === "upload_report_template") {
    assert_write_tools_enabled();
    await upload_report_template(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "tools") {
    print_tools(parsed.options);
    return;
  }

  if (command === "logout") {
    await logout(parsed.options);
    return;
  }

  if (command === "mcp") {
    await start_mcp_server();
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function run_auth_command(positionals, options) {
  const command = positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_help();
    return;
  }

  if (command === "login") {
    await login(options);
    return;
  }

  if (command === "status") {
    await status(options);
    return;
  }

  if (command === "doctor") {
    await doctor(options);
    return;
  }

  if (command === "logout") {
    await logout(options);
    return;
  }

  if (command === "list") {
    await list_profiles(options);
    return;
  }

  throw new Error(`Unknown auth command: ${command}`);
}

async function run_schema_command(positionals, options) {
  const command = positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_schema_help();
    return;
  }

  if (command === "search-features" || command === "search_features" || command === "features") {
    await search_features(positionals.slice(1), options);
    return;
  }

  if (command === "search-fields" || command === "search_fields" || command === "fields-search") {
    await search_fields(positionals.slice(1), options);
    return;
  }

  if (command === "get-fields" || command === "get_fields" || command === "fields") {
    await get_fields(positionals.slice(1), options);
    return;
  }

  throw new Error(`Unknown schema command: ${command}`);
}

async function run_model_form_command(positionals, options) {
  const command = positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_model_form_help();
    return;
  }

  if (command === "search" || command === "search-model-forms" || command === "search-configurations" || command === "search_model_forms") {
    await search_model_forms(positionals.slice(1), options);
    return;
  }

  if (command === "folders" || command === "search-folders" || command === "search-model-form-folders" || command === "search_model_form_folders") {
    await search_model_form_folders(positionals.slice(1), options);
    return;
  }

  if (command === "get" || command === "get-model-form" || command === "configuration" || command === "get-model-form-configuration" || command === "get_model_form") {
    await get_model_form(positionals.slice(1), options);
    return;
  }

  if (command === "template" || command === "get-template" || command === "get_model_form_template") {
    await get_model_form(positionals.slice(1), { ...options, sections: "template" });
    return;
  }

  if (command === "map-tree" || command === "tree" || command === "get_model_form_map_tree") {
    await get_model_form(positionals.slice(1), { ...options, sections: "map_tree" });
    return;
  }

  if (command === "map-node" || command === "node" || command === "get_model_form_map_node") {
    await get_model_form(positionals.slice(1), { ...options, sections: "node", "node-id": options["node-id"] || options.node_id || positionals[2] });
    return;
  }

  if (command === "map-item" || command === "item" || command === "get_model_form_map_item") {
    await get_model_form(positionals.slice(1), {
      ...options,
      sections: "item",
      "node-id": options["node-id"] || options.node_id || positionals[2],
      "map-item-id": options["map-item-id"] || options.map_item_id || positionals[3],
    });
    return;
  }

  if (command === "used-fields" || command === "fields" || command === "get_model_form_used_fields") {
    await get_model_form(positionals.slice(1), { ...options, sections: "used_fields" });
    return;
  }

  if (command === "validate-create" || command === "validate-create-model-form" || command === "validate_create_model_form") {
    assert_write_tools_enabled();
    await validate_create_model_form(positionals.slice(1), options);
    return;
  }

  if (command === "create" || command === "create-model-form" || command === "create_model_form") {
    assert_write_tools_enabled();
    await create_model_form(positionals.slice(1), options);
    return;
  }

  if (command === "validate-update" || command === "validate-update-model-form" || command === "validate_update_model_form") {
    assert_write_tools_enabled();
    await validate_update_model_form(positionals.slice(1), options);
    return;
  }

  if (command === "update" || command === "update-model-form" || command === "update_model_form") {
    assert_write_tools_enabled();
    await update_model_form(positionals.slice(1), options);
    return;
  }

  if (command === "download-template" || command === "download-model-form-template" || command === "download_model_form_template") {
    await download_model_form_template(positionals.slice(1), options);
    return;
  }

  if (command === "stage-template" || command === "stage-model-form-template" || command === "stage_model_form_template" || command === "stage-model-form-template-file" || command === "stage_model_form_template_file") {
    assert_write_tools_enabled();
    await stage_model_form_template_file(positionals.slice(1), options);
    return;
  }

  if (command === "upload-template" || command === "upload-model-form-template" || command === "upload_model_form_template") {
    assert_write_tools_enabled();
    await upload_model_form_template(positionals.slice(1), options);
    return;
  }

  throw new Error(`Unknown model-forms command: ${command}`);
}

async function run_chart_of_accounts_command(positionals, options) {
  const command = positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_chart_of_accounts_help();
    return;
  }

  if (command === "get" || command === "get-chart-of-accounts" || command === "get_chart_of_accounts" || command === "configuration") {
    await get_chart_of_accounts(positionals.slice(1), options);
    return;
  }

  if (command === "data" || command === "get-data" || command === "get_coa_data") {
    await get_coa_data(positionals.slice(1), options);
    return;
  }

  if (command === "set" || command === "set-chart-of-accounts" || command === "set_chart_of_accounts") {
    assert_write_tools_enabled();
    await set_chart_of_accounts(positionals.slice(1), options);
    return;
  }

  throw new Error(`Unknown chart-of-accounts command: ${command}`);
}

async function run_realview_command(positionals, options) {
  const command = positionals[0];
  if (!command || command === "help") {
    console.log(`Realinsight RealVIEW commands\n\n  ri-agent realviews get [REALVIEW_ID]\n  ri-agent realviews execute REALVIEW_ID ENTITY_ID [ENTITY_ID ...]\n  ri-agent realviews set [REALVIEW_ID] --request-json JSON --approved\n\nRead scope: ${REALVIEWS_READ_SCOPE}\nWrite scope: ${REALVIEWS_WRITE_SCOPE}`);
    return;
  }
  if (command === "get") return await get_realviews(positionals.slice(1), options);
  if (command === "execute") return await execute_realview(positionals.slice(1), options);
  if (command === "set") {
    assert_write_tools_enabled();
    return await set_realview(positionals.slice(1), options);
  }
  throw new Error(`Unknown realviews command: ${command}`);
}

async function run_extended_data_command(positionals, options) {
  const command = positionals[0];
  if (!command || command === "help") {
    console.log(`Realinsight Extended Data commands\n\n  ri-agent extended-data get [CONFIGURATION_ID]\n  ri-agent extended-data set [CONFIGURATION_ID] --request-json JSON --approved\n\nRead scope: ${EXTENDED_DATA_READ_SCOPE}\nWrite scope: ${EXTENDED_DATA_WRITE_SCOPE}`);
    return;
  }
  if (command === "get") return await get_extended_data(positionals.slice(1), options);
  if (command === "set") {
    assert_write_tools_enabled();
    return await set_extended_data(positionals.slice(1), options);
  }
  throw new Error(`Unknown extended-data command: ${command}`);
}

async function run_report_command(positionals, options) {
  const command = positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_report_help();
    return;
  }

  if (command === "list-dashboard-pages" || command === "list_dashboard_pages" || command === "dashboards") {
    await list_dashboard_pages(positionals.slice(1), options);
    return;
  }

  if (command === "get-dashboard-page" || command === "get_dashboard_page" || command === "dashboard") {
    await get_dashboard_page(positionals.slice(1), options);
    return;
  }

  if (command === "get-analytic-data" || command === "get_analytic_data" || command === "analytic-data") {
    await get_analytic_data(positionals.slice(1), options);
    return;
  }

  if (command === "get-analytic-csv" || command === "get_analytic_csv" || command === "analytic-csv") {
    await get_analytic_csv(positionals.slice(1), options);
    return;
  }

  if (command === "extract-analytic-entities" || command === "extract_analytic_entities" || command === "analytic-entities") {
    await extract_analytic_entities(positionals.slice(1), options);
    return;
  }

  if (command === "list-workbenches" || command === "list_workbenches" || command === "workbenches") {
    await list_workbenches(positionals.slice(1), options);
    return;
  }

  if (command === "get-workbench-data" || command === "get_workbench_data" || command === "workbench-data") {
    await get_workbench_data(positionals.slice(1), options);
    return;
  }

  if (command === "get-workbench-csv" || command === "get_workbench_csv" || command === "workbench-csv") {
    await get_workbench_csv(positionals.slice(1), options);
    return;
  }

  if (command === "extract-workbench-entities" || command === "extract_workbench_entities" || command === "workbench-entities") {
    await extract_workbench_entities(positionals.slice(1), options);
    return;
  }

  if (command === "search-reports" || command === "search_reports" || command === "search-report-configurations" || command === "search-configurations" || command === "search") {
    await search_reports(positionals.slice(1), options);
    return;
  }

  if (command === "folders" || command === "search-folders" || command === "search-report-folders" || command === "search_report_folders") {
    await search_report_folders(positionals.slice(1), options);
    return;
  }

  if (command === "get-report" || command === "get_report" || command === "get-report-configuration" || command === "configuration" || command === "get") {
    await get_report(positionals.slice(1), options);
    return;
  }

  if (command === "validate-create-report" || command === "validate_create_report" || command === "validate-create-report-configuration" || command === "validate-create") {
    assert_write_tools_enabled();
    await validate_create_report(positionals.slice(1), options);
    return;
  }

  if (command === "validate-update-report" || command === "validate_update_report" || command === "validate-update-report-configuration" || command === "validate-update") {
    assert_write_tools_enabled();
    await validate_update_report(positionals.slice(1), options);
    return;
  }

  if (command === "validate-delete-report" || command === "validate_delete_report" || command === "validate-delete-report-configuration" || command === "validate-delete") {
    assert_write_tools_enabled();
    await validate_delete_report(positionals.slice(1), options);
    return;
  }

  if (command === "create-report" || command === "create_report" || command === "create-report-configuration" || command === "create") {
    assert_write_tools_enabled();
    await create_report(positionals.slice(1), options);
    return;
  }

  if (command === "update-report" || command === "update_report" || command === "update-report-configuration" || command === "update") {
    assert_write_tools_enabled();
    await update_report(positionals.slice(1), options);
    return;
  }

  if (command === "delete-report" || command === "delete_report" || command === "delete-report-configuration" || command === "delete") {
    assert_write_tools_enabled();
    await delete_report(positionals.slice(1), options);
    return;
  }

  if (command === "download-report-template" || command === "download_report_template" || command === "download-template") {
    await download_report_template(positionals.slice(1), options);
    return;
  }

  if (command === "import-report-into-composite" || command === "import_report_into_composite" || command === "import-into-composite" || command === "import") {
    assert_write_tools_enabled();
    await import_report_into_composite(positionals.slice(1), options);
    return;
  }

  if (command === "stage-report-template" || command === "stage_report_template" || command === "stage-template") {
    assert_write_tools_enabled();
    await stage_report_template_file(positionals.slice(1), options);
    return;
  }

  if (command === "upload-report-template" || command === "upload_report_template" || command === "upload-template") {
    assert_write_tools_enabled();
    await upload_report_template(positionals.slice(1), options);
    return;
  }

  throw new Error(`Unknown reports command: ${command}`);
}

function print_help() {
  const write_help = WRITE_TOOLS_ENABLED
    ? `  ri-agent set-record ENTITY_ID --record-json JSON --approved [--update-fields A,B] [--table]
  ri-agent set-chart-of-accounts [COA_ID] --request-json JSON --approved
  ri-agent set-realview [REALVIEW_ID] --request-json JSON --approved
  ri-agent set-extended-data [CONFIGURATION_ID] --request-json JSON --approved
  ri-agent validate-create-report --request-json JSON [--table]
  ri-agent validate-update-report REPORT_ID --request-json JSON [--expected-conflict-token TOKEN] [--table]
  ri-agent import-report-into-composite COMPOSITE_REPORT_ID SOURCE_REPORT_ID --expected-conflict-token TOKEN --approved
  ri-agent stage-report-template REPORT_ID --file-path ./template.xlsx --approved
  ri-agent upload-report-template REPORT_ID --file-path ./template.xlsx --expected-conflict-token TOKEN --approved
  ri-agent validate-delete-report REPORT_ID --expected-conflict-token TOKEN [--table]
  ri-agent create-report --request-json JSON --approved [--table]
  ri-agent update-report REPORT_ID --request-json JSON --expected-conflict-token TOKEN --approved [--table]
  ri-agent delete-report REPORT_ID --expected-conflict-token TOKEN --approved [--table]
  ri-agent validate-update-model-form MODEL_FORM_ID --request-json JSON [--expected-conflict-token TOKEN] [--table]
  ri-agent update-model-form MODEL_FORM_ID --request-json JSON --expected-conflict-token TOKEN --approved [--table]
`
    : "";

  console.log(`Realinsight Agent Toolkit

Usage:
  ri-agent auth login [--base-url URL] [--profile NAME] [--client-id ID] [--scope SCOPE] [--no-browser]
  ri-agent auth status [--profile NAME] [--json]
  ri-agent auth doctor [--profile NAME] [--json]
  ri-agent auth list [--json]
  ri-agent auth logout [--profile NAME]
  ri-agent doctor [--profile NAME] [--json]
  ri-agent search-features QUERY [--profile NAME] [--limit N] [--type MASTER|DEPENDENT] [--include-virtuals] [--table]
  ri-agent search-fields QUERY [--profile NAME] [--feature-code CODE] [--limit N] [--postable-only] [--table]
  ri-agent get-fields FEATURE_CODE [--profile NAME] [--limit N] [--cursor CURSOR] [--postable-only] [--table]
  ri-agent search-entities QUERY [--profile NAME] [--schema-code CODE|--schema-codes A.B,C.D|--feature-code CODE --field-names A,B] [--exact] [--table]
  ri-agent get-children --feature-code CODE --parent-ids ID1,ID2 [--limit N|--limit-per-parent N] [--sort 'Field|desc'] [--filter 'Field|Value|eq'] [--table]
  ri-agent get-latest-children --feature-code CODE --parent-ids ID1,ID2 --mode-field DateField [--table]
  ri-agent get-records --feature-code CODE --entity-ids ID1,ID2 [--field-profile key_fields|--fields A,B|--schema-codes F.A,F.B] [--table]
${write_help.trimEnd()}
  ri-agent get-entity-structure --traversal parent --entity-ids ID1,ID2 [--feature-code CODE|--feature-codes A,B] [--table]
  ri-agent list-dashboard-pages [--limit N] [--cursor CURSOR] [--table]
  ri-agent get-dashboard-page PAGE_ID [--table]
  ri-agent get-analytic-data ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent get-analytic-csv ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--raw]
  ri-agent extract-analytic-entities ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent list-workbenches [--workbench-code CODE] [--limit N] [--cursor CURSOR] [--table]
  ri-agent get-workbench-data WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent get-workbench-csv WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--raw]
  ri-agent extract-workbench-entities WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent search-reports [--report-type LIST] [--search-text TEXT] [--table]
  ri-agent search-report-folders [--parent-folder-id REPORT] [--table]
  ri-agent get-report REPORT_ID [--table]
  ri-agent download-report-template REPORT_ID --output-path ./template.xlsx
  ri-agent get-chart-of-accounts [COA_ID|--coa-data-id ID|--search-text TEXT]
  ri-agent get-realviews [REALVIEW_ID|--root-feature-code CODE|--search-text TEXT]
  ri-agent execute-realview REALVIEW_ID ENTITY_ID [ENTITY_ID ...]
  ri-agent get-extended-data [CONFIGURATION_ID|--feature-code CODE|--schema-code CODE|--kind custom|overlay]
  ri-agent search-model-forms [--root-feature-code CODE] [--search-text TEXT] [--table]
  ri-agent search-model-form-folders [--parent-folder-id WORKBOOKPROCESS] [--table]
  ri-agent get-model-form MODEL_FORM_ID [--sections template,map_tree,used_fields] [--detail-level overview|map|node|item|full] [--table]
  ri-agent stage-model-form-template MODEL_FORM_ID --file-path ./template.xlsx --approved
  ri-agent upload-model-form-template MODEL_FORM_ID --file-path ./template.xlsx --expected-conflict-token TOKEN --approved
  ri-agent model-forms <search|folders|get|validate-create|create|validate-update|update|download-template|stage-template|upload-template> ...
  ri-agent chart-of-accounts <get|set> ...
  ri-agent realviews <get|execute|set> ...
  ri-agent extended-data <get|set> ...
  ri-agent reports <list-dashboard-pages|get-dashboard-page|get-analytic-data|get-analytic-csv|extract-analytic-entities|list-workbenches|get-workbench-data|get-workbench-csv|extract-workbench-entities|search|folders|get|validate-create|validate-update|validate-delete|create|update|delete|import-into-composite|download-template|stage-template|upload-template> ...
  ri-agent schema <search-features|search-fields|get-fields> ...
  ri-agent tools
  ri-agent mcp

Environment:
  RI_AGENT_BASE_URL        Default Core API base URL. Defaults to ${DEFAULT_BASE_URL}
  RI_AGENT_CLIENT_ID       OAuth client id. Defaults to ${DEFAULT_CLIENT_ID}
  REALINSIGHT_AGENT_CONFIG Credential file path. Defaults to ${CONFIG_PATH}
  RI_AGENT_ENABLE_WRITE_TOOLS Set to 0 to hide completed write commands/tools from the local inventory.
`);
}

function assert_write_tools_enabled() {
  if (WRITE_TOOLS_ENABLED) return;

  throw new Error("Write tools are currently disabled. Unset RI_AGENT_ENABLE_WRITE_TOOLS or set it to 1, and ensure AgentToolkit:EnableWriteTools is enabled in Core API to use them.");
}

function print_schema_help() {
  console.log(`Realinsight Agent Toolkit schema commands

Usage:
  ri-agent schema search-features QUERY [--limit N] [--type MASTER|DEPENDENT] [--include-virtuals]
  ri-agent schema search-fields QUERY [--feature-code CODE] [--limit N] [--postable-only]
  ri-agent schema get-fields FEATURE_CODE [--limit N] [--cursor CURSOR] [--postable-only]

Output is JSON by default. Add --table for a compact human-readable table.
All commands use the active auth profile unless --profile NAME is supplied.
Required OAuth scope: ${SCHEMA_READ_SCOPE}
`);
}

function print_model_form_help() {
  const model_form_write_help = WRITE_TOOLS_ENABLED
    ? `  ri-agent model-forms validate-create --request-json JSON [--table]
  ri-agent model-forms create --request-json JSON --approved [--table]
  ri-agent model-forms validate-update MODEL_FORM_ID --request-json JSON [--expected-conflict-token TOKEN] [--table]
  ri-agent model-forms update MODEL_FORM_ID --request-json JSON --expected-conflict-token TOKEN --approved [--table]
  ri-agent model-forms upload-template MODEL_FORM_ID --file-path ./template.xlsx --expected-conflict-token TOKEN --approved [--table]
`
    : "";

  console.log(`Realinsight Agent Toolkit model form commands

Usage:
  ri-agent model-forms search [--root-feature-code CODE] [--search-text TEXT] [--limit N] [--cursor CURSOR] [--table]
  ri-agent model-forms folders [--parent-folder-id WORKBOOKPROCESS] [--limit N] [--cursor CURSOR] [--table]
  ri-agent model-forms get MODEL_FORM_ID [--sections template,map_tree,map_definition,node,item,used_fields] [--detail-level overview|map|definition|node|item|full] [--node-id NODE_ID] [--map-item-id MAP_ITEM_ID] [--table]
  ri-agent model-forms download-template MODEL_FORM_ID --output-path ./template.xlsx [--table]
${model_form_write_help}

Model form maps are returned as flat node ids so deeply nested embedded maps do not require recursive JSON.
Use get with focused sections so agents do not need separate template/map/node/item tools.
Use source_model_form_id in create requests to make derivative copies from existing model forms.
Write commands require explicit approval. Request map_definition only when changing map nodes/items; use download-template/upload-template for Excel template changes.
Required OAuth scopes: ${MODEL_FORMS_READ_SCOPE}${WRITE_TOOLS_ENABLED ? `, ${MODEL_FORMS_WRITE_SCOPE} for writes` : ""}
`);
}

function print_chart_of_accounts_help() {
  const write_help = WRITE_TOOLS_ENABLED
    ? `  ri-agent chart-of-accounts set [COA_ID] --request-json JSON --expected-conflict-token TOKEN --approved
`
    : "";

  console.log(`Realinsight Agent Toolkit chart of accounts commands

Usage:
  ri-agent chart-of-accounts get [COA_ID] [--search-text TEXT] [--item-types ACCT,LABEL,COMPUTE] [--account-types REV,EXP]
  ri-agent chart-of-accounts get-data COA_DATA_ID [--projection summary|values] [--cursor CURSOR] [--limit N]
${write_help}

Use get-data when an accounts record field returns a raw COAData id. It returns a compact summary or bounded flat values rather than the persisted nested object.
Use set with dry_run=true before saving metadata, availability, rollup, external mapping, add/update/remove/move account operations.
Required OAuth scopes: authenticated Realinsight context${WRITE_TOOLS_ENABLED ? `, ${CHART_OF_ACCOUNTS_WRITE_SCOPE} for writes` : ""}
`);
}

function print_report_help() {
  const report_write_help = WRITE_TOOLS_ENABLED
    ? `  ri-agent reports validate-create --request-json JSON [--table]
  ri-agent reports validate-update REPORT_ID --request-json JSON [--expected-conflict-token TOKEN] [--table]
  ri-agent reports validate-delete REPORT_ID --expected-conflict-token TOKEN [--table]
  ri-agent reports create --request-json JSON --approved [--table]
  ri-agent reports update REPORT_ID --request-json JSON --expected-conflict-token TOKEN --approved [--table]
  ri-agent reports delete REPORT_ID --expected-conflict-token TOKEN --approved [--table]
  ri-agent reports import-into-composite COMPOSITE_REPORT_ID SOURCE_REPORT_ID --expected-conflict-token TOKEN --approved [--table]
  ri-agent reports stage-template REPORT_ID --file-path ./template.xlsx --approved [--table]
  ri-agent reports upload-template REPORT_ID --file-path ./template.xlsx --expected-conflict-token TOKEN --approved [--table]
`
    : "";

  console.log(`Realinsight Agent Toolkit report, analytic, and workbench commands

Usage:
  ri-agent reports list-dashboard-pages [--limit N] [--cursor CURSOR] [--table]
  ri-agent reports get-dashboard-page PAGE_ID [--table]
  ri-agent reports get-analytic-data ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent reports get-analytic-csv ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--raw]
  ri-agent reports extract-analytic-entities ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent reports list-workbenches [--workbench-code CODE] [--limit N] [--cursor CURSOR] [--table]
  ri-agent reports get-workbench-data WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent reports get-workbench-csv WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--raw]
  ri-agent reports extract-workbench-entities WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--table]
  ri-agent reports search [--report-type LIST] [--search-text TEXT] [--table]
  ri-agent reports folders [--parent-folder-id REPORT] [--limit N] [--cursor CURSOR] [--table]
  ri-agent reports get REPORT_ID [--table]
  ri-agent reports download-template REPORT_ID --output-path ./template.xlsx [--table]
${report_write_help.trimEnd()}

Cached analytic and workbench tables can be large. Prefer paging results into a temporary CSV/JSONL/SQLite file for multi-page analysis.
LIST reports define one table. COMPOSITE reports place independent LIST outputs in a custom Excel workbook; use import-into-composite for existing reports so all owned ids are regenerated.
Report writes are side effects. Call get first for the latest conflict token, validate before saving, and use --approved only after explicit user approval.
`);
}

main().catch((error) => {
  if (error instanceof HttpJsonError) {
    console.error(`${error.error}: ${error.description}`);
  }
  else {
    console.error(format_error_message(error));
  }

  process.exitCode = 1;
});
