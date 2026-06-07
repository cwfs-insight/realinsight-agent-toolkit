# Report Configuration

Use this when the user asks to inspect, create, edit, copy, or delete Realinsight report definitions.

## Tools

Read tools:

- `search_report_configurations`: find visible report definitions by name, type, folder, and active state.
- `get_report_configuration`: read one compact report definition and its latest `conflict_token`.

Write-planning tools:

- `validate_create_report_configuration`: validate and normalize a create request without writing.
- `validate_update_report_configuration`: validate and normalize an update request without writing.
- `validate_delete_report_configuration`: preview delete prerequisites and affected resources without writing.

Write tools:

- `create_report_configuration`
- `update_report_configuration`
- `delete_report_configuration`

Write tools appear only when write tooling is enabled and require `ri:reports.write`, Reports module access, and explicit user approval.

## Authoring Workflow

1. Use `search_report_configurations` when editing an existing report or looking for similar examples.
2. Use `get_report_configuration` immediately before any update or delete and keep the latest `conflict_token`.
3. Choose one report `list.master_feature_code`.
4. Use `search_features` and `get_entity_structure` to identify datasets under the same top-level feature family.
5. Use `get_fields` for every dataset `feature_code` before adding columns, criteria, sorts, or prompts.
6. Build the compact report request.
7. Call the matching validate tool.
8. Show the user validation errors, warnings, affected resources, and the normalized preview.
9. Call create/update/delete only after explicit approval with `approved: true`.
10. Return the saved `report_id`, `conflict_token`, and ConfigAuditLog `operation_id` from the result when present.

## Dataset And Field Rules

- The first write pass supports `LIST` report definitions.
- Do not mix unrelated top-level feature families in one report.
- Every `list.data_sets[].feature_code` must belong to the same top-level feature family as `list.master_feature_code`.
- Use `get_entity_structure` to decide whether a dataset is the master feature itself, a child/dependent feature, or a related feature that should not be included.
- Use `get_fields` for each dataset feature and put exact field names or schema-derived field names in report columns.
- Do not guess field names from display labels.
- Keep computed columns, aggregate settings, criteria, sorts, and prompts explicit in the request. Validate before saving.

## Update And Delete Rules

- Always call `get_report_configuration` right before `validate_update_report_configuration`, `update_report_configuration`, `validate_delete_report_configuration`, or `delete_report_configuration`.
- Pass `expected_conflict_token` from the latest read.
- If a conflict-token error occurs, read the report again and reapply the intended change to the fresh configuration.
- Delete is a soft delete. Validation can return affected resources such as schedules, related analytics, dashboard references, or workbench lists.

## Audit Behavior

- Core derives ConfigAuditLog changes server-side from before/after report state.
- Do not provide or invent a changes array.
- Save results can include an audit `operation_id`; keep it for follow-up review or manual backout requests.
- When intentionally backing out a prior operation, pass `reverses_operation_id` and explain the reversal in `change_reason`.

## Safety Rules

- Do not call create/update/delete from inferred intent alone.
- Ask for approval of the exact report name, target report id for updates/deletes, main feature code, affected datasets, and meaningful field changes.
- For broad new reports, ask the user to narrow population, fields, grouping, sorting, and output expectations before building the request.
- If validation fails, return the validation errors directly and do not attempt to save.
