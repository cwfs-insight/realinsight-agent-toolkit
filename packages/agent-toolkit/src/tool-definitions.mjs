import os from "node:os";
import path from "node:path";

export const DEFAULT_BASE_URL = "https://www.realinsight.cloud/api/v1";
export const DEFAULT_CLIENT_ID = "realinsight-agent-toolkit";
export const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";
export const DEFAULT_SCOPE = [
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
  "ri:reports.write",
].join(" ");
export const REFRESH_SKEW_MS = 2 * 60 * 1000;
export const CONFIG_PATH = process.env.REALINSIGHT_AGENT_CONFIG
  || path.join(os.homedir(), ".realinsight", "agent-toolkit.json");
export const DEFAULT_MAX_TOOL_RESULT_BYTES = 1048576;
export const MIN_TOOL_RESULT_BYTES = 20000;

export const PROFILE_READ_SCOPE = "ri:profile.read";
export const CUSTOMER_SWITCH_SCOPE = "ri:customer.switch";
export const SCHEMA_READ_SCOPE = "ri:schema.read";
export const ENTITY_SEARCH_SCOPE = "ri:entity.search";
export const ENTITY_READ_SCOPE = "ri:entity.read";
export const RECORD_READ_SCOPE = "ri:record.read";
export const RECORD_WRITE_SCOPE = "ri:record.write";
export const STRUCTURE_READ_SCOPE = "ri:structure.read";
export const ANALYTICS_READ_SCOPE = "ri:analytics.read";
export const MODEL_FORMS_READ_SCOPE = "ri:model_forms.read";
export const MODEL_FORMS_WRITE_SCOPE = "ri:model_forms.write";
export const CHART_OF_ACCOUNTS_WRITE_SCOPE = "ri:chart_of_accounts.write";
export const REPORT_WRITE_SCOPE = "ri:reports.write";
export const WRITE_TOOLS_ENABLED = parse_env_bool(process.env.RI_AGENT_ENABLE_WRITE_TOOLS, true);
const WRITE_TOOL_NAMES = new Set([
  "set_record",
  "set_chart_of_accounts",
  "validate_create_report",
  "validate_update_report",
  "validate_delete_report",
  "create_report",
  "update_report",
  "delete_report",
  "validate_create_model_form",
  "create_model_form",
  "validate_update_model_form",
  "update_model_form",
  "stage_model_form_template_file",
  "upload_model_form_template",
]);
export const MCP_PROTOCOL_VERSION = "2025-11-25";
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
];
export const MCP_SERVER_INFO = {
  name: "realinsight-agent-toolkit",
  title: "Realinsight Agent Toolkit",
  version: "0.2.0",
};
export const MCP_INSTRUCTIONS = [
  "Realinsight is a commercial real estate asset management and servicing platform.",
  "All Realinsight tool calls run through Core API using the authenticated Realinsight user and customer context.",
  "For harnesses that implement tool search, search by tool family first instead of loading every tool: schema features fields; entity search records structure children; analytics dashboard workbench CSV; report configuration folders; model form configuration folders template map; chart of accounts configuration COAData; tool reference schema. Common always-useful entry tools are get_tool_reference, search_features, search_fields, get_fields, search_entities, get_records, get_entity_structure, search_reports, search_report_folders, get_report, search_model_forms, search_model_form_folders, get_model_form, and get_chart_of_accounts.",
  "If the Realinsight Agent Toolkit skill is unavailable, call get_tool_reference for compact workflow/schema guidance instead of relying on large inline tool schemas.",
  "Choose the tool family from the shape of the user's question. For a named loan, deal, property, tenant, borrower, or other specific record, use schema/entity/record tools first. For broad portfolio, system, dashboard, saved-list, or operational-table questions, inspect curated dashboard/workbench/cache tools when they match the request.",
  "Do not default to dashboard/workbench tools only because a question is broad business data; use them when the user mentions an existing page/list/analytic/workbench, when tool evidence points to one, or when a curated cached table is the best source for a portfolio/system-wide population.",
  "Use search_features when business terms need mapping to Realinsight feature/entity types such as loan, deal, lease, property, rent roll, or operating statement.",
  "Use search_fields or get_fields to identify exact schema codes and field names before requesting record values, child rows, report columns, filters, sorts, or model-map field meaning.",
  "Use search_entities to find concrete Realinsight entity ids. Use generic search for named records and explicit schema_codes or feature_code plus field_names when you know the searchable fields.",
  "Use get_records after search_entities to hydrate entity ids with key fields or explicit field values.",
  "Use get_children after finding a parent entity when the user asks for payment history, rent-roll rows, collateral, owners, or another child dataset.",
  "Use get_latest_children when you need one latest child per parent, then hydrate returned child_entity_id values with get_records.",
  "Record values can include display_value and expansion hints. Prefer display_value for user-facing answers and value for exact ids/codes. For accounts fields, pass expand_values=['accounts'] to get_records or call get_chart_of_accounts with the returned COAData id.",
  "Use get_entity_structure for parent, master, child, reference, or periodic relationship traversal when the user asks how entities are connected.",
  "Use list_dashboard_pages/get_dashboard_page for dashboard pages, analytics, portfolio pages, curated visual/report tiles, or broad questions where an existing curated analytic is likely the best source.",
  "Use list_workbenches/get_workbench_data for existing workbench lists, saved lists, queues, cached operational tables, or broad questions where an operational list is likely the best source.",
  "Use search_reports/get_report when the user asks to inspect, create, edit, copy, or delete report definitions. Reports are best for extracting/listing data: choose the report grain with master_feature_code first, then add related datasets and fields. Use search_report_folders when the user asks to place a report in a specific folder.",
  "Use search_model_forms/get_model_form when the user asks about model/form templates, Excel/PDF outputs, workbook maps, generated files, posting, or repeating template layout. Models are best for transforming or presenting data through a template and map. Use search_model_form_folders when the user asks to place a model form in a specific folder.",
  "Use get_chart_of_accounts when the user asks about Chart of Accounts setup, account labels/computes, rollup mappings, external GL mappings, system-code mappings, availability, or when an accounts record field returns a COAData id.",
  "Model form maps are nested in storage but returned as flat node ids through get_model_form sections; inspect only the needed map nodes/items. Prefer map_patch for small add/update/remove node/item edits, and reserve full map replacement for bulk import/revert. Markers are repeating-block/layout anchors, not entity fields. Read the model-form skill reference for map usage and embedded relationship semantics before writing.",
  "For model form writes, read the latest model form first, preserve unchanged metadata/map values, validate create/update requests when changing metadata or map structure, then write only after explicit approval. Use source_model_form_id to create a derivative copy from an existing model form. If parent_folder_id is omitted on create, Core saves under agent/{current user name}; pass WORKBOOKPROCESS or ROOT only when the user explicitly asks for root.",
  "Use download_model_form_template with output_path when working locally so workbook bytes stay out of chat. In hosted flows, use the returned signed download_url outside model context. Modify the Excel file, call stage_model_form_template_file to get a signed multipart upload_url and staged_file_id, upload the file outside the tool call, then use upload_model_form_template with staged_file_id, expected_conflict_token, and approved=true.",
  "Before building reports, use search_features/get_entity_structure/get_fields to choose one top-level master_feature_code, related datasets under that same top-level feature family, and exact field names. For report column order or computed formulas, use get_tool_reference topic=report_computed_fields or the report computed-fields skill reference before writing. If parent_folder_id is omitted on create, Core saves under agent/{current user name}; pass REPORT or ROOT only when the user explicitly asks for root.",
  "Use extract_analytic_entities or extract_workbench_entities to turn cached table rows into compact entity refs for later get_records/get_children calls.",
  "Cached analytic and workbench rows can be large; for multi-page analysis, use CSV tools or paged data tools, write pages to a temporary CSV/JSONL/SQLite table in your environment, then query that local copy.",
  "Server caps are reported in tool result limits. Default cached data pages are small; max page size is 1000 rows, and all=true is capped server-side.",
  "Unset Realinsight dates may appear as null with is_unset_value=true; older raw paths may show 0001-01-01 or 1900-01-01.",
  "Read-only tools have no side effects; agent harnesses may auto-approve read calls when local policy allows, but keep reads bounded and report truncation, cache, and access warnings.",
  "Local auth tools can list and switch only saved local ri-agent profiles. They must not imply that Realinsight exposes a directory of all customers. To switch to a different customer, start a fresh browser login with switch_profile, passing customer_code only when it is the user's Realinsight login/company code. If only a customer number or uncertain identifier is known, omit customer_code so the user can type it on the login screen.",
  ...(WRITE_TOOLS_ENABLED
    ? ["set_record, set_chart_of_accounts, report create/update/delete, and model form create/update/template upload are write operations: call them only after the user approves the exact side effect, with approved=true. Config writes default to audit_detail=summary; request audit_detail=changes for changed paths/types or audit_detail=full only when audit/reversal work needs before/after values. After a successful write, summarize what changed using friendly names/context, avoid raw ids in the user-facing answer except report/model/COA ids or open links when useful, and include warnings."]
    : []),
  "Every tool call can include a profile name; otherwise the active local ri-agent auth profile is used.",
].join("\n");

