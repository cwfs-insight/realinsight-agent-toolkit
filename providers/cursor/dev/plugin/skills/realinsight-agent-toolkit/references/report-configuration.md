# Report Configuration

Use this when the user asks to inspect, create, edit, copy, or delete Realinsight report definitions.

Reports are best for extracting/listing data in a repeatable table. A list report starts by choosing the master dataset, which defines the report grain such as one row per loan or one row per property. Related datasets add child or related information under that same top-level feature family. If the user needs formatted workbooks, dynamic repeating layout, or posting calculated values back to Realinsight, inspect model forms instead.

## Tools

Read tools:

- `search_reports`: find visible report definitions by name, type, folder, and active state.
- `search_report_folders`: find report folders under a parent folder when the user asks for a specific destination. Use `REPORT` or `ROOT` for root.
- `get_report`: read one compact report definition and its latest `conflict_token`.

Write-planning tools:

- `validate_create_report`: validate and normalize a create request without writing.
- `validate_update_report`: validate and normalize an update request without writing.
- `validate_delete_report`: preview LIST report delete prerequisites without writing. Active related schedules, analytics, dashboard references, or workbench lists block toolkit deletes and require cleanup in the Realinsight app.

Write tools:

- `create_report`
- `update_report`
- `delete_report`

Write tools require `ri:reports.write`, available write tooling, Reports or Admin module access, and explicit user approval.

## Authoring Workflow

1. Use `search_reports` when editing an existing report or looking for similar examples. Use `search_report_folders` when the user asks for a specific destination folder.
2. Use `get_report` immediately before any update or delete and keep the latest `conflict_token`.
3. Choose one report `list.master_feature_code`; this is the report grain.
4. Use `search_features` and `get_entity_structure` to identify related datasets under the same top-level feature family.
5. Use `get_fields` for every dataset `feature_code` before adding columns, criteria, sorts, or prompts.
6. Build the compact report request. Preserve existing ids from `get_report`; when adding columns that formulas will reference, provide stable ObjectId-shaped `column_id` values.
7. For creates, pass `parent_folder_id` only when the user asked for root or a specific folder. If omitted, `create_report` creates/uses `agent/{current user name}`. Passing `REPORT` or `ROOT` saves at root.
8. Call the matching validate tool.
9. Show the user validation errors, warnings, affected resources, and the normalized preview.
10. Call create/update/delete only after explicit approval with `approved: true`.
11. Return a concise write summary with the report name, meaningful saved or deleted sections, validation warnings, and an open link or `report_id` only when useful for the user to jump back to it.

## Dataset And Field Rules

- The first write pass supports `LIST` report definitions.
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
- Delete is a soft delete for LIST reports only. Toolkit deletes are blocked when validation finds active related schedules, analytics, dashboard references, or workbench lists.

## Audit Behavior

- Core derives ConfigAuditLog changes server-side from before/after report state.
- Do not provide or invent a changes array.
- Write tools default to `audit_detail=summary`; request `audit_detail=changes` for changed paths/types or `audit_detail=full` only when audit/reversal work needs before/after values.
- Save results can include an audit `operation_id`; keep it for follow-up review or manual backout requests, but do not show raw audit ids unless the user needs them.
- After saving, summarize what changed for the user rather than only returning the raw operation payload. Prefer report names and links over raw ids.
- When intentionally backing out a prior operation, pass `reverses_operation_id` and explain the reversal in `change_reason`.

## Safety Rules

- Do not call create/update/delete from inferred intent alone.
- Ask for approval of the exact report name, target report id for updates/deletes, main feature code, affected datasets, and meaningful field changes.
- For broad new reports, ask the user to narrow population, fields, grouping, sorting, and output expectations before building the request.
- If validation fails, return the validation errors directly and do not attempt to save.
