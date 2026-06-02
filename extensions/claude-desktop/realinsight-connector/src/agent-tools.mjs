import { option_bool } from "./args.mjs";
import {
  agent_auth_status,
  agent_connect_realinsight,
  agent_disconnect_realinsight,
  agent_request_realinsight_scopes,
} from "./auth-tools.mjs";
import { agent_get_children, agent_get_latest_children } from "./child-tools.mjs";
import { agent_search_entities } from "./entity-tools.mjs";
import { JsonRpcError } from "./json-rpc.mjs";
import { agent_get_pipeline, agent_queue_pipeline } from "./pipeline-tools.mjs";
import { agent_get_records, agent_set_record } from "./record-tools.mjs";
import {
  agent_extract_analytic_entities,
  agent_extract_workbench_entities,
  agent_get_analytic_data,
  agent_get_analytic_csv,
  agent_get_dashboard_page,
  agent_get_workbench_data,
  agent_get_workbench_csv,
  agent_list_dashboard_pages,
  agent_list_workbenches,
} from "./report-tools.mjs";
import { agent_get_fields, agent_search_features, agent_search_fields } from "./schema-tools.mjs";
import { agent_get_entity_structure } from "./structure-tools.mjs";
import { AGENT_TOOLS } from "./tool-definitions.mjs";
import { enforce_tool_result_limit } from "./tool-result-limits.mjs";

export async function call_agent_tool(name, args) {
  let payload;

  switch (name) {
    case "auth_status":
      payload = await agent_auth_status(args);
      break;
    case "connect_realinsight":
      payload = await agent_connect_realinsight(args);
      break;
    case "disconnect_realinsight":
      payload = await agent_disconnect_realinsight(args);
      break;
    case "request_realinsight_scopes":
      payload = await agent_request_realinsight_scopes(args);
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
    case "get_pipeline":
      payload = await agent_get_pipeline(args);
      break;
    case "queue_pipeline":
      payload = await agent_queue_pipeline(args);
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