const ALL_AGENT_TOOLS = [
  {
    name: "get_tool_reference",
    title: "Get Realinsight Tool Reference",
    cli: "MCP: get_tool_reference",
    route: "MCP static tool reference",
    scope: PROFILE_READ_SCOPE,
    description: "Return compact workflow or schema guidance for a Realinsight tool family. Use this when the toolkit skill/reference files are unavailable, or when a harness exposes many tools and the agent needs a small schema-only reference before choosing or calling write tools.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        topic: {
          type: "string",
          enum: [
            "tool_discovery",
            "model_forms",
            "model_form_map_schema",
            "model_form_layout",
            "reports",
            "report_computed_fields",
            "chart_of_accounts",
            "entities_records",
            "analytics_workbenches",
          ],
          description: "Reference topic. Defaults to tool_discovery.",
        },
        format: {
          type: "string",
          enum: ["summary", "schema", "workflow"],
          description: "Return the full compact reference, only schema fields, or only workflow/search guidance. Defaults to summary.",
        },
      },
    },
  },
  {
    name: "auth_status",
    title: "Check Realinsight Auth Status",
    cli: "ri-agent auth status",
    route: "local auth status",
    scope: PROFILE_READ_SCOPE,
    local_only: true,
    description: "Check the local Realinsight auth profile and complete any pending browser/device authorization after the user approves it.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
      },
    },
  },
  {
    name: "list_profiles",
    title: "List Local Realinsight Profiles",
    cli: "ri-agent auth list",
    route: "local auth profile list",
    scope: PROFILE_READ_SCOPE,
    local_only: true,
    description: "List local ri-agent auth profiles and pending browser/device authorizations already stored on this machine. This does not query or expose a Realinsight customer directory.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        include_pending: {
          type: "boolean",
          description: "Include pending browser/device authorization attempts. Defaults to true.",
        },
      },
    },
  },
  {
    name: "connect_realinsight",
    title: "Connect Realinsight",
    cli: "ri-agent auth login",
    route: "local auth login",
    scope: "",
    local_only: true,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Start a browser-based Realinsight login for the local MCP server without requiring the user to use a terminal. By default this waits up to five minutes for browser approval and stores the profile when approval completes.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Defaults to the active profile or default.",
        },
        base_url: {
          type: "string",
          description: "Optional Realinsight API base URL. Defaults to RI_AGENT_BASE_URL or https://www.realinsight.cloud/api/v1.",
        },
        client_id: {
          type: "string",
          description: "Optional OAuth client id. Defaults to realinsight-agent-toolkit.",
        },
        scope: {
          type: "string",
          description: "Optional OAuth scope string. Defaults to the completed toolkit scope set.",
        },
        scopes: {
          type: "array",
          items: { type: "string" },
          description: "Optional OAuth scopes as an array.",
        },
        device_label: {
          type: "string",
          description: "Optional label shown in OAuth/device audit records.",
        },
        customer_code: {
          type: "string",
          description: "Optional Realinsight login/company code hint. Do not pass customer numbers; omit this when uncertain so the user can type the customer code on the login screen.",
        },
        force_login: {
          type: "boolean",
          description: "Force the browser through the Realinsight login screen instead of reusing an existing browser session. Defaults to false.",
        },
        open_browser: {
          type: "boolean",
          description: "Open the Realinsight approval URL in the local browser. Defaults to true.",
        },
        wait_for_approval: {
          type: "boolean",
          description: "Poll for browser approval before returning. Defaults to true.",
        },
        timeout_seconds: {
          type: "integer",
          minimum: 1,
          maximum: 600,
          description: "Maximum seconds to wait for browser approval. Defaults to 300.",
        },
        poll_interval_seconds: {
          type: "integer",
          minimum: 1,
          maximum: 60,
          description: "Seconds between approval checks. Defaults to 5.",
        },
      },
    },
  },
  {
    name: "switch_profile",
    title: "Switch Realinsight Profile",
    cli: "ri-agent auth list / ri-agent auth login --profile NAME",
    route: "local auth profile switch",
    scope: CUSTOMER_SWITCH_SCOPE,
    local_only: true,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Switch the active local ri-agent profile, or start a forced browser login for a different customer. Pass customer_code only when it is the user's Realinsight login/company code; omit it when the user wants to type the customer code on the login screen or only a customer number is known.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local profile name. If it exists and reauthorize is false, the tool only makes it active. If omitted with customer_code, the customer code becomes the profile name.",
        },
        customer_code: {
          type: "string",
          description: "Optional Realinsight login/company code used to prefill the login page. This is not a customer lookup, does not grant access by itself, and must not be a customer number.",
        },
        reauthorize: {
          type: "boolean",
          description: "Start a fresh browser login even when profile already exists. Defaults to true for new/customer-code switches and false for an existing profile-only switch.",
        },
        base_url: {
          type: "string",
          description: "Optional Realinsight API base URL. Defaults to the active profile base URL, RI_AGENT_BASE_URL, or https://www.realinsight.cloud/api/v1.",
        },
        client_id: {
          type: "string",
          description: "Optional OAuth client id. Defaults to the active profile client id or realinsight-agent-toolkit.",
        },
        scope: {
          type: "string",
          description: "Optional OAuth scope string. Defaults to the completed toolkit scope set.",
        },
        scopes: {
          type: "array",
          items: { type: "string" },
          description: "Optional OAuth scopes as an array.",
        },
        device_label: {
          type: "string",
          description: "Optional label shown in OAuth/device audit records.",
        },
        force_login: {
          type: "boolean",
          description: "Force the browser through the Realinsight login screen. Defaults to true when starting a login from this tool.",
        },
        open_browser: {
          type: "boolean",
          description: "Open the Realinsight approval URL in the local browser. Defaults to true.",
        },
        wait_for_approval: {
          type: "boolean",
          description: "Poll for browser approval before returning. Defaults to true.",
        },
        timeout_seconds: {
          type: "integer",
          minimum: 1,
          maximum: 600,
          description: "Maximum seconds to wait for browser approval. Defaults to 300.",
        },
        poll_interval_seconds: {
          type: "integer",
          minimum: 1,
          maximum: 60,
          description: "Seconds between approval checks. Defaults to 5.",
        },
      },
    },
  },
  {
    name: "disconnect_realinsight",
    title: "Disconnect Realinsight",
    cli: "ri-agent auth logout",
    route: "local auth logout",
    scope: "",
    local_only: true,
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    description: "Revoke and remove the local Realinsight auth profile used by the local MCP server.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
      },
    },
  },
  {
    name: "request_realinsight_scopes",
    title: "Request Realinsight Scopes",
    cli: "ri-agent auth login --scope SCOPE",
    route: "local auth scope request",
    scope: "",
    local_only: true,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Start a browser-based Realinsight consent flow for a new or expanded local OAuth scope set. By default this waits up to five minutes for browser approval and stores the profile when approval completes.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Defaults to the active profile or default.",
        },
        base_url: {
          type: "string",
          description: "Optional Realinsight API base URL. Defaults to the existing profile, RI_AGENT_BASE_URL, or https://www.realinsight.cloud/api/v1.",
        },
        client_id: {
          type: "string",
          description: "Optional OAuth client id. Defaults to the existing profile or realinsight-agent-toolkit.",
        },
        scope: {
          type: "string",
          description: "OAuth scope string to request.",
        },
        scopes: {
          type: "array",
          items: { type: "string" },
          description: "OAuth scopes to request as an array.",
        },
        device_label: {
          type: "string",
          description: "Optional label shown in OAuth/device audit records.",
        },
        customer_code: {
          type: "string",
          description: "Optional Realinsight login/company code hint. Do not pass customer numbers; omit this when uncertain so the user can type the customer code on the login screen.",
        },
        force_login: {
          type: "boolean",
          description: "Force the browser through the Realinsight login screen instead of reusing an existing browser session. Defaults to false.",
        },
        open_browser: {
          type: "boolean",
          description: "Open the Realinsight approval URL in the local browser. Defaults to true.",
        },
        wait_for_approval: {
          type: "boolean",
          description: "Poll for browser approval before returning. Defaults to true.",
        },
        timeout_seconds: {
          type: "integer",
          minimum: 1,
          maximum: 600,
          description: "Maximum seconds to wait for browser approval. Defaults to 300.",
        },
        poll_interval_seconds: {
          type: "integer",
          minimum: 1,
          maximum: 60,
          description: "Seconds between approval checks. Defaults to 5.",
        },
      },
    },
  },
  {
    name: "search_features",
    title: "Search Realinsight Features",
    cli: "ri-agent search-features QUERY",
    route: "GET /agent/schema/features/search",
    scope: SCHEMA_READ_SCOPE,
    description: "Find Realinsight feature/entity types from business language. Use this when you need the system feature code for a concept before searching records, child datasets, report fields, or model-form root datasets.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description: "Natural-language search text such as loan, deal, lease, property, rent roll, or operating statement.",
        },
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum feature results to return.",
        },
        type: {
          type: "string",
          enum: ["MASTER", "DEPENDENT", "VIRTUAL"],
          description: "Optional Realinsight entity type filter.",
        },
        include_virtuals: {
          type: "boolean",
          description: "Include virtual feature definitions in the result set.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_fields",
    title: "Search Realinsight Fields",
    cli: "ri-agent search-fields QUERY [--feature-code CODE]",
    route: "GET /agent/schema/fields/search",
    scope: SCHEMA_READ_SCOPE,
    description: "Find runtime fields by label or business wording, across all features or within one feature. Use this before record hydration, report columns/filters/sorts, update planning, or interpreting model-map field references.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description: "Natural-language search text or field text such as balance, maturity date, tenant name, or property type.",
        },
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        feature_code: {
          type: "string",
          description: "Optional Realinsight feature code to narrow the field search.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum field results to return.",
        },
        include_computed: {
          type: "boolean",
          description: "Include computed fields. Defaults to true in Core API.",
        },
        include_read_only: {
          type: "boolean",
          description: "Include read-only fields. Defaults to true in Core API.",
        },
        include_sensitive: {
          type: "boolean",
          description: "Include fields marked sensitive when the authenticated Realinsight user is allowed to see them.",
        },
        postable_only: {
          type: "boolean",
          description: "Return only fields that are currently safe write targets. Useful for future write planning.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_fields",
    title: "Get Realinsight Feature Fields",
    cli: "ri-agent get-fields FEATURE_CODE",
    route: "GET /agent/schema/features/{feature_code}/fields",
    scope: SCHEMA_READ_SCOPE,
    description: "List runtime fields for one feature with pagination. Use this when you already know the feature_code and need exact field names, schema codes, display labels, data types, or postable/read-only status.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        feature_code: {
          type: "string",
          description: "Realinsight feature code to inspect.",
        },
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 500,
          description: "Maximum fields to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous get_fields response.",
        },
        include_excluded: {
          type: "boolean",
          description: "Include excluded fields in the field list.",
        },
        include_computed: {
          type: "boolean",
          description: "Include computed fields. Defaults to true in Core API.",
        },
        include_read_only: {
          type: "boolean",
          description: "Include read-only fields. Defaults to true in Core API.",
        },
        include_sensitive: {
          type: "boolean",
          description: "Include fields marked sensitive when the authenticated Realinsight user is allowed to see them.",
        },
        postable_only: {
          type: "boolean",
          description: "Return only fields that are currently safe write targets. Useful for future write planning.",
        },
      },
      required: ["feature_code"],
    },
  },
  {
    name: "search_entities",
    title: "Search Realinsight Entities",
    cli: "ri-agent search-entities QUERY [--schema-code FEATURE.FIELD|--schema-codes A.B,C.D|--feature-code FEATURE --field-names FieldA,FieldB]",
    route: "GET /agent/entities/search",
    scope: ENTITY_SEARCH_SCOPE,
    description: "Find concrete Realinsight entity ids using generic top-toolbar style search or explicit searchable fields. Prefer this for named loan/deal/property/tenant/borrower questions before using get_records, relationship traversal, or child tools.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        query: {
          type: "string",
          description: "Entity search text such as a property name, loan number, deal name, tenant name, or exact external identifier.",
        },
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        schema_code: {
          type: "string",
          description: "Single searchable schema code in FeatureCode.FieldName format. Optional; omit for generic entity search.",
        },
        schema_codes: {
          type: "array",
          items: {
            type: "string",
          },
          description: "One or more searchable schema codes in FeatureCode.FieldName format. Use this instead of feature_code plus field_names when searching multiple explicit fields across features.",
        },
        feature_code: {
          type: "string",
          description: "Optional feature code. With field_name/field_names, searches those fields. Without fields, performs generic entity search constrained to the feature.",
        },
        field_name: {
          type: "string",
          description: "Single field name to search with feature_code.",
        },
        field_names: {
          type: "array",
          items: {
            type: "string",
          },
          description: "One or more field names to search with feature_code.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum entity results to return.",
        },
        exact: {
          type: "boolean",
          description: "Use exact normalized matching instead of fuzzy autocomplete matching.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_children",
    title: "Get Realinsight Entity Children",
    cli: "ri-agent get-children --feature-code CHILD_FEATURE --parent-ids ID1,ID2 [--limit N|--limit-per-parent N] [--sort 'Field|desc']",
    route: "POST /agent/entities/children",
    scope: ENTITY_READ_SCOPE,
    description: "Fetch child entities for known parent ids with optional filters, sorts, global limit, or per-parent limit. Use after search_entities/get_entity_structure when the user asks for related rows such as payments, rent roll, collateral, owners, inspections, statements, or comments.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        feature_code: {
          type: "string",
          description: "Child feature code to retrieve. Use schema or structure discovery before choosing it when uncertain.",
        },
        parent_ids: {
          type: "array",
          items: {
            type: "string",
          },
          minItems: 1,
          maxItems: 25,
          description: "Parent entity ids whose child entities should be retrieved.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 500,
          description: "Global maximum child results to return. Ignored when limit_per_parent is supplied.",
        },
        skip: {
          type: "integer",
          minimum: 0,
          description: "Number of child results to skip globally, or per parent when limit_per_parent is supplied.",
        },
        limit_per_parent: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum child results to return for each requested parent. parent_ids count multiplied by this value cannot exceed 500.",
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field_name: {
                type: "string",
                description: "Child field name to filter on.",
              },
              schema_code: {
                type: "string",
                description: "Child schema code in FeatureCode.FieldName format. Must match feature_code.",
              },
              op: {
                type: "string",
                enum: ["eq", "neq", "gt", "gte", "lt", "lte", "contains"],
                description: "Filter operator. Defaults to eq.",
              },
              value: {
                type: "string",
                description: "Filter value. Use strings; Core API converts based on field type.",
              },
              and_or: {
                type: "string",
                enum: ["and", "or"],
                description: "Filter combiner. Defaults to and.",
              },
            },
          },
          description: "Optional child record filters applied by Core API before results are returned.",
        },
        sorts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field_name: {
                type: "string",
                description: "Child field name to sort on.",
              },
              schema_code: {
                type: "string",
                description: "Child schema code in FeatureCode.FieldName format. Must match feature_code.",
              },
              direction: {
                type: "string",
                enum: ["ascending", "descending", "asc", "desc"],
                description: "Sort direction. Defaults to ascending.",
              },
            },
          },
          description: "Optional child record sorts applied by Core API before limits are applied.",
        },
        mode: {
          type: "string",
          enum: ["recent", "largest", "top"],
          description: "Sort shorthand. Requires mode_field_name or mode_schema_code and cannot be combined with sorts.",
        },
        mode_field_name: {
          type: "string",
          description: "Concrete child field used by mode, such as PaymentDate for recent or NRA for largest.",
        },
        mode_schema_code: {
          type: "string",
          description: "Concrete child schema code used by mode. Must match feature_code.",
        },
      },
      required: ["feature_code", "parent_ids"],
    },
  },
  {
    name: "get_latest_children",
    title: "Get Latest Realinsight Children Per Parent",
    cli: "ri-agent get-latest-children --feature-code CHILD_FEATURE --parent-ids ID1,ID2 --mode-field DateField",
    route: "POST /agent/entities/children/latest",
    scope: ENTITY_READ_SCOPE,
    description: "Fetch one latest/top child entity per parent id using an explicit child date/order field. Use this for latest loan servicing, inspection, operating statement, payment, or rent-roll child records before hydrating the returned child ids.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        feature_code: {
          type: "string",
          description: "Child feature code to retrieve. Use search_features, get_entity_structure, or get_tool_reference before choosing it when uncertain.",
        },
        parent_ids: {
          type: "array",
          items: {
            type: "string",
          },
          minItems: 1,
          maxItems: 25,
          description: "Parent entity ids. The tool returns at most one child result for each parent.",
        },
        mode: {
          type: "string",
          enum: ["recent", "largest", "top"],
          description: "Sort shorthand. Defaults to recent when a mode field is supplied. Requires mode_field_name or mode_schema_code and cannot be combined with sorts.",
        },
        mode_field_name: {
          type: "string",
          description: "Concrete child field used to pick the latest/top child, such as AsOfDate, PaymentDate, InspectionDate, StatementDate, or NRA.",
        },
        mode_schema_code: {
          type: "string",
          description: "Concrete child schema code used to pick the latest/top child. Must match feature_code.",
        },
        filters: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field_name: {
                type: "string",
                description: "Child field name to filter on before selecting the latest row.",
              },
              schema_code: {
                type: "string",
                description: "Child schema code in FeatureCode.FieldName format. Must match feature_code.",
              },
              op: {
                type: "string",
                enum: ["eq", "neq", "gt", "gte", "lt", "lte", "contains"],
                description: "Filter operator. Defaults to eq.",
              },
              value: {
                type: "string",
                description: "Filter value. Use strings; Core API converts based on field type.",
              },
              and_or: {
                type: "string",
                enum: ["and", "or"],
                description: "Filter combiner. Defaults to and.",
              },
            },
          },
          description: "Optional child record filters applied before picking the latest child.",
        },
        sorts: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              field_name: {
                type: "string",
                description: "Child field name to sort on.",
              },
              schema_code: {
                type: "string",
                description: "Child schema code in FeatureCode.FieldName format. Must match feature_code.",
              },
              direction: {
                type: "string",
                enum: ["descending", "desc"],
                description: "Use descending so the first row is the latest/top child.",
              },
            },
          },
          description: "Optional explicit sort. Usually prefer mode_field_name/mode_schema_code for this helper.",
        },
      },
      required: ["feature_code", "parent_ids"],
    },
  },
  {
    name: "get_records",
    title: "Get Realinsight Entity Records",
    cli: "ri-agent get-records --feature-code FEATURE --entity-ids ID1,ID2 [--fields FieldA,FieldB|--schema-codes FEATURE.FieldA,FEATURE.FieldB]",
    route: "POST /agent/records/get",
    scope: RECORD_READ_SCOPE,
    description: "Hydrate one or more Realinsight entity ids with key fields or explicitly requested record fields. Values may include display_value plus expansion hints for dictionary/reference/user/document fields.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        feature_code: {
          type: "string",
          description: "Feature code shared by the requested entity ids.",
        },
        entity_ids: {
          type: "array",
          items: {
            type: "string",
          },
          minItems: 1,
          maxItems: 50,
          description: "Entity ids to hydrate. All ids must belong to feature_code. Batch large populations in chunks of 50 or fewer ids.",
        },
        field_profile: {
          type: "string",
          enum: ["key_fields", "explicit_fields", "used_fields"],
          description: "Field selection mode. Defaults to key_fields unless field_names or schema_codes are supplied. used_fields is planned but not implemented yet.",
        },
        field_names: {
          type: "array",
          items: {
            type: "string",
          },
          maxItems: 100,
          description: "Explicit field names to return for feature_code. Keep this list narrow for large populations.",
        },
        schema_codes: {
          type: "array",
          items: {
            type: "string",
          },
          maxItems: 100,
          description: "Explicit schema codes in FeatureCode.FieldName format. Each schema code must match feature_code. Keep this list narrow for large populations.",
        },
        expand_values: {
          type: "array",
          items: {
            type: "string",
            enum: ["accounts", "account", "all"],
          },
          description: "Optional value expansion. Use accounts to resolve accounts field raw COAData ids into chart layout and COA data values.",
        },
        as_of_date: {
          type: "string",
          description: "Optional as-of date in YYYY-MM-DD format for record retrieval paths that support it.",
        },
        target_currency_id: {
          type: "string",
          description: "Optional target currency id for supported money-field conversion.",
        },
      },
      required: ["feature_code", "entity_ids"],
    },
  },
  {
    name: "set_record",
    title: "Set Realinsight Record Fields",
    cli: "ri-agent set-record ENTITY_ID --record-json JSON --approved",
    route: "POST /agent/records/set",
    scope: RECORD_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Set updateable fields on one concrete Realinsight entity record after explicit user approval. Search and read the record first unless the user has already supplied the exact entity id, fields, and new values. After success, summarize the record using its friendly name/context, applied fields, skipped/warning fields, and provenance; avoid showing raw ids unless the user needs them.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        entity_id: {
          type: "string",
          description: "Realinsight entity id for the record to update.",
        },
        record: {
          type: "object",
          additionalProperties: true,
          description: "Object whose keys are field names and whose values are the new field values.",
        },
        update_fields: {
          type: "array",
          items: {
            type: "string",
          },
          minItems: 1,
          maxItems: 100,
          description: "Optional explicit field names to update. Defaults to the keys in record.",
        },
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves the exact entity id, fields, and values.",
        },
        confirm_update: {
          type: "boolean",
          description: "Alias approval flag for clients that prefer confirm_update.",
        },
      },
      required: ["entity_id", "record"],
    },
  },
  {
    name: "get_entity_structure",
    title: "Get Realinsight Entity Structure",
    cli: "ri-agent get-entity-structure --traversal parent --entity-ids ID1,ID2 [--feature-code CODE|--feature-codes A,B]",
    route: "POST /agent/entities/structure",
    scope: STRUCTURE_READ_SCOPE,
    description: "Traverse parent, master, child, reference, referenced-by, or periodic relationships for one or more entities and return a compact graph. Use this to understand what datasets are reachable for a specific record, report grain, or model-form map plan.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        traversal: {
          type: "string",
          enum: [
            "parent",
            "master",
            "children",
            "all_dependents_for_master",
            "references",
            "referenced_by",
            "periodic_current",
            "periodic_as_of",
          ],
          description: "Relationship traversal to perform.",
        },
        entity_ids: {
          type: "array",
          items: {
            type: "string",
          },
          minItems: 1,
          maxItems: 25,
          description: "Source entity ids to traverse from.",
        },
        feature_code: {
          type: "string",
          description: "Feature code used by children, all_dependents_for_master, referenced_by, periodic_current, or periodic_as_of traversals.",
        },
        feature_codes: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Feature codes used by children, all_dependents_for_master, referenced_by, or references feature filters.",
        },
        reference_feature_code: {
          type: "string",
          description: "Reference feature code required by the references traversal.",
        },
        as_of_date: {
          type: "string",
          description: "As-of date required by periodic_as_of, preferably YYYY-MM-DD.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 500,
          description: "Maximum graph nodes to return.",
        },
      },
      required: ["traversal", "entity_ids"],
    },
  },
  {
    name: "list_dashboard_pages",
    title: "List Realinsight Dashboard Pages",
    cli: "ri-agent list-dashboard-pages",
    route: "GET /agent/dashboards/pages",
    scope: ANALYTICS_READ_SCOPE,
    description: "List dashboard pages available to the authenticated Realinsight user. Use for dashboards, portfolio pages, curated analytics, broad page-level summaries, or fallback discovery when a curated analytic is likely useful; for a named entity, usually search_entities/get_records first.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum dashboard pages to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous list_dashboard_pages response.",
        },
      },
    },
  },
  {
    name: "get_dashboard_page",
    title: "Get Realinsight Dashboard Page",
    cli: "ri-agent get-dashboard-page PAGE_ID",
    route: "GET /agent/dashboards/pages/{page_id}",
    scope: ANALYTICS_READ_SCOPE,
    description: "Describe one dashboard page, its analytics, global filters, cache status, and backing reports. Use after list_dashboard_pages to choose the right analytic id; do not use this as a substitute for direct entity lookup when the user names a specific record.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        page_id: {
          type: "string",
          description: "Dashboard page ObjectId returned by list_dashboard_pages.",
        },
      },
      required: ["page_id"],
    },
  },
  {
    name: "get_analytic_data",
    title: "Get Realinsight Analytic Data",
    cli: "ri-agent get-analytic-data ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR]",
    route: "GET /agent/analytics/{report_id}/data",
    scope: ANALYTICS_READ_SCOPE,
    description: "Read cached analytic data, analytic JSON, and base report column metadata for the current user. Use for selected dashboard analytics or broad cached summaries; use get_analytic_csv for large local-table analysis and extract_analytic_entities for compact entity handoff.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Analytic report ObjectId, usually from get_dashboard_page.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Maximum cached rows to return for this page. Ignored when all=true, which uses the server all-row cap.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous get_analytic_data response.",
        },
        all: {
          type: "boolean",
          description: "Request all rows up to the server cap. Prefer get_analytic_csv plus paging to a temp file for large results.",
        },
        include_rows: {
          type: "boolean",
          description: "Include cached table rows. Set false to inspect metadata and columns only.",
        },
        include_columns: {
          type: "boolean",
          description: "Include base report column metadata.",
        },
        include_analytic_json: {
          type: "boolean",
          description: "Include the cached analytic JSON payload when available.",
        },
      },
      required: ["report_id"],
    },
  },
  {
    name: "get_analytic_csv",
    title: "Get Realinsight Analytic CSV",
    cli: "ri-agent get-analytic-csv ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR] [--raw]",
    route: "GET /agent/analytics/{report_id}/csv",
    scope: ANALYTICS_READ_SCOPE,
    description: "Read one page of cached analytic rows as CSV. For large analytics, write each csv page to a temp file and continue with next_cursor instead of loading all rows into model context.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Analytic report ObjectId, usually from get_dashboard_page.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Maximum cached rows to include in this CSV page. Use next_cursor to continue.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous get_analytic_csv response.",
        },
        all: {
          type: "boolean",
          description: "Request all rows up to the server cap. Prefer paged CSV writes for broad exports.",
        },
      },
      required: ["report_id"],
    },
  },
  {
    name: "extract_analytic_entities",
    title: "Extract Realinsight Analytic Entities",
    cli: "ri-agent extract-analytic-entities ANALYTIC_REPORT_ID [--limit N|--all] [--cursor CURSOR]",
    route: "GET /agent/analytics/{report_id}/entities",
    scope: ANALYTICS_READ_SCOPE,
    description: "Extract compact entity refs from cached analytic rows so the agent can hydrate or traverse the underlying population with get_records, get_children, or get_latest_children.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Analytic report ObjectId, usually from get_dashboard_page.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Maximum cached source rows to scan for entity ids in this page.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous extract_analytic_entities response.",
        },
        all: {
          type: "boolean",
          description: "Scan all cached source rows up to the server cap. Prefer paging for very broad tables.",
        },
      },
      required: ["report_id"],
    },
  },
  {
    name: "list_workbenches",
    title: "List Realinsight Workbenches",
    cli: "ri-agent list-workbenches [--workbench-code CODE]",
    route: "GET /agent/workbenches",
    scope: ANALYTICS_READ_SCOPE,
    description: "List saved workbench lists available to the authenticated user, optionally filtered by workbench code. Use for module workbenches, queues, saved lists, operational list reports, or fallback discovery when a cached operational list is likely useful.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        workbench_code: {
          type: "string",
          description: "Optional workbench code to filter saved lists.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum workbench lists to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous list_workbenches response.",
        },
      },
    },
  },
  {
    name: "get_workbench_data",
    title: "Get Realinsight Workbench Data",
    cli: "ri-agent get-workbench-data WORKBENCH_ID [--limit N|--all] [--cursor CURSOR]",
    route: "GET /agent/workbenches/{workbench_id}/data",
    scope: ANALYTICS_READ_SCOPE,
    description: "Read cached workbench/list-report table data and backing report column metadata for the current user. Use for selected saved lists or broad operational tables; use get_workbench_csv for large local-table analysis and extract_workbench_entities for compact entity handoff.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        workbench_id: {
          type: "string",
          description: "Workbench list ObjectId returned by list_workbenches.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Maximum cached rows to return for this page. Ignored when all=true, which uses the server all-row cap.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous get_workbench_data response.",
        },
        all: {
          type: "boolean",
          description: "Request all rows up to the server cap. Prefer get_workbench_csv plus paging to a temp file for large results.",
        },
        include_rows: {
          type: "boolean",
          description: "Include cached table rows. Set false to inspect metadata and columns only.",
        },
        include_columns: {
          type: "boolean",
          description: "Include backing report column metadata.",
        },
      },
      required: ["workbench_id"],
    },
  },
  {
    name: "get_workbench_csv",
    title: "Get Realinsight Workbench CSV",
    cli: "ri-agent get-workbench-csv WORKBENCH_ID [--limit N|--all] [--cursor CURSOR] [--raw]",
    route: "GET /agent/workbenches/{workbench_id}/csv",
    scope: ANALYTICS_READ_SCOPE,
    description: "Read one page of cached workbench/list-report rows as CSV. For large workbenches, write each csv page to a temp file and continue with next_cursor instead of loading all rows into model context.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        workbench_id: {
          type: "string",
          description: "Workbench list ObjectId returned by list_workbenches.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Maximum cached rows to include in this CSV page. Use next_cursor to continue.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous get_workbench_csv response.",
        },
        all: {
          type: "boolean",
          description: "Request all rows up to the server cap. Prefer paged CSV writes for broad exports.",
        },
      },
      required: ["workbench_id"],
    },
  },
  {
    name: "extract_workbench_entities",
    title: "Extract Realinsight Workbench Entities",
    cli: "ri-agent extract-workbench-entities WORKBENCH_ID [--limit N|--all] [--cursor CURSOR]",
    route: "GET /agent/workbenches/{workbench_id}/entities",
    scope: ANALYTICS_READ_SCOPE,
    description: "Extract compact entity refs from cached workbench/list-report rows so the agent can hydrate or traverse the underlying population with get_records, get_children, or get_latest_children.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        workbench_id: {
          type: "string",
          description: "Workbench list ObjectId returned by list_workbenches.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 1000,
          description: "Maximum cached source rows to scan for entity ids in this page.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous extract_workbench_entities response.",
        },
        all: {
          type: "boolean",
          description: "Scan all cached source rows up to the server cap. Prefer paging for very broad tables.",
        },
      },
      required: ["workbench_id"],
    },
  },
  {
    name: "search_reports",
    title: "Search Realinsight Reports",
    cli: "ri-agent search-reports [--report-type LIST] [--search-text TEXT]",
    route: "GET /agent/reports/configurations/search",
    scope: ANALYTICS_READ_SCOPE,
    description: "Search compact report-definition summaries visible to the authenticated user. Use this for report catalog/design questions, or before editing, copying, or deleting a report so the agent can choose the correct report_id and then call get_report for detail and the latest conflict token.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_type: {
          type: "string",
          description: "Optional report type filter such as LIST, ANALYTIC, or COMPOSITE. The first write pass supports LIST only.",
        },
        parent_folder_id: {
          type: "string",
          description: "Optional report folder id. Use REPORT for the root folder.",
        },
        search_text: {
          type: "string",
          description: "Optional text to match against report names.",
        },
        include_inactive: {
          type: "boolean",
          description: "Include inactive reports when the current user is allowed to read them.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum report summaries to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous search_reports response.",
        },
      },
    },
  },
  {
    name: "search_report_folders",
    title: "Search Realinsight Report Folders",
    cli: "ri-agent search-report-folders [--parent-folder-id REPORT]",
    route: "GET /agent/reports/folders/search",
    scope: ANALYTICS_READ_SCOPE,
    description: "Search report folders by parent folder. Use this when the user asks to place a report in a specific folder. Omitted parent_folder_id searches the report root.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        parent_folder_id: {
          type: "string",
          description: "Optional parent report folder id. Use REPORT or ROOT for the root folder.",
        },
        include_inactive: {
          type: "boolean",
          description: "Include inactive folders when the current user is allowed to read them.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum report folders to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous search_report_folders response.",
        },
      },
    },
  },
  {
    name: "get_report",
    title: "Get Realinsight Report",
    cli: "ri-agent get-report REPORT_ID",
    route: "GET /agent/reports/configurations/{report_id}",
    scope: ANALYTICS_READ_SCOPE,
    description: "Read one compact report definition, including editable LIST setup and the latest conflict_token. This inspects configuration, not report execution output. Always call it immediately before validate_update_report, update_report, validate_delete_report, or delete_report.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Report ObjectId returned by search_reports, dashboard/workbench tools, or another report configuration response.",
        },
      },
      required: ["report_id"],
    },
  },
  {
    name: "get_chart_of_accounts",
    title: "Get Realinsight Chart Of Accounts",
    cli: "ri-agent get-chart-of-accounts [COA_ID|--coa-data-id ID|--search-text TEXT]",
    route: "POST /agent/chart-of-accounts/get",
    scope: "",
    description: "Read or search chart-of-accounts data in the authenticated Realinsight context. Use this for account layouts, labels, COMPUTE rows, account types, availability, rollup mappings, external GL mappings, system-code mappings, or to resolve a raw COAData id returned by an accounts field in get_records. Results wrap the existing AccountsDTO as chart; account rows are in chart.Layout.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        coa_id: {
          type: "string",
          description: "Chart of Accounts ObjectId. Use when reading one chart in detail.",
        },
        coa_ids: {
          type: "array",
          items: { type: "string" },
          description: "One or more Chart of Accounts ids.",
        },
        chart_code: {
          type: "string",
          description: "Exact ChartOfAccountsCode lookup.",
        },
        chart_name: {
          type: "string",
          description: "Exact chart name lookup.",
        },
        coa_data_id: {
          type: "string",
          description: "COAData id from an accounts record field. The response includes the linked chart and compact COAData values.",
        },
        search_text: {
          type: "string",
          description: "Text search across chart name, description, code, account names, and account numbers.",
        },
        item_ids: {
          type: "array",
          items: { type: "string" },
          description: "Filter returned account rows by COA item id.",
        },
        account_numbers: {
          type: "array",
          items: { type: "string" },
          description: "Filter returned account rows by account number, using AccountId or AccountId-AccountSubId.",
        },
        account_names: {
          type: "array",
          items: { type: "string" },
          description: "Filter returned account rows by account name contains-match.",
        },
        item_types: {
          type: "array",
          items: {
            type: "string",
            enum: ["ACCT", "LABEL", "COMPUTE"],
          },
          description: "Filter returned rows by COA item type.",
        },
        account_types: {
          type: "array",
          items: {
            type: "string",
            enum: ["REV", "EXP", "CAP", "MISC", "PAY", "REC", "STAT"],
          },
          description: "Filter returned rows by account type code. Values map to Revenue, Expense, Capital Expenditures, Miscellaneous, Payable, Receivable, and Statistical.",
        },
        sections: {
          type: "string",
          description: "Optional comma-separated sections: metadata,accounts,availability,rollups,monitor_rules,coa_data,data_summary,all.",
        },
        include_accounts: {
          type: "boolean",
          description: "Include chart layout rows. Defaults true for a specific chart or when account filters are supplied.",
        },
        include_coa_data: {
          type: "boolean",
          description: "Include COAData values when coa_data_id is supplied.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 25,
          description: "Maximum chart detail items to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous get_chart_of_accounts response.",
        },
      },
    },
  },
  {
    name: "set_chart_of_accounts",
    title: "Set Realinsight Chart Of Accounts",
    cli: "ri-agent set-chart-of-accounts --request-json JSON --approved",
    route: "POST /agent/chart-of-accounts/set",
    scope: CHART_OF_ACCOUNTS_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Create or patch a chart of accounts after explicit user approval. Supports metadata updates, availability, rollup chart mappings, monitor rule sets, add/update/replace/remove/move account rows, and dry_run validation. Call get_chart_of_accounts first for expected_conflict_token on updates. Core blocks remove_account and high-risk account mapping/type edits when existing data or servicing/financial usage would make the change unsafe.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        coa_id: {
          type: "string",
          description: "Existing Chart of Accounts id. Omit to create a new chart.",
        },
        chart: {
          type: "object",
          additionalProperties: true,
          description: "Top-level chart metadata: chart_code, chart_name, chart_description, parent_folder_id, master_feature_code, periods_per_year, periods_are_months, has_adjustments_default, is_ad_hoc, availability, roll_up_to_charts, monitor_rule_sets.",
        },
        operations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
            properties: {
              op: {
                type: "string",
                enum: [
                  "set_metadata",
                  "set_availability",
                  "set_rollup_charts",
                  "set_roll_up_to_charts",
                  "set_monitor_rule_sets",
                  "add_account",
                  "update_account",
                  "replace_account",
                  "remove_account",
                  "delete_account",
                  "move_account",
                ],
                description: "Patch operation to apply.",
              },
              item_id: {
                type: "string",
                description: "Target account item id for update, replace, remove, or move.",
              },
              account_number: {
                type: "string",
                description: "Alternative account selector using AccountId or AccountId-AccountSubId.",
              },
              chart_order: {
                type: "number",
                description: "New display/order value for move_account.",
              },
              account: {
                type: "object",
                additionalProperties: true,
                description: "Account row payload. Common fields: item_id, item_code, item_type, chart_order, account_number, account_id, account_sub_id, item_name, item_description, field_type, account_type, formula, format, roll_up_to_items, external_xref, external_gl_xref, monitor_rule_set_items, process/system/payment mappings.",
              },
              chart: {
                type: "object",
                additionalProperties: true,
                description: "Metadata payload for set_metadata or section-level operations.",
              },
            },
            required: ["op"],
          },
          description: "Patch operations applied in order. Use add_account for bulk account creation by sending many operations.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_chart_of_accounts. Required for updates.",
        },
        dry_run: {
          type: "boolean",
          description: "Validate and return a normalized preview without saving. Does not require approved=true.",
        },
        change_reason: {
          type: "string",
          description: "Reason to store with the ConfigAuditLog entry.",
        },
        reverses_operation_id: {
          type: "string",
          description: "Optional ConfigAuditLog operation id that this save is intentionally backing out.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
        audit_detail: audit_detail_property(),
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves saving this chart of accounts.",
        },
        confirm_update: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
        confirm_save: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
    },
  },
  {
    name: "search_model_forms",
    title: "Search Realinsight Model Forms",
    cli: "ri-agent search-model-forms [--root-feature-code CODE] [--search-text TEXT]",
    route: "GET /agent/model-forms/configurations/search",
    scope: MODEL_FORMS_READ_SCOPE,
    description: "Search compact model/form summaries visible to the authenticated user. Use this for Excel/PDF template, model map, generated output, posting, or model assignment questions so the agent can choose the correct model_form_id and then call get_model_form.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        root_feature_code: {
          type: "string",
          description: "Optional root feature/entity type code filter, such as CREMaster.",
        },
        parent_folder_id: {
          type: "string",
          description: "Optional workbook process folder ObjectId.",
        },
        search_text: {
          type: "string",
          description: "Optional text to match against model form names.",
        },
        include_inactive: {
          type: "boolean",
          description: "Include inactive model forms when the current user has Configuration access.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum model form summaries to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous search_model_forms response.",
        },
      },
    },
  },
  {
    name: "search_model_form_folders",
    title: "Search Realinsight Model Form Folders",
    cli: "ri-agent search-model-form-folders [--parent-folder-id WORKBOOKPROCESS]",
    route: "GET /agent/model-forms/folders/search",
    scope: MODEL_FORMS_READ_SCOPE,
    description: "Search model form folders by parent folder. Use this when the user asks to place a model form in a specific folder. Omitted parent_folder_id searches the model form root.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        parent_folder_id: {
          type: "string",
          description: "Optional parent workbook process folder id. Use WORKBOOKPROCESS or ROOT for the root folder.",
        },
        include_inactive: {
          type: "boolean",
          description: "Include inactive model form folders when the current user has Configuration access.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 200,
          description: "Maximum model form folders to return.",
        },
        cursor: {
          type: "string",
          description: "Cursor returned by a previous search_model_form_folders response.",
        },
      },
    },
  },
  {
    name: "get_model_form",
    title: "Get Realinsight Model Form",
    cli: "ri-agent get-model-form MODEL_FORM_ID [--sections template,map_tree,used_fields]",
    route: "GET /agent/model-forms/configurations/{model_form_id}",
    scope: MODEL_FORMS_READ_SCOPE,
    description: "Read one compact model/form overview and optionally request focused sections such as template, map_tree, map_definition, node, item, or used_fields. Start with the overview for root dataset, template, map counts, assignment, and conflict token, then request only the map/template detail needed. Use sections=item or map_definition for full COA_REF/COA_ACT/COA_BUD/COA_SERV_BAL layout fields such as account/value/adjustment/total columns. Use map_definition only before create/update map planning because it can be larger.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        model_form_id: {
          type: "string",
          description: "Model form ObjectId from search_model_forms or another model form response.",
        },
        sections: {
          type: "string",
          description: "Optional comma-separated sections: template,map_tree,map_definition,node,item,used_fields.",
        },
        detail_level: {
          type: "string",
          description: "Optional shortcut: overview, map, definition, node, item, or full.",
        },
        node_id: {
          type: "string",
          description: "Optional node id for node/item detail. Use root for the root map.",
        },
        map_item_id: {
          type: "string",
          description: "Optional map item id for item detail.",
        },
      },
      required: ["model_form_id"],
    },
  },
  {
    name: "validate_create_model_form",
    title: "Validate Realinsight Model Form Create",
    cli: "ri-agent validate-create-model-form --request-json JSON",
    route: "POST /agent/model-forms/configurations/validate-create",
    scope: MODEL_FORMS_WRITE_SCOPE,
    description: "Validate a model/form create or derivative copy without writing. Use source_model_form_id plus the source expected_conflict_token from get_model_form when copying an existing model form. For scratch creates, provide root_feature_code and optional map derived from get_model_form map_definition shape. If parent_folder_id is omitted, create_model_form will save under agent/{current user name}.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: model_form_create_properties(false),
      required: ["process_name"],
    },
  },
  {
    name: "create_model_form",
    title: "Create Realinsight Model Form",
    cli: "ri-agent create-model-form --request-json JSON --approved",
    route: "POST /agent/model-forms/configurations",
    scope: MODEL_FORMS_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Create a model/form or derivative copy after explicit user approval. If parent_folder_id is omitted, Core creates/uses agent/{current user name}; pass WORKBOOKPROCESS or ROOT only when the user explicitly asks for root, or use search_model_form_folders for a specific folder. Prefer source_model_form_id when extending an existing model, then download/upload the template and update the map only if needed. Core validates Configuration/Admin access and derives ConfigAuditLog changes server-side. Default audit_detail is summary; request changes or full only when audit/reversal work needs it. After success, summarize the new model form name, source/copy context, root feature, major map/template details, warnings, and a model_form_id or link only when useful.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: model_form_create_properties(true),
      required: ["process_name", "approved"],
    },
  },
  {
    name: "validate_update_model_form",
    title: "Validate Realinsight Model Form Update",
    cli: "ri-agent validate-update-model-form MODEL_FORM_ID --request-json JSON",
    route: "POST /agent/model-forms/configurations/{model_form_id}/validate-update",
    scope: MODEL_FORMS_WRITE_SCOPE,
    description: "Validate model/form metadata plus either focused map_patch edits or full flat map replacement without writing. Prefer map_patch for small node/item edits after reading the target node or item; use map only for bulk replacement/revert after requesting map_definition. Root dataset changes on existing model forms are blocked; create a derivative model instead.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        model_form_id: {
          type: "string",
          description: "Model form ObjectId from get_model_form.",
        },
        process_name: {
          type: "string",
          description: "User-facing model form name. Preserve the existing value from get_model_form when unchanged.",
        },
        process_description: {
          type: "string",
          description: "Optional model form description. Preserve the existing value from get_model_form when unchanged.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target workbook process folder id. Use WORKBOOKPROCESS for the root folder and preserve the current value when unchanged.",
        },
        global_assignment: {
          type: "boolean",
          description: "Whether the model form is globally assigned. Preserve the current value when unchanged.",
        },
        file_name_template: {
          type: "string",
          description: "Optional generated file-name template. Preserve the existing value from get_model_form when unchanged.",
        },
        map: {
          ...model_form_map_schema("Optional full flat map replacement for bulk import/revert. Request get_model_form sections=map_definition first, preserve unchanged nodes/items, and use temporary ids for new nodes/items. Read the model-form skill reference for detailed node/item fields and usage/relationship semantics before writing. Do not send with map_patch."),
        },
        map_patch: model_form_map_patch_schema(),
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_model_form. Required for updates.",
        },
        change_reason: {
          type: "string",
          description: "Optional reason that will be copied to the ConfigAuditLog if the same request is later written.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
      },
      required: ["model_form_id", "expected_conflict_token"],
    },
  },
  {
    name: "update_model_form",
    title: "Update Realinsight Model Form",
    cli: "ri-agent update-model-form MODEL_FORM_ID --request-json JSON --approved",
    route: "POST /agent/model-forms/configurations/{model_form_id}",
    scope: MODEL_FORMS_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Update model/form metadata plus either focused map_patch edits or full flat map replacement after explicit user approval. Prefer map_patch for small node/item edits after reading the target node or item; update_node and update_item merge only supplied fields, while replace_node intentionally replaces a whole node. Use map only for bulk replacement/revert after requesting map_definition. Core validates folder access, checks Configuration/Admin module access, and derives ConfigAuditLog changes server-side. Default audit_detail is summary; request changes or full only when audit/reversal work needs it. After success, summarize changed metadata/map sections, model/form name, warnings, and an open link or model_form_id only when useful for the user to jump back to it.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        model_form_id: {
          type: "string",
          description: "Model form ObjectId from get_model_form.",
        },
        process_name: {
          type: "string",
          description: "User-facing model form name. Preserve the existing value from get_model_form when unchanged.",
        },
        process_description: {
          type: "string",
          description: "Optional model form description. Preserve the existing value from get_model_form when unchanged.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target workbook process folder id. Use WORKBOOKPROCESS for the root folder and preserve the current value when unchanged.",
        },
        global_assignment: {
          type: "boolean",
          description: "Whether the model form is globally assigned. Preserve the current value when unchanged.",
        },
        file_name_template: {
          type: "string",
          description: "Optional generated file-name template. Preserve the existing value from get_model_form when unchanged.",
        },
        map: {
          ...model_form_map_schema("Optional full flat map replacement for bulk import/revert. Request get_model_form sections=map_definition first, preserve unchanged nodes/items, and use temporary ids for new nodes/items. Read the model-form skill reference for detailed node/item fields and usage/relationship semantics before writing. Do not send with map_patch."),
        },
        map_patch: model_form_map_patch_schema(),
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_model_form. Required for updates.",
        },
        change_reason: {
          type: "string",
          description: "Reason to store with the ConfigAuditLog entry.",
        },
        reverses_operation_id: {
          type: "string",
          description: "Optional ConfigAuditLog operation id that this save is intentionally backing out.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
        audit_detail: audit_detail_property(),
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves updating this model form metadata.",
        },
        confirm_update: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
        confirm_save: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
      required: ["model_form_id", "expected_conflict_token", "approved"],
    },
  },
  {
    name: "download_model_form_template",
    title: "Download Realinsight Model Form Template",
    cli: "ri-agent download-model-form-template MODEL_FORM_ID --output-path ./template.xlsx",
    route: "GET /agent/model-forms/configurations/{model_form_id}/template-file",
    scope: MODEL_FORMS_READ_SCOPE,
    description: "Download the current Excel template metadata and a short-lived signed download_url for a model form. In local stdio MCP/CLI usage, pass output_path so the workbook is fetched outside the tool result and written to a local file. In hosted MCP, use download_url only when the harness can fetch files outside model context.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        model_form_id: {
          type: "string",
          description: "Model form ObjectId from get_model_form.",
        },
        output_path: {
          type: "string",
          description: "Local path where the downloaded Excel template should be written. Preferred for stdio MCP/CLI use.",
        },
      },
      required: ["model_form_id"],
    },
  },
  {
    name: "stage_model_form_template_file",
    title: "Stage Realinsight Model Form Template File",
    cli: "ri-agent stage-model-form-template MODEL_FORM_ID --file-path ./template.xlsx --approved",
    route: "POST /agent/model-forms/configurations/{model_form_id}/template-file/stage",
    scope: MODEL_FORMS_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Create a signed upload session for an Excel template after explicit user approval. Local CLI/stdio MCP callers can pass file_path and the toolkit uploads it to upload_url outside chat context. Hosted clients should call this with file_name/content_type, upload the file as multipart form field `file` to the returned upload_url, then pass staged_file_id to upload_model_form_template. The staged file is bound to this model form and user.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        model_form_id: {
          type: "string",
          description: "Model form ObjectId from get_model_form. The staged file can only be consumed for this model form.",
        },
        file_path: {
          type: "string",
          description: "Local Excel file path to stage. Preferred for stdio MCP/CLI use.",
        },
        file_name: {
          type: "string",
          description: "Excel template file name ending in .xlsx, .xlsm, or .xls. Required when file_path is not supplied.",
        },
        content_type: {
          type: "string",
          description: "Optional Excel content type. Defaults from file_name when omitted.",
        },
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves creating an upload URL for this file.",
        },
        confirm_upload: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
      required: ["model_form_id", "approved"],
    },
  },
  {
    name: "upload_model_form_template",
    title: "Upload Realinsight Model Form Template",
    cli: "ri-agent upload-model-form-template MODEL_FORM_ID --file-path ./template.xlsx --expected-conflict-token TOKEN --approved",
    route: "POST /agent/model-forms/configurations/{model_form_id}/template-file",
    scope: MODEL_FORMS_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Finalize a replacement Excel template after explicit user approval. Prefer file_path in local stdio MCP/CLI usage, which creates a signed upload session, uploads the file outside chat context, and then sends staged_file_id. Hosted clients should pass staged_file_id after uploading to the signed upload_url from stage_model_form_template_file. Call get_model_form first for expected_conflict_token. Core validates Excel type, stores a new repository file, consumes the staged file, updates template metadata, and derives ConfigAuditLog changes server-side. Default audit_detail is summary; request changes or full only when audit/reversal work needs it. After success, summarize the model form name, file name, template change, warnings, and model_form_id only when useful.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        model_form_id: {
          type: "string",
          description: "Model form ObjectId from get_model_form.",
        },
        file_path: {
          type: "string",
          description: "Local Excel file path to upload. Preferred for stdio MCP/CLI use; the toolkit stages it before final save.",
        },
        staged_file_id: {
          type: "string",
          description: "Staged upload id returned by stage_model_form_template_file after the Excel file is uploaded to the signed upload_url. Required unless file_path is supplied locally.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_model_form. Required.",
        },
        change_reason: {
          type: "string",
          description: "Reason to store with the ConfigAuditLog entry.",
        },
        reverses_operation_id: {
          type: "string",
          description: "Optional ConfigAuditLog operation id that this save is intentionally backing out.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
        audit_detail: audit_detail_property(),
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves uploading this template.",
        },
        confirm_update: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
        confirm_save: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
      required: ["model_form_id", "expected_conflict_token", "approved"],
    },
  },
  {
    name: "validate_create_report",
    title: "Validate Realinsight Report Create",
    cli: "ri-agent validate-create-report --request-json JSON",
    route: "POST /agent/reports/configurations/validate-create",
    scope: REPORT_WRITE_SCOPE,
    description: "Validate and normalize a LIST report create request without writing. Choose the report grain first; use get_tool_reference topic=reports for payload shape and topic=report_computed_fields for column order, computed formulas, or aggregate behavior. If parent_folder_id is omitted, create_report will save under agent/{current user name}.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_type: {
          type: "string",
          description: "Report type. Use LIST; analytic/composite writes are deferred.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target report folder id. Omit to let create_report use agent/{current user name}; use REPORT or ROOT only when the user explicitly asks for root.",
        },
        report_name: {
          type: "string",
          description: "User-facing report name.",
        },
        report_description: {
          type: "string",
          description: "Optional report description.",
        },
        publish_to_users: {
          type: "boolean",
          description: "Whether other users can see the report.",
        },
        list: {
          type: "object",
          additionalProperties: true,
          description: "LIST report configuration object. Use get_tool_reference topic=reports format=schema for shape and topic=report_computed_fields for column order, computed formulas, or aggregate behavior. Every data_set.feature_code must belong to the same top-level feature family as master_feature_code.",
        },
        change_reason: {
          type: "string",
          description: "Optional reason that will be copied to the ConfigAuditLog if the same request is later written.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
      },
      required: ["report_name", "list"],
    },
  },
  {
    name: "validate_update_report",
    title: "Validate Realinsight Report Update",
    cli: "ri-agent validate-update-report REPORT_ID --request-json JSON",
    route: "POST /agent/reports/configurations/{report_id}/validate-update",
    scope: REPORT_WRITE_SCOPE,
    description: "Validate and normalize a LIST report update request without writing. Call get_report first and pass its latest conflict_token as expected_conflict_token. Use get_fields for dataset feature codes before adding or changing columns, filters, sorts, prompts, column order, or computed formulas.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Report ObjectId from get_report.",
        },
        report_type: {
          type: "string",
          description: "Report type. Use LIST; analytic/composite writes are deferred.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target report folder id. Use REPORT or ROOT for the root folder and preserve the current value when unchanged.",
        },
        report_name: {
          type: "string",
          description: "User-facing report name.",
        },
        report_description: {
          type: "string",
          description: "Optional report description.",
        },
        publish_to_users: {
          type: "boolean",
          description: "Whether other users can see the report.",
        },
        list: {
          type: "object",
          additionalProperties: true,
          description: "Normalized LIST report configuration object. Use get_tool_reference topic=reports format=schema for shape and topic=report_computed_fields for column order, computed formulas, or aggregate behavior.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report. Required for updates.",
        },
        change_reason: {
          type: "string",
          description: "Optional reason that will be copied to the ConfigAuditLog if the same request is later written.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
      },
      required: ["report_id", "report_name", "list", "expected_conflict_token"],
    },
  },
  {
    name: "validate_delete_report",
    title: "Validate Realinsight Report Delete",
    cli: "ri-agent validate-delete-report REPORT_ID --expected-conflict-token TOKEN",
    route: "POST /agent/reports/configurations/{report_id}/validate-delete",
    scope: REPORT_WRITE_SCOPE,
    description: "Validate LIST report delete prerequisites without writing. Call get_report first and pass its latest conflict_token. If active schedules, related analytics, dashboard references, or workbench lists would be changed, validation blocks the delete and the user must use the Realinsight app for the cascading cleanup.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Report ObjectId from get_report.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report.",
        },
      },
      required: ["report_id", "expected_conflict_token"],
    },
  },
  {
    name: "create_report",
    title: "Create Realinsight Report",
    cli: "ri-agent create-report --request-json JSON --approved",
    route: "POST /agent/reports/configurations",
    scope: REPORT_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Create a LIST report definition after explicit user approval. If parent_folder_id is omitted, Core creates/uses agent/{current user name}; pass REPORT or ROOT only when the user explicitly asks for root, or use search_report_folders for a specific folder. Run validate_create_report first, review normalized_preview/errors with the user, then call this with approved=true. Core validates again, persists the definition, and derives ConfigAuditLog changes server-side. Default audit_detail is summary; request changes or full only when audit/reversal work needs it. After success, summarize the report name, master feature, meaningful saved sections, warnings, and an open link or report_id only when useful for the user to jump back to it.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_type: {
          type: "string",
          description: "Report type. Use LIST; analytic/composite writes are deferred.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target report folder id. Omit to let create_report use agent/{current user name}; use REPORT or ROOT only when the user explicitly asks for root.",
        },
        report_name: {
          type: "string",
          description: "User-facing report name.",
        },
        report_description: {
          type: "string",
          description: "Optional report description.",
        },
        publish_to_users: {
          type: "boolean",
          description: "Whether other users can see the report.",
        },
        list: {
          type: "object",
          additionalProperties: true,
          description: "LIST report configuration object. Use get_tool_reference topic=reports format=schema for shape and topic=report_computed_fields for column order, computed formulas, or aggregate behavior.",
        },
        change_reason: {
          type: "string",
          description: "Reason to store with the ConfigAuditLog entry.",
        },
        reverses_operation_id: {
          type: "string",
          description: "Optional ConfigAuditLog operation id that this save is intentionally backing out.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
        audit_detail: audit_detail_property(),
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves creating this report.",
        },
        confirm_save: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
      required: ["report_name", "list", "approved"],
    },
  },
  {
    name: "update_report",
    title: "Update Realinsight Report",
    cli: "ri-agent update-report REPORT_ID --request-json JSON --approved",
    route: "POST /agent/reports/configurations/{report_id}",
    scope: REPORT_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Update a LIST report definition after explicit user approval. Call get_report first, pass the latest expected_conflict_token, run validate_update_report, then call this with approved=true. Core derives ConfigAuditLog changes server-side. Default audit_detail is summary; request changes or full only when audit/reversal work needs it. After success, summarize the report name, meaningful changed sections, warnings, and an open link or report_id only when useful for the user to jump back to it.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Report ObjectId from get_report.",
        },
        report_type: {
          type: "string",
          description: "Report type. Use LIST; analytic/composite writes are deferred.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target report folder id. Use REPORT or ROOT for the root folder and preserve the current value when unchanged.",
        },
        report_name: {
          type: "string",
          description: "User-facing report name.",
        },
        report_description: {
          type: "string",
          description: "Optional report description.",
        },
        publish_to_users: {
          type: "boolean",
          description: "Whether other users can see the report.",
        },
        list: {
          type: "object",
          additionalProperties: true,
          description: "Normalized LIST report configuration object. Use get_tool_reference topic=reports format=schema for shape and topic=report_computed_fields for column order, computed formulas, or aggregate behavior.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report. Required for updates.",
        },
        change_reason: {
          type: "string",
          description: "Reason to store with the ConfigAuditLog entry.",
        },
        reverses_operation_id: {
          type: "string",
          description: "Optional ConfigAuditLog operation id that this save is intentionally backing out.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
        audit_detail: audit_detail_property(),
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves updating this report.",
        },
        confirm_update: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
        confirm_save: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
      required: ["report_id", "report_name", "list", "expected_conflict_token", "approved"],
    },
  },
  {
    name: "delete_report",
    title: "Delete Realinsight Report",
    cli: "ri-agent delete-report REPORT_ID --expected-conflict-token TOKEN --approved",
    route: "DELETE /agent/reports/configurations/{report_id}",
    scope: REPORT_WRITE_SCOPE,
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    description: "Soft-delete a LIST report definition after explicit user approval only when validate_delete_report reports no active downstream resources. Core validates the latest conflict token and derives ConfigAuditLog changes server-side. Default audit_detail is summary; request changes or full only when audit/reversal work needs it. After success, summarize the deleted report name and warnings without raw ids unless needed for follow-up.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        report_id: {
          type: "string",
          description: "Report ObjectId from get_report.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report.",
        },
        change_reason: {
          type: "string",
          description: "Reason to store with the ConfigAuditLog entry.",
        },
        reverses_operation_id: {
          type: "string",
          description: "Optional ConfigAuditLog operation id that this delete is intentionally backing out.",
        },
        correlation_id: {
          type: "string",
          description: "Optional caller correlation id.",
        },
        source_reference: {
          type: "string",
          description: "Optional caller source reference.",
        },
        audit_detail: audit_detail_property(),
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves deleting this report.",
        },
        confirm_delete: {
          type: "boolean",
          description: "Alias for approved=true after explicit user approval.",
        },
      },
      required: ["report_id", "expected_conflict_token", "approved"],
    },
  },
];

