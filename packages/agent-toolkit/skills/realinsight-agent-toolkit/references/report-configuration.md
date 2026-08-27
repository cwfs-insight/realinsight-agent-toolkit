# Report Configuration

Use this when the user asks to inspect, create, edit, copy, or delete Realinsight LIST or COMPOSITE report definitions, or to manage their custom Excel templates.

Reports are best for extracting/listing data in repeatable tables. A LIST report starts by choosing the master dataset, which defines the report grain such as one row per loan or one row per property. Related datasets add child or related information under that same top-level feature family.

A COMPOSITE report embeds independent LIST definitions and writes each component into a worksheet in one custom Excel template. The template can contain a summary sheet, formulas, charts, names, formatting, and cross-sheet joins. Components do not join to each other in the report engine; Excel formulas and template content provide the cross-report presentation. Use a model form instead when the workbook must map generated values to arbitrary cells/repeating regions or post calculated values back into Realinsight.

## Tools

Read tools:

- `search_reports`: find visible report definitions by name, type, folder, and active state.
- `search_report_folders`: find report folders under a parent folder when the user asks for a specific destination. Use `REPORT` or `ROOT` for root.
- `get_report`: read one compact report definition and its latest `conflict_token`.
- `download_report_template`: read the current LIST or COMPOSITE Excel template metadata and, when supported, download it to `output_path` outside model context.

Write-planning tools:

- `validate_create_report`: validate and normalize a create request without writing.
- `validate_update_report`: validate and normalize an update request without writing.
- `validate_delete_report`: preview LIST or COMPOSITE report delete prerequisites without writing. Active related schedules, analytics, dashboard references, or workbench lists block toolkit deletes and require cleanup in the Realinsight app.

Write tools:

- `create_report`
- `update_report`
- `delete_report`
- `import_report_into_composite`: append or insert a safe independent copy of an existing LIST report.
- `stage_report_template_file`: stage an approved Excel file transfer.
- `upload_report_template`: finalize a staged template against the latest report conflict token.

Write tools require `ri:reports.write`, available write tooling, Reports or Admin module access, and explicit user approval.

## Authoring Workflow

1. Use `search_reports` when editing an existing report or looking for similar examples. Use `search_report_folders` when the user asks for a specific destination folder.
2. Use `get_report` immediately before any update or delete and keep the latest `conflict_token`.
3. Choose `LIST` or `COMPOSITE`. For a LIST, choose one `list.master_feature_code`; this is the report grain. For a COMPOSITE, create the shell and add new inline LIST components or use `import_report_into_composite` for existing reports.
4. Use `search_features` and `get_entity_structure` to identify related datasets under the same top-level feature family.
5. Use `get_fields` for every dataset `feature_code` before adding columns, criteria, sorts, or prompts.
6. Build the compact report request. Preserve existing ids from `get_report`; when adding columns that formulas will reference, provide stable ObjectId-shaped `column_id` values. Do not manually copy ids from a standalone report into a composite.
7. For creates, pass `parent_folder_id` only when the user asked for root or a specific folder. If omitted, `create_report` creates/uses `agent/{current user name}`. Passing `REPORT` or `ROOT` saves at root.
8. Call the matching validate tool.
9. Show the user validation errors, warnings, affected resources, and the normalized preview.
10. Call create/update/delete only after explicit approval with `approved: true`.
11. Return a concise write summary with the report name, meaningful saved or deleted sections, validation warnings, and an open link or `report_id` only when useful for the user to jump back to it.

## Composite Reports

- `composite.reports` contains complete embedded LIST definitions. Each component owns its report, dataset, column, and prompt ids.
- To add an existing LIST, call `import_report_into_composite` with the target composite id, source LIST id, target's latest `expected_conflict_token`, and approval. Omit `insert_at` to append. Omit `report_header` to use the source name. Omit `report_sheet` to derive a valid unique Excel sheet name.
- Import always deep-clones the source. Core generates a new embedded `report_list_id`, every dataset id, every column id, and every prompt id, then rewrites internal dataset, join, sort, criterion, prompt, aggregate, and formula references. External field/schema, COA, RealVIEW, currency, team, and role references remain unchanged.
- The same source can be imported more than once. Every import is independent and can be edited without changing the standalone source or another component.
- For a brand-new component, include it directly in `composite.reports`; use stable unique ids only where another part of that same new component must refer to them.
- Component order is workbook execution/output order. Each `report_sheet` must identify the worksheet that receives that component. The default `first_data_cell` is `A1` and default `data_direction` is `DOWN`.
- Core does not impose a separate component-count maximum. Keep composites purposeful because every component runs independently and large definitions/results cost more to validate, transmit, and execute.

