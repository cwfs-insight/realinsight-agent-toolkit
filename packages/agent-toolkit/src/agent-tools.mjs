import { option_bool } from "./args.mjs";
import {
  agent_auth_status,
  agent_connect_realinsight,
  agent_disconnect_realinsight,
  agent_list_profiles,
  agent_request_realinsight_scopes,
  agent_switch_profile,
} from "./auth-tools.mjs";
import { agent_get_children, agent_get_latest_children } from "./child-tools.mjs";
import { agent_get_chart_of_accounts, agent_get_coa_data, agent_set_chart_of_accounts } from "./chart-of-accounts-tools.mjs";
import { agent_search_entities } from "./entity-tools.mjs";
import { agent_get_extended_data, agent_set_extended_data } from "./extended-data-tools.mjs";
import { JsonRpcError } from "./json-rpc.mjs";
import {
  agent_create_model_form,
  agent_download_model_form_template,
  agent_get_model_form,
  agent_search_model_form_folders,
  agent_search_model_forms,
  agent_stage_model_form_template_file,
  agent_upload_model_form_template,
  agent_update_model_form,
  agent_validate_create_model_form,
  agent_validate_update_model_form,
} from "./model-form-tools.mjs";
import { agent_get_records, agent_set_record } from "./record-tools.mjs";
import { agent_execute_realview, agent_get_realviews, agent_set_realview } from "./realview-tools.mjs";
import {
  agent_create_report,
  agent_delete_report,
  agent_download_report_template,
  agent_extract_analytic_entities,
  agent_extract_workbench_entities,
  agent_get_analytic_data,
  agent_get_analytic_csv,
  agent_get_dashboard_page,
  agent_get_report,
  agent_get_workbench_data,
  agent_get_workbench_csv,
  agent_import_report_into_composite,
  agent_list_dashboard_pages,
  agent_list_workbenches,
  agent_search_report_folders,
  agent_search_reports,
  agent_stage_report_template_file,
  agent_update_report,
  agent_upload_report_template,
  agent_validate_create_report,
  agent_validate_delete_report,
  agent_validate_update_report,
} from "./report-tools.mjs";
import { agent_get_fields, agent_search_features, agent_search_fields } from "./schema-tools.mjs";
import { agent_get_entity_structure } from "./structure-tools.mjs";
import { AGENT_TOOLS } from "./tool-definitions.mjs";
import { agent_get_tool_reference } from "./tool-reference.mjs";
import { enforce_tool_result_limit } from "./tool-result-limits.mjs";

