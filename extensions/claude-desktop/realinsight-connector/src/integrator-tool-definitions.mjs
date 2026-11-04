export function integrator_tool_definitions(payloads) {
  const string = (description) => ({ type: "string", description });
  const page = { limit: { type: "integer", minimum: 1, maximum: 100 }, cursor: string("Offset cursor returned by the previous page.") };
  const object = (properties, required = []) => ({ type: "object", additionalProperties: false, properties, required });
  const generated = (name) => {
    if (!payloads[name]) throw new Error(`Missing generated integrator schema: ${name}`);
    return structuredClone(payloads[name]);
  };
  const commands = { search_integrators: "search", get_integrator: "get", get_integrator_options: "options", validate_integrator: "validate", set_integrator: "set", stage_integrator_source_file: "stage-source", inspect_integrator_source: "inspect-source", run_integrator: "run", get_integrator_run: "status" };
  const routes = { search_integrators: "POST /agent/integrators/search", get_integrator: "GET /agent/integrators/{integrator_id}", get_integrator_options: "POST /agent/integrators/options", validate_integrator: "POST /agent/integrators/validate", set_integrator: "POST /agent/integrators/set", stage_integrator_source_file: "POST /agent/integrators/sources/stage", inspect_integrator_source: "POST /agent/integrators/sources/inspect", run_integrator: "POST /agent/integrators/run", get_integrator_run: "POST /agent/integrators/runs/get" };
  const tool = (name, description, schema, write = false, destructive = false) => ({
    name, title: name.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "), description,
    scope: `ri:integrators.${name === "run_integrator" ? "run" : write || name === "validate_integrator" ? "write" : "read"}`,
    cli: `ri-agent integrators ${commands[name]} --request-file REQUEST.json`, route: routes[name],
    readOnlyHint: !write, destructiveHint: destructive, idempotentHint: !write, openWorldHint: name === "run_integrator",
    inputSchema: { ...schema, properties: { profile: string("Optional local ri-agent profile."), ...schema.properties } },
  });
  const stage = generated("integrator_source_stage");
  stage.properties.file_path = string("Local CSV/XLSX/XLSM path. Uploads outside model context; file_name defaults to the basename. Hosted callers upload to the returned signed upload_url instead.");
  stage.required = ["approved"];
  return [
    tool("search_integrators", "Find import definitions by name, target feature, or folder before deciding whether to reuse or create one.", generated("integrator_search")),
    tool("get_integrator", "Read a compact overview, mapping summaries, and conflict token. Request sections=source,match_levels,map,map_item,definition for focused detail. map_item requires map_id; summary and map support pagination. definition is the complete PascalCase configuration for explicit replacement or copying.", object({ integrator_id: string("Integrator id from search_integrators."), sections: string("Comma-separated summary,source,match_levels,map,map_item,definition. Defaults to summary."), map_id: string("Map id for sections=map_item."), ...page }, ["integrator_id"])),
    tool("get_integrator_options", "Discover allowed configuration choices: dictionary match hierarchy (sections=match_levels with feature_code), active folders, or configured SQL connections with listener readiness. Folder and connection lists support filters and independent cursors; connection secrets are omitted. Suggested match keys do not prove uniqueness. Use get_fields for exact writable fields and allowed codes.", generated("integrator_options")),
    tool("validate_integrator", "Validate without saving or queueing. Supply definition for creation/explicit replacement, or integrator_id plus expected_conflict_token and focused changes/map_patch. Returns can_save/errors, can_run/run_errors, and warnings without echoing the definition. staged_file_id derives source columns from proposed Excel settings; otherwise supply source_columns when available. Validation does not simulate posting or prove key uniqueness.", generated("integrator_validate")),
    tool("set_integrator", "Save only after validation and explicit approval. Use the same configuration request as validate_integrator plus approved=true and change_reason. Creates require definition; updates require the latest conflict token. Prefer changes/map_patch to preserve omitted settings; definition explicitly replaces all settings/maps. The response includes a compact overview, new conflict token, and audit operation id.", generated("integrator_set"), true, true),
    tool("stage_integrator_source_file", "Stage an approved temporary upload before inspecting or importing CSV or Excel. Files are customer/user-bound, expire after three days, and are limited to 25 MiB. CSV becomes worksheet Source with text-preserving values.", stage, true),
    tool("inspect_integrator_source", "Preview sheets, headers, sample rows, distinct values, and blank/duplicate composite keys. Use sheet_name or one-based sheet_index. Source columns are Excel letters, including CSV. Checks cover at most 5000 data rows and do not prove full-source uniqueness.", generated("integrator_source_inspect")),
    tool("run_integrator", "Queue asynchronous scan_headers, scan_values, query, test_connection, or apply after explicit approval of the exact source/SQL and mode. Query suppresses Realinsight posting but SQL may have source-side effects. Apply can insert/update and trigger post-save actions. Requires the current conflict token. Never automatically retry; poll get_integrator_run with the returned run_handle.", generated("integrator_run"), true, true),
    tool("get_integrator_run", "Pass run_handle back unchanged to follow SQL extraction through downstream scanning/posting. Status includes available_sections and scan_columns; page logs, headers, values, or SQL rows using section/cursor. Extraction completion alone is not import completion. Results belong to the initiating user/customer.", generated("integrator_run_get")),
  ];
}