## Custom Excel Templates

Custom templates are supported for LIST and COMPOSITE reports. COMPOSITE execution requires one template owned by the composite; embedded components do not own separate templates.

1. Call `get_report` immediately before template replacement and retain the latest `conflict_token`.
2. Call `download_report_template` with `output_path` when local files are supported. Otherwise fetch the returned signed `download_url` outside the tool-result/model context.
3. Preserve workbook formulas, charts, names, formatting, macros, and component sheet names unless the user asks to change them.
4. Local CLI/stdio callers may pass `file_path` to `upload_report_template`; the toolkit stages and transfers it outside model context. Hosted callers call `stage_report_template_file`, upload multipart form field `file` to `upload_url`, then call `upload_report_template` with `staged_file_id`.
5. Finalize only after approval with the latest `expected_conflict_token`. Accepted formats are `.xlsx`, `.xlsm`, and `.xls` with an Excel content type or `application/octet-stream`.
6. Every successful upload creates a fresh report-owned template id and switches only the target report to it. This prevents a legacy shared template from being changed through another report.

Never send workbook bytes or base64 in a tool call. Template files use signed staged transfer so tool results stay compact.

## Dataset And Field Rules

- CRUD supports `LIST` and `COMPOSITE` report definitions.
- Do not mix unrelated top-level feature families in one report.
- Every `list.data_sets[].feature_code` must belong to the same top-level feature family as `list.master_feature_code`.
- Use `get_entity_structure` to decide whether a dataset is the master feature itself, a child/dependent feature, or a related feature that should not be included.
- Use `get_fields` for each dataset feature and put exact schema codes in report columns.
- For normal field columns, `data_set_id` determines the dataset and the `schema_code` must belong to that dataset feature. Use `data_set_id=null` or omit it for the master report dataset.
- Do not guess field names from display labels.
- Keep computed columns, aggregate settings, criteria, sorts, and prompts explicit in the request. Validate before saving.

## Column Order

`get_report` returns `list.columns` ordered by `column_order`. To move columns, submit the report with the same `column_id` values and set every column's final 1-based `column_order`.

- Do not rely on display order in the JSON array when intentionally reordering columns.
- Do not leave duplicate `column_order` values; Core rejects ambiguous final order.
- New columns may omit or set `column_order=0`; Core defaults them from request array order and returns a validation warning. Prefer explicit order values for planned report edits.
- Sorts, criteria, prompts, aggregate group-by entries, and computed formulas reference `column_id`, not column position, so preserve column ids while moving columns.

## Computed Columns

Read `report-computed-fields.md` before creating or editing report computed columns.

- Normal report formulas store bracketed report `column_id` references, not labels or schema codes.
- Common computed types are `DATA`, `STRAT`, `AG_COUNT`, and `REALVIEW`.
- `SKIP`, `EXCEL`, and `REALVIEW_EMBEDDED` are legacy/specialized patterns; preserve them when editing existing reports and avoid creating new ones unless copying a known pattern.
- `compute_post_agg=true` runs an internal formula after aggregation. Referenced columns must not be excluded from aggregation.

## Update And Delete Rules

- Always call `get_report` right before `validate_update_report`, `update_report`, `validate_delete_report`, or `delete_report`.
- Pass `expected_conflict_token` from the latest read.
- If a conflict-token error occurs, read the report again and reapply the intended change to the fresh configuration.
- Delete is a soft delete for LIST and COMPOSITE reports. Toolkit deletes are blocked when validation finds active related schedules, analytics, dashboard references, or workbench lists.

## Audit Behavior

- Core derives ConfigAuditLog changes server-side from before/after report state.
- Do not provide or invent a changes array.
- Write tools default to `audit_detail=summary`; request `audit_detail=changes` for changed paths/types or `audit_detail=full` only when audit/reversal work needs before/after values.
- Save results can include an audit `operation_id`; keep it for follow-up review or manual backout requests, but do not show raw audit ids unless the user needs them.
- After saving, summarize what changed for the user rather than only returning the raw operation payload. Prefer report names and links over raw ids.
- When intentionally backing out a prior operation, pass `reverses_operation_id` and explain the reversal in `change_reason`.

## Safety Rules

- Do not call create/update/delete from inferred intent alone.
- Ask for approval of the exact report name, target report id for updates/deletes/imports/templates, main feature code, affected datasets, component source and position, template file name, and meaningful field changes.
- For broad new reports, ask the user to narrow population, fields, grouping, sorting, and output expectations before building the request.
- If validation fails, return the validation errors directly and do not attempt to save.
