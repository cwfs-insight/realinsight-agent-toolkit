export function integrator_tool_definitions(payloads) {
  const string = (description) => ({ type: "string", description });
  const page = { limit: { type: "integer", minimum: 1, maximum: 100 }, cursor: string("Offset cursor returned by the previous page.") };
  const object = (properties, required = []) => ({ type: "object", additionalProperties: false, properties, required });
  const generated = (name) => {
    if (!payloads[name]) throw new Error(`Missing generated integrator schema: ${name}`);
    return structuredClone(payloads[name]);
  };
  const commands = { get_integrator_folders: "folders", search_integrators: "search", get_integrator: "get", get_integrator_match_schema: "match-schema", get_integrator_connections: "connections", set_integrator: "set", stage_integrator_source_file: "stage-source", inspect_integrator_source: "inspect-source", run_integrator: "run", get_integrator_run: "status" };
  const routes = { get_integrator_folders: "GET /agent/integrators/folders", search_integrators: "POST /agent/integrators/search", get_integrator: "GET /agent/integrators/{integrator_id}", get_integrator_match_schema: "GET /agent/integrators/schema/{feature_code}", get_integrator_connections: "GET /agent/integrators/connections", set_integrator: "POST /agent/integrators/set", stage_integrator_source_file: "POST /agent/integrators/sources/stage", inspect_integrator_source: "POST /agent/integrators/sources/inspect", run_integrator: "POST /agent/integrators/run", get_integrator_run: "POST /agent/integrators/runs/get" };
  const tool = (name, description, schema, write = false, destructive = false) => ({
    name, title: name.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "), description,
    scope: `ri:integrators.${name === "run_integrator" ? "run" : write ? "write" : "read"}`,
    cli: `ri-agent integrators ${commands[name]} --request-file REQUEST.json`, route: routes[name],
    readOnlyHint: !write, destructiveHint: destructive, idempotentHint: !write, openWorldHint: name === "run_integrator",
    inputSchema: { ...schema, properties: { profile: string("Optional local ri-agent profile."), ...schema.properties } },
  });
  const stage = generated("integrator_source_stage");
  stage.properties.file_path = string("Local CSV/XLSX/XLSM path. Uploads outside model context; file_name defaults to the basename. Hosted callers upload to the returned signed upload_url instead.");
  stage.required = ["approved"];
  return [
    tool("search_integrators", "Find existing import definitions by name, target feature, or folder before deciding whether to reuse or create an integrator.", generated("integrator_search")),
    tool("get_integrator_folders", "Discover active integrator folders and group placement before choosing ParentFolderId. INTEGRATORPROCESS is the root.", object({ ...page, parent_folder_id: string("Optional parent folder id.") })),
    tool("get_integrator", "Read the complete source, ordered match keys, insert/update options, value translations, references, COA mappings, and conflict token. Definition properties retain their existing PascalCase names.", object({ integrator_id: string("Integrator id from search_integrators.") }, ["integrator_id"])),
    tool("get_integrator_match_schema", "Discover the required master-to-target match hierarchy, periodic keys, suggested identity fields, and matching options. Suggested keys do not prove uniqueness; use get_fields for exact writable fields and allowed values.", object({ feature_code: string("Exact dictionary target feature from search_features.") }, ["feature_code"])),
    tool("get_integrator_connections", "List configured SQL connections and listener capability/heartbeat readiness without passwords, tokens, or connection strings. Source SQL executes through the customer's listener.", object(page)),
    tool("set_integrator", "Validate or save a complete integrator definition. Default dry_run=true returns can_save, can_run, errors, run_errors, and warnings. For writes set dry_run=false and approved=true after exact approval. Updates require expected_conflict_token from get_integrator. Omitted map/settings values are replaced, so preserve unchanged configuration.", generated("integrator_set"), true, true),
    tool("stage_integrator_source_file", "Stage an approved temporary source upload before inspecting or importing a CSV or Excel file. Files are customer/user-bound, expire after three days, and are limited to 25 MiB. CSV becomes worksheet Source with text-preserving values.", stage, true),
    tool("inspect_integrator_source", "Preview workbook/CSV sheets, headers, sample rows, distinct values, and blank/duplicate composite keys before building mappings. Source column names are Excel letters, including converted CSV. Checks cover at most 5000 data rows and do not prove full-source uniqueness.", generated("integrator_source_inspect")),
    tool("run_integrator", "Queue an asynchronous scan_headers, scan_values, query, test_connection, or apply operation after explicit approval of the exact source/SQL and mode. Query suppresses Realinsight posting but SQL can still have source-side effects. Apply can insert/update data and trigger post-save actions. Requires the current conflict token. Never automatically retry; poll get_integrator_run with returned run_id and run_kind.", generated("integrator_run"), true, true),
    tool("get_integrator_run", "Poll an integrator run through SQL extraction and downstream scanning/posting. Read bounded logs, scanned headers/values, or SQL result rows using section and cursors. Source extraction completing alone is not import completion. Results are available only to the initiating user/customer.", generated("integrator_run_get")),
  ];
}
