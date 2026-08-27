# Security And Limits

Use this before adding or using tools that can return large datasets, sensitive fields, or side effects.

## Security Model

- Realinsight APIs are the trust boundary. The toolkit must not read backing stores, object storage, local files, or unsupported services directly.
- OAuth scopes are coarse client grants. They do not replace Realinsight security groups, module access, team permissions, assignments, or service-level checks.
- Access tokens are scoped to the connected Realinsight user and customer context.
- External portal-user contexts are not exposed through the current agent toolkit surface.

## Limits

- Keep exploratory search limits small.
- Respect server max limits and `is_truncated`.
- MCP tool dispatch applies a local result-size cap and adds a warning when it trims returned items.
- Use cursors where returned.
- Avoid multi-customer fan-out until explicit customer selection/fan-out tools exist.
- Avoid requesting every record or every field in a feature. Ask for a narrower scope when needed.
- `get_records` is capped at 50 entity ids and 100 fields per call. Batch by feature code.
- `get_children` and `get_latest_children` are capped at 25 parent ids per call. Use `limit_per_parent` for child fan-out.
- Cached analytic/workbench data pages are capped at 1000 rows for normal reads. `all=true` is capped server-side and can still exceed MCP context budgets.
- For large cached tables, prefer `get_analytic_csv` or `get_workbench_csv`, page into local temp storage, and query that local copy.
- For cached tables used as populations, prefer `extract_analytic_entities` or `extract_workbench_entities` before calling record or child tools.
- Model form read tools require `ri:model_forms.read` and return compact metadata. Use targeted node/item reads plus `map_patch` for small edits; request `map_definition` only for bulk map replacement or revert.
- Model form create/copy, metadata/map updates, and Excel template uploads require `ri:model_forms.write`, Configuration/Admin module access, validation, latest conflict token where applicable, and explicit user approval. Folder CRUD, delete, PDF template upload, and runtime generation/posting are not exposed as agent tools in this phase.
- Report and model-form write responses default to `audit_detail=summary`, which returns operation metadata without the changes array. Request `audit_detail=changes` for changed paths/types, or `audit_detail=full` only when audit/reversal work needs before/after values. Full audit values remain in the server audit log.
- RealVIEW configuration reads and Extended Data configuration reads require their dedicated read scopes plus Configuration/Admin access. RealVIEW execution requires its read scope plus normal entity access. Configuration reads remain separate from ordinary runtime field/record reads.
- Read-only tools have no side effects. Agent harnesses may auto-approve read calls when local policy allows, but agents should still keep reads bounded and surface truncation, cache, and access warnings.
- Do not use write tools unless the user approved the exact side effect and the required write scope is granted. The environment or harness can still hide completed write families when needed.

## Sensitive Data

- Do not request `include_sensitive` unless the user explicitly asks and the data is necessary.
- Do not log tokens, auth headers, session ids, document URLs, or sensitive record values.
- Do not paste full credential files or bearer tokens into prompts, examples, or tool outputs.

## Side Effects

- `set_record` requires `ri:record.write`, available write tooling, and explicit approval of the entity id, fields, and values.
- Report configuration create/update/delete requires `ri:reports.write`, available write tooling, Reports or Admin module access, validation, and explicit approval of the exact report side effect.
- Model form create/copy, metadata/map updates, and Excel template uploads require `ri:model_forms.write`, available write tooling, Configuration or Admin module access, validation, latest conflict token where applicable, and explicit approval of the exact model-form side effect.
- RealVIEW replacement requires `ri:realviews.write`, Configuration or Admin module access, dry-run validation, the latest conflict token for an existing definition, explicit approval, and post-save execution against representative root entities.
- `get_realviews` and `get_extended_data` have no tool-specific default or maximum row limit. Narrow configuration reads by id, feature/schema code, kind, or search text when possible; the MCP transport result-size guard still applies.
- `execute_realview` accepts one RealVIEW and one to 100 entity ids per call.
- Extended Data create/update/deactivate requires `ri:extended_data.write`, Configuration or Admin module access, dry-run validation, the latest conflict token for update/deactivate, and explicit approval. Never bypass affected-resource, sensitivity/searchability, or encryption safeguards.
- A scope only allows the client to attempt an operation; normal Realinsight security, locks, hooks, and module rules still decide whether it succeeds.
- After any successful write action, give the user a concise summary of what was applied using names/context and warnings. Avoid raw ids in the user-facing answer except report/model/COA ids or open links when they help the user jump back to the configuration.

## Answering Rules

- Mention material truncation, omitted fields, and access warnings.
- Distinguish "not found" from "not authorized" only when the tool response proves the distinction.
- When the agent cannot safely identify the right feature, field, customer, or metric, ask for clarification instead of guessing.