export const AGENT_TOOLS = ALL_AGENT_TOOLS.filter((tool) => (
  WRITE_TOOLS_ENABLED || !WRITE_TOOL_NAMES.has(tool.name)
));

function model_form_map_schema(description) {
  return {
    type: "object",
    additionalProperties: true,
    description,
  };
}

function model_form_map_patch_schema() {
  return {
    type: "object",
    additionalProperties: true,
    description: "Optional focused map patch for small edits. Prefer this for add/update/remove node/item operations. update_node and update_item merge supplied fields, including nested COA layout fields; replace_node replaces full node contents. Read the model-form skill reference for detailed node/item fields and usage/relationship semantics before writing. Do not send with map.",
    properties: {
      operations: {
        type: "array",
        description: "Ordered map patch operations.",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            op: {
              type: "string",
              enum: ["add_node", "update_node", "replace_node", "remove_node", "add_item", "update_item", "remove_item"],
              description: "Patch operation.",
            },
            node_id: { type: "string", description: "Target node id for node/item operations. Use root for the root map." },
            map_item_id: { type: "string", description: "Target map item id for update_item/remove_item." },
            parent_node_id: { type: "string", description: "Parent node id for add_node when node.parent_node_id is omitted." },
            remove_children: { type: "boolean", description: "For remove_node, set true to remove a full subtree." },
            node: { type: "object", additionalProperties: true },
            item: { type: "object", additionalProperties: true },
          },
          required: ["op"],
        },
      },
    },
    required: ["operations"],
  };
}