export async function call_agent_tool(name, args) {
  let payload;

  switch (name) {
    case "auth_status":
      payload = await agent_auth_status(args);
      break;
    case "list_profiles":
      payload = await agent_list_profiles(args);
      break;
    case "connect_realinsight":
      payload = await agent_connect_realinsight(args);
      break;
    case "switch_profile":
      payload = await agent_switch_profile(args);
      break;
    case "disconnect_realinsight":
      payload = await agent_disconnect_realinsight(args);
      break;
    case "request_realinsight_scopes":
      payload = await agent_request_realinsight_scopes(args);
      break;
    case "get_tool_reference":
      payload = agent_get_tool_reference(args);
      break;
    case "search_features":
      payload = await agent_search_features(args);
      break;
    case "search_fields":
      payload = await agent_search_fields(args);
      break;
    case "get_fields":
      payload = await agent_get_fields(args);
      break;
    case "search_entities":
      payload = await agent_search_entities(args);
      break;
    case "get_children":
      payload = await agent_get_children(args);
      break;
    case "get_latest_children":
      payload = await agent_get_latest_children(args);
      break;
    case "get_records":
      payload = await agent_get_records(args);
      break;
    case "set_record":
      payload = await agent_set_record(args);
      break;
    case "get_entity_structure":
      payload = await agent_get_entity_structure(args);
      break;
    case "list_dashboard_pages":
      payload = await agent_list_dashboard_pages(args);
      break;
    case "get_dashboard_page":
      payload = await agent_get_dashboard_page(args);
      break;
    case "get_analytic_data":
      payload = await agent_get_analytic_data(args);
      break;
    case "get_analytic_csv":
      payload = await agent_get_analytic_csv(args);
      break;
    case "extract_analytic_entities":
      payload = await agent_extract_analytic_entities(args);
      break;
    case "list_workbenches":
      payload = await agent_list_workbenches(args);
      break;
    case "get_workbench_data":
      payload = await agent_get_workbench_data(args);
      break;
    case "get_workbench_csv":
      payload = await agent_get_workbench_csv(args);
      break;
    case "extract_workbench_entities":
      payload = await agent_extract_workbench_entities(args);
      break;
    case "search_reports":
      payload = await agent_search_reports(args);
      break;
    case "search_report_folders":
      payload = await agent_search_report_folders(args);
      break;
    case "get_report":
      payload = await agent_get_report(args);
      break;
    case "get_chart_of_accounts":
      payload = await agent_get_chart_of_accounts(args);
      break;
    case "get_coa_data":
      payload = await agent_get_coa_data(args);
      break;
    case "set_chart_of_accounts":
      payload = await agent_set_chart_of_accounts(args);
      break;
    case "get_realviews":
      payload = await agent_get_realviews(args);
      break;
    case "execute_realview":
      payload = await agent_execute_realview(args);
      break;
    case "set_realview":
      payload = await agent_set_realview(args);
      break;
    case "get_extended_data":
      payload = await agent_get_extended_data(args);
      break;
    case "set_extended_data":
      payload = await agent_set_extended_data(args);
      break;
    case "search_model_forms":
      payload = await agent_search_model_forms(args);
      break;
    case "search_model_form_folders":
      payload = await agent_search_model_form_folders(args);
      break;
    case "get_model_form":
      payload = await agent_get_model_form(args);
      break;
    case "validate_create_model_form":
      payload = await agent_validate_create_model_form(args);
      break;
    case "create_model_form":
      payload = await agent_create_model_form(args);
      break;
    case "validate_update_model_form":
      payload = await agent_validate_update_model_form(args);
      break;
    case "update_model_form":
      payload = await agent_update_model_form(args);
      break;
    case "download_model_form_template":
      payload = await agent_download_model_form_template(args);
      break;
    case "stage_model_form_template_file":
      payload = await agent_stage_model_form_template_file(args);
      break;
    case "upload_model_form_template":
      payload = await agent_upload_model_form_template(args);
      break;
    case "validate_create_report":
      payload = await agent_validate_create_report(args);
      break;
    case "validate_update_report":
      payload = await agent_validate_update_report(args);
      break;
    case "validate_delete_report":
      payload = await agent_validate_delete_report(args);
      break;
    case "create_report":
      payload = await agent_create_report(args);
      break;
    case "update_report":
      payload = await agent_update_report(args);
      break;
    case "delete_report":
      payload = await agent_delete_report(args);
      break;
    case "download_report_template":
      payload = await agent_download_report_template(args);
      break;
    case "import_report_into_composite":
      payload = await agent_import_report_into_composite(args);
      break;
    case "stage_report_template_file":
      payload = await agent_stage_report_template_file(args);
      break;
    case "upload_report_template":
      payload = await agent_upload_report_template(args);
      break;
    default:
      throw new JsonRpcError(-32602, `Unknown tool: ${name}`);
  }

  return enforce_tool_result_limit(name, payload);
}

export function print_tools(options) {
  const tools = AGENT_TOOLS.map((tool) => ({
    name: tool.name,
    cli: tool.cli,
    route: tool.route,
    scope: tool.scope,
    description: tool.description,
  }));

  if (option_bool(options, "json", false)) {
    console.log(JSON.stringify({ tools }, null, 2));
    return;
  }

  for (const tool of tools) {
    console.log(`${tool.name}`);
    console.log(`  ${tool.description}`);
    console.log(`  CLI: ${tool.cli}`);
    console.log(`  Route: ${tool.route}`);
    console.log(`  Scope: ${tool.scope}`);
  }
}
