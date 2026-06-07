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
  "ri:structure.read",
  "ri:analytics.read",
].join(" ");
export const REFRESH_SKEW_MS = 2 * 60 * 1000;
export const CONFIG_PATH = process.env.REALINSIGHT_AGENT_CONFIG
  || path.join(os.homedir(), ".realinsight", "agent-toolkit.json");
export const DEFAULT_MAX_TOOL_RESULT_BYTES = 240000;
export const MIN_TOOL_RESULT_BYTES = 20000;

export const PROFILE_READ_SCOPE = "ri:profile.read";
export const SCHEMA_READ_SCOPE = "ri:schema.read";
export const ENTITY_SEARCH_SCOPE = "ri:entity.search";
export const ENTITY_READ_SCOPE = "ri:entity.read";
export const RECORD_READ_SCOPE = "ri:record.read";
export const RECORD_WRITE_SCOPE = "ri:record.write";
export const STRUCTURE_READ_SCOPE = "ri:structure.read";
export const ANALYTICS_READ_SCOPE = "ri:analytics.read";
export const REPORT_WRITE_SCOPE = "ri:reports.write";
export const PIPELINE_READ_SCOPE = "ri:pipeline.read";
export const PIPELINE_QUEUE_SCOPE = "ri:pipeline.queue";
export const PIPELINE_TOOLS_ENABLED = parse_env_bool(process.env.RI_AGENT_ENABLE_PIPELINE_TOOLS);
export const WRITE_TOOLS_ENABLED = parse_env_bool(process.env.RI_AGENT_ENABLE_WRITE_TOOLS);
const PIPELINE_TOOL_NAMES = new Set(["get_pipeline", "queue_pipeline"]);
const WRITE_TOOL_NAMES = new Set([
  "set_record",
  "validate_create_report_configuration",
  "validate_update_report_configuration",
  "validate_delete_report_configuration",
  "create_report_configuration",
  "update_report_configuration",
  "delete_report_configuration",
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
  version: "0.1.0",
};
export const MCP_INSTRUCTIONS = [
  "Realinsight is a commercial real estate asset management and servicing platform.",
  "Use these tools to discover Realinsight schema before asking for entity records or composing reports.",
  "Most tool calls are read-only and all calls run through Core API using the authenticated Realinsight user and customer context.",
  "Prefer search_features first when the user uses business terms such as loans, deals, leases, properties, rent roll, or operating statements.",
  "Use search_fields or get_fields to identify exact schema codes before requesting data in later tools.",
  "Use search_entities for broad entity lookup first; pass schema_codes or feature_code plus field_names when you know the exact searchable fields.",
  "Use get_children after finding a parent entity when the user asks for payment history, rent-roll rows, collateral, owners, or another child dataset.",
  "Use get_latest_children when you need one latest child per parent, then hydrate returned child_entity_id values with get_records.",
  "Use get_records after search_entities to hydrate entity ids with key fields or explicit field values.",
  "Record values can include display_value and expansion hints. Prefer display_value for user-facing answers and value for exact ids/codes.",
  "Use get_entity_structure for parent, master, child, reference, or periodic relationship traversal when the user asks how entities are connected.",
  "Use list_dashboard_pages/get_dashboard_page to discover dashboard analytics already curated for the user.",
  "Use list_workbenches/get_workbench_data when the user asks about existing workbench lists, saved list reports, or cached operational tables.",
  "Use search_report_configurations/get_report_configuration when the user asks to inspect, edit, copy, or delete report definitions.",
  "Before building report configurations, use search_features/get_entity_structure/get_fields to choose one top-level master_feature_code and fields from datasets under that same top-level feature.",
  "Use extract_analytic_entities or extract_workbench_entities to turn cached table rows into compact entity refs for later get_records/get_children calls.",
  "Cached analytic and workbench rows can be large; for multi-page analysis, use CSV tools or paged data tools, write pages to a temporary CSV/JSONL/SQLite table in your environment, then query that local copy.",
  "Server caps are reported in tool result limits. Default cached data pages are small; max page size is 1000 rows, and all=true is capped server-side.",
  "Unset Realinsight dates may appear as null with is_unset_value=true; older raw paths may show 0001-01-01 or 1900-01-01.",
  ...(WRITE_TOOLS_ENABLED
    ? ["set_record and report configuration create/update/delete are write operations: call them only after the user approves the exact side effect, with approved=true."]
    : []),
  ...(PIPELINE_TOOLS_ENABLED
    ? ["Queueing a pipeline is a side effect: call queue_pipeline only after explicit user approval, with approved=true, a DocumentTracking id, and required property/page context."]
    : []),
  "Every tool call can include a profile name; otherwise the active local ri-agent auth profile is used.",
].join("\n");

const ALL_AGENT_TOOLS = [
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
          description: "Optional OAuth scope string. Defaults to the read-only toolkit scope set.",
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
    description: "Find Realinsight feature/entity types that may satisfy a user request.",
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
    description: "Find runtime fields across all features or within one feature.",
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
    description: "List runtime fields for a feature with pagination.",
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
    description: "Find Realinsight entities using generic top-toolbar style search, or by searching one or more explicit CustomerDataSearch fields.",
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
    description: "Fetch child entities for one or more parent entity ids, with optional filters, sorts, global limit, or per-parent limit.",
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
          description: "Child feature code to retrieve, such as LoanPaymentHistory or RentRoll.",
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
    description: "Fetch one latest child entity per parent id using an explicit child date/order field. Use this for latest loan servicing, inspection, operating statement, payment, or rent-roll child records before hydrating the returned child ids.",
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
          description: "Child feature code to retrieve, such as LoanServicing, CREInspection, CREOpStmt, LoanPaymentHistory, or RentRoll.",
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
    description: "Set updateable fields on one Realinsight record after explicit user approval.",
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
    description: "Traverse parent, master, child, reference, referenced-by, or periodic relationships for one or more entities and return a compact graph.",
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
    description: "List dashboard pages available to the authenticated Realinsight user.",
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
    description: "Describe a dashboard page, its analytics, global filters, cache status, and backing reports.",
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
    description: "Read cached analytic data, analytic JSON, and base report column metadata for the current user. Use get_analytic_csv for large local-table analysis and extract_analytic_entities for compact entity handoff.",
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
    description: "List saved workbench lists available to the authenticated user, optionally filtered by workbench code.",
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
    description: "Read cached workbench table data and backing report column metadata for the current user. Use get_workbench_csv for large local-table analysis and extract_workbench_entities for compact entity handoff.",
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
    name: "search_report_configurations",
    title: "Search Realinsight Report Configurations",
    cli: "ri-agent search-report-configurations [--report-type LIST] [--search-text TEXT]",
    route: "GET /agent/reports/configurations/search",
    scope: ANALYTICS_READ_SCOPE,
    description: "Search compact report configuration summaries visible to the authenticated user. Use this before editing, copying, or deleting a report so the agent can choose the correct report_id and then call get_report_configuration for the latest conflict token.",
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
          description: "Cursor returned by a previous search_report_configurations response.",
        },
      },
    },
  },
  {
    name: "get_report_configuration",
    title: "Get Realinsight Report Configuration",
    cli: "ri-agent get-report-configuration REPORT_ID",
    route: "GET /agent/reports/configurations/{report_id}",
    scope: ANALYTICS_READ_SCOPE,
    description: "Read one compact report configuration, including editable LIST configuration and the latest conflict_token. Always call this immediately before validate_update_report_configuration, update_report_configuration, validate_delete_report_configuration, or delete_report_configuration.",
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
          description: "Report ObjectId returned by search_report_configurations, dashboard/workbench tools, or another report configuration response.",
        },
      },
      required: ["report_id"],
    },
  },
  {
    name: "validate_create_report_configuration",
    title: "Validate Realinsight Report Create",
    cli: "ri-agent validate-create-report-configuration --request-json JSON",
    route: "POST /agent/reports/configurations/validate-create",
    scope: REPORT_WRITE_SCOPE,
    description: "Validate and normalize a LIST report create request without writing. Before calling, use search_features/get_entity_structure to choose one master_feature_code, and get_fields for every dataset feature_code so columns use valid field names. Core rejects datasets outside the same top-level feature family.",
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
          description: "Target report folder id. Use REPORT for the root folder.",
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
          description: "LIST report configuration. Include master_feature_code, data_sets, columns, sorts, criteria, prompts, team_role_criteria, and aggregate_group_by as needed. Every data_set.feature_code must belong to the same top-level feature family as master_feature_code.",
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
    name: "validate_update_report_configuration",
    title: "Validate Realinsight Report Update",
    cli: "ri-agent validate-update-report-configuration REPORT_ID --request-json JSON",
    route: "POST /agent/reports/configurations/{report_id}/validate-update",
    scope: REPORT_WRITE_SCOPE,
    description: "Validate and normalize a LIST report update request without writing. Call get_report_configuration first and pass its latest conflict_token as expected_conflict_token. Use get_fields for dataset feature codes before adding or changing columns.",
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
          description: "Report ObjectId from get_report_configuration.",
        },
        report_type: {
          type: "string",
          description: "Report type. Use LIST; analytic/composite writes are deferred.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target report folder id. Use REPORT for the root folder.",
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
          description: "Full normalized LIST report configuration to save. Every data_set.feature_code must belong to the same top-level feature family as list.master_feature_code.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report_configuration. Required for updates.",
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
    name: "validate_delete_report_configuration",
    title: "Validate Realinsight Report Delete",
    cli: "ri-agent validate-delete-report-configuration REPORT_ID --expected-conflict-token TOKEN",
    route: "POST /agent/reports/configurations/{report_id}/validate-delete",
    scope: REPORT_WRITE_SCOPE,
    description: "Validate report delete prerequisites without writing and return affected resources such as schedules, related analytics, dashboard references, and workbench lists. Call get_report_configuration first and pass its latest conflict_token.",
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
          description: "Report ObjectId from get_report_configuration.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report_configuration.",
        },
      },
      required: ["report_id", "expected_conflict_token"],
    },
  },
  {
    name: "create_report_configuration",
    title: "Create Realinsight Report Configuration",
    cli: "ri-agent create-report-configuration --request-json JSON --approved",
    route: "POST /agent/reports/configurations",
    scope: REPORT_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Create a LIST report after explicit user approval. Run validate_create_report_configuration first, review normalized_preview/errors with the user, then call this with approved=true. Core validates again, persists the report, and derives ConfigAuditLog changes server-side.",
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
          description: "Target report folder id. Use REPORT for the root folder.",
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
          description: "Full LIST report configuration. Use one master_feature_code and only datasets under the same top-level feature family.",
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
    name: "update_report_configuration",
    title: "Update Realinsight Report Configuration",
    cli: "ri-agent update-report-configuration REPORT_ID --request-json JSON --approved",
    route: "POST /agent/reports/configurations/{report_id}",
    scope: REPORT_WRITE_SCOPE,
    readOnlyHint: false,
    idempotentHint: false,
    description: "Update a LIST report after explicit user approval. Call get_report_configuration first, pass the latest expected_conflict_token, run validate_update_report_configuration, then call this with approved=true. Core derives ConfigAuditLog changes server-side.",
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
          description: "Report ObjectId from get_report_configuration.",
        },
        report_type: {
          type: "string",
          description: "Report type. Use LIST; analytic/composite writes are deferred.",
        },
        parent_folder_id: {
          type: "string",
          description: "Target report folder id. Use REPORT for the root folder.",
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
          description: "Full normalized LIST report configuration to save. Every data_set.feature_code must belong to the same top-level feature family as list.master_feature_code.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report_configuration. Required for updates.",
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
    name: "delete_report_configuration",
    title: "Delete Realinsight Report Configuration",
    cli: "ri-agent delete-report-configuration REPORT_ID --expected-conflict-token TOKEN --approved",
    route: "DELETE /agent/reports/configurations/{report_id}",
    scope: REPORT_WRITE_SCOPE,
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    description: "Soft-delete a report after explicit user approval. Call get_report_configuration and validate_delete_report_configuration first. Core validates the latest conflict token, deactivates affected resources as needed, and derives ConfigAuditLog changes server-side.",
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
          description: "Report ObjectId from get_report_configuration.",
        },
        expected_conflict_token: {
          type: "string",
          description: "Latest conflict_token from get_report_configuration.",
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
  {
    name: "get_pipeline",
    title: "Get Realinsight Pipeline Status",
    cli: "ri-agent get-pipeline PIPELINE_ID",
    route: "GET /agent/pipelines/{id}",
    scope: PIPELINE_READ_SCOPE,
    description: "Read compact status for an allowlisted Realinsight pipeline.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        pipeline_id: {
          type: "string",
          description: "Pipeline instance id returned by queue_pipeline or another Realinsight workflow.",
        },
      },
      required: ["pipeline_id"],
    },
  },
  {
    name: "queue_pipeline",
    title: "Queue Realinsight Pipeline",
    cli: "ri-agent queue-pipeline PIPELINE_TYPE --doc-id DOC_ID --approved [--property-entity-id CRE_ID] [--start-page N] [--end-page N]",
    route: "POST /agent/pipelines/queue",
    scope: PIPELINE_QUEUE_SCOPE,
    description: "Queue an allowlisted Realinsight document pipeline after explicit user approval.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        profile: {
          type: "string",
          description: "Optional local ri-agent auth profile name. Uses the active profile when omitted.",
        },
        pipeline_type: {
          type: "string",
          enum: ["doc_extract", "rent_roll_extract", "financial_extraction", "entity_extraction", "op_stmt_spread"],
          description: "Allowlisted pipeline type to queue.",
        },
        doc_id: {
          type: "string",
          description: "DocumentTracking id already stored in Realinsight. Direct local file upload is planned separately.",
        },
        property_entity_id: {
          type: "string",
          description: "CREMaster/property entity id required for rent_roll_extract, financial_extraction, and op_stmt_spread.",
        },
        start_page: {
          type: "integer",
          minimum: 1,
          description: "First document page to run for page-scoped pipelines. Required except for doc_extract.",
        },
        end_page: {
          type: "integer",
          minimum: 0,
          description: "Last document page to run. Use 0 to continue through the end of the document.",
        },
        thread_id: {
          type: "string",
          description: "Optional Realinsight message thread id to associate with the pipeline.",
        },
        approved: {
          type: "boolean",
          description: "Must be true only after the user explicitly approves queueing this side-effecting pipeline.",
        },
        root_entity_id: {
          type: "string",
          description: "Optional root entity id for entity_extraction context.",
        },
        root_feature_code: {
          type: "string",
          description: "Optional root feature code for entity_extraction context.",
        },
        root_label: {
          type: "string",
          description: "Optional user-facing root label for entity_extraction context.",
        },
        master_entity_id: {
          type: "string",
          description: "Optional master entity id for entity_extraction context.",
        },
        master_feature_code: {
          type: "string",
          description: "Optional master feature code for entity_extraction context.",
        },
        parent_entity_id: {
          type: "string",
          description: "Optional parent entity id for entity_extraction context.",
        },
        parent_feature_code: {
          type: "string",
          description: "Optional parent feature code for entity_extraction context.",
        },
        as_of_date: {
          type: "string",
          description: "Optional as-of date for entity_extraction context.",
        },
      },
      required: ["pipeline_type", "doc_id", "approved"],
    },
  },
];

export const AGENT_TOOLS = ALL_AGENT_TOOLS.filter((tool) => (
  (PIPELINE_TOOLS_ENABLED || !PIPELINE_TOOL_NAMES.has(tool.name))
  && (WRITE_TOOLS_ENABLED || !WRITE_TOOL_NAMES.has(tool.name))
));

function parse_env_bool(value) {
  if (value === undefined || value === null || value === "") return false;

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}