function model_form_create_properties(write) {
  const props = {
    profile: {
      type: "string",
      description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
    },
    source_model_form_id: {
      type: "string",
      description: "Optional source model form ObjectId to copy from. Use this when creating a derivative of an existing model form.",
    },
    root_feature_code: {
      type: "string",
      description: "Root feature/entity type code required when source_model_form_id is omitted.",
    },
    process_name: {
      type: "string",
      description: "User-facing model form name.",
    },
    process_description: {
      type: "string",
      description: "Optional model form description.",
    },
    parent_folder_id: {
      type: "string",
      description: "Target workbook process folder id. Omit to let create_model_form use agent/{current user name}; use WORKBOOKPROCESS or ROOT only when the user explicitly asks for root.",
    },
    global_assignment: {
      type: "boolean",
      description: "Whether the model form is globally assigned.",
    },
    file_name_template: {
      type: "string",
      description: "Optional generated file-name template.",
    },
    template_name: {
      type: "string",
      description: "Optional template metadata name. Defaults from process_name.",
    },
    template_description: {
      type: "string",
      description: "Optional template metadata description.",
    },
    map: {
      ...model_form_map_schema("Optional full flat map request. Use get_model_form sections=map_definition for the current shape; new node/item ids may be temporary strings. Read the model-form skill reference for detailed node/item fields and usage/relationship semantics before writing."),
    },
    expected_conflict_token: {
      type: "string",
      description: "Required latest source conflict_token from get_model_form when source_model_form_id is supplied.",
    },
    change_reason: {
      type: "string",
      description: "Reason to store with the ConfigAuditLog entry.",
    },
    reverses_operation_id: {
      type: "string",
      description: "Optional ConfigAuditLog operation id that this save is intentionally backing out.",
    },
    correlation_id: {
      type: "string",
      description: "Optional caller correlation id.",
    },
    source_reference: {
      type: "string",
      description: "Optional caller source reference.",
    },
  };

  if (write) {
    props.audit_detail = audit_detail_property();
    props.approved = {
      type: "boolean",
      description: "Must be true only after the user explicitly approves creating this model form.",
    };
    props.confirm_save = {
      type: "boolean",
      description: "Alias for approved=true after explicit user approval.",
    };
  }

  return props;
}

function audit_detail_property() {
  return {
    type: "string",
    enum: ["summary", "changes", "full"],
    description: "Optional ConfigAuditLog response detail. Defaults to summary with operation metadata only; changes includes changed paths/types without before/after values; full includes before/after values and can be large.",
  };
}

function parse_env_bool(value, default_value = false) {
  if (value === undefined || value === null || value === "") return default_value;

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}
