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
- Do not use write tools unless the user approved the exact side effect and the required write/pipeline tool family is explicitly enabled.

## Sensitive Data

- Do not request `include_sensitive` unless the user explicitly asks and the data is necessary.
- Do not log tokens, auth headers, session ids, document URLs, or sensitive record values.
- Do not paste full credential files or bearer tokens into prompts, examples, or tool outputs.

## Side Effects

- `set_record` requires `ri:record.write`, enabled write tooling, and explicit approval of the entity id, fields, and values.
- `queue_pipeline` requires its pipeline scopes, enabled pipeline tooling, and explicit approval of the pipeline type, document, property context, and page range.
- A scope only allows the client to attempt an operation; normal Realinsight security, locks, hooks, and module rules still decide whether it succeeds.

## Answering Rules

- Mention material truncation, omitted fields, and access warnings.
- Distinguish "not found" from "not authorized" only when the tool response proves the distinction.
- When the agent cannot safely identify the right feature, field, customer, or metric, ask for clarification instead of guessing.
