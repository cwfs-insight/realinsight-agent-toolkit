#!/usr/bin/env node

import { parse_args } from "./args.mjs";
import { print_tools } from "./agent-tools.mjs";
import { login, list_profiles, logout, status } from "./auth.mjs";
import { get_children, get_latest_children } from "./child-tools.mjs";
import { doctor } from "./doctor.mjs";
import { search_entities } from "./entity-tools.mjs";
import { format_error_message, HttpJsonError } from "./http.mjs";
import { start_mcp_server } from "./mcp-server.mjs";
import { get_pipeline, queue_pipeline } from "./pipeline-tools.mjs";
import { get_records, set_record } from "./record-tools.mjs";
import {
  extract_analytic_entities,
  extract_workbench_entities,
  get_analytic_data,
  get_analytic_csv,
  get_dashboard_page,
  get_workbench_data,
  get_workbench_csv,
  list_dashboard_pages,
  list_workbenches,
} from "./report-tools.mjs";
import { get_fields, search_features, search_fields } from "./schema-tools.mjs";
import { get_entity_structure } from "./structure-tools.mjs";
import {
  CONFIG_PATH,
  DEFAULT_BASE_URL,
  DEFAULT_CLIENT_ID,
  PIPELINE_TOOLS_ENABLED,
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

  if (command === "pipeline") {
    assert_pipeline_tools_enabled();
    await run_pipeline_command(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "reports" || command === "analytics") {
    await run_report_command(parsed.positionals.slice(1), parsed.options);
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

  if (command === "get-pipeline" || command === "get_pipeline") {
    assert_pipeline_tools_enabled();
    await get_pipeline(parsed.positionals.slice(1), parsed.options);
    return;
  }

  if (command === "queue-pipeline" || command === "queue_pipeline") {
    assert_pipeline_tools_enabled();
    await queue_pipeline(parsed.positionals.slice(1), parsed.options);
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

async function run_pipeline_command(positionals, options) {
  const command = positionals[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    print_pipeline_help();
    return;
  }

  if (command === "get" || command === "status" || command === "get-pipeline" || command === "get_pipeline") {
    await get_pipeline(positionals.slice(1), options);
    return;
  }

  if (command === "queue" || command === "queue-pipeline" || command === "queue_pipeline") {
    await queue_pipeline(positionals.slice(1), options);
    return;
  }

  throw new Error(`Unknown pipeline command: ${command}`);
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

  throw new Error(`Unknown reports command: ${command}`);
}

function print_help() {
  const pipeline_help = PIPELINE_TOOLS_ENABLED
    ? `  ri-agent get-pipeline PIPELINE_ID [--table]
  ri-agent queue-pipeline PIPELINE_TYPE --doc-id DOC_ID --approved [--property-entity-id CRE_ID] [--start-page N] [--end-page N] [--table]
  ri-agent pipeline <get|queue> ...
`
    : "";
  const write_help = WRITE_TOOLS_ENABLED
    ? "  ri-agent set-record ENTITY_ID --record-json JSON --approved [--update-fields A,B] [--table]\n"
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
  ri-agent reports <list-dashboard-pages|get-dashboard-page|get-analytic-data|get-analytic-csv|extract-analytic-entities|list-workbenches|get-workbench-data|get-workbench-csv|extract-workbench-entities> ...
  ri-agent schema <search-features|search-fields|get-fields> ...
${pipeline_help.trimEnd()}
  ri-agent tools
  ri-agent mcp

Environment:
  RI_AGENT_BASE_URL        Default Core API base URL. Defaults to ${DEFAULT_BASE_URL}
  RI_AGENT_CLIENT_ID       OAuth client id. Defaults to ${DEFAULT_CLIENT_ID}
  REALINSIGHT_AGENT_CONFIG Credential file path. Defaults to ${CONFIG_PATH}
  RI_AGENT_ENABLE_WRITE_TOOLS Include write commands/tools in the local inventory when set to 1.
`);
}

function assert_write_tools_enabled() {
  if (WRITE_TOOLS_ENABLED) return;

  throw new Error("Write tools are currently disabled. Set RI_AGENT_ENABLE_WRITE_TOOLS=1 and enable AgentToolkit:EnableWriteTools in Core API to use them.");
}

function assert_pipeline_tools_enabled() {
  if (PIPELINE_TOOLS_ENABLED) return;

  throw new Error("Pipeline tools are currently disabled. Set RI_AGENT_ENABLE_PIPELINE_TOOLS=1 and enable AgentToolkit:EnablePipelineTools in Core API to use them.");
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

function print_pipeline_help() {
  console.log(`Realinsight Agent Toolkit pipeline commands

Usage:
  ri-agent pipeline get PIPELINE_ID [--table]
  ri-agent pipeline queue PIPELINE_TYPE --doc-id DOC_ID --approved [--property-entity-id CRE_ID] [--start-page N] [--end-page N] [--table]

Pipeline types:
  doc_extract
  rent_roll_extract
  financial_extraction
  entity_extraction
  op_stmt_spread

Queueing is a side effect and requires --approved after explicit user approval.
Rent roll, financial extraction, and op-stmt spread require --property-entity-id or --cre-master-id.
Use --end-page 0 to continue through the end of the document.
`);
}

function print_report_help() {
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

Cached analytic and workbench tables can be large. Prefer paging results into a temporary CSV/JSONL/SQLite file for multi-page analysis.
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
