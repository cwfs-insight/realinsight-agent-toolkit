---
name: realinsight-agent-toolkit
description: Use the Realinsight Agent Toolkit CLI, stdio MCP server, hosted connector tools, auth helpers, and bundled Realinsight workflow references to answer questions with Realinsight data safely.
---

# Realinsight Agent Toolkit

Use this skill when an agent needs to use Realinsight through the published toolkit, Codex connector, Claude Desktop extension, local `ri-agent` CLI, or MCP tools.

This is a usage playbook. It assumes the toolkit or connector is already installed in the current harness. Do not rely on source repositories, implementation docs, backing-store access, or service internals.

## Connection First

Prefer MCP tools when they are available in the harness. Use the CLI only when the user or harness has direct terminal access.

For local stdio MCP:

1. Call `auth_status`.
2. If not connected, call `connect_realinsight`.
3. If a tool reports insufficient scopes, call `request_realinsight_scopes` with the needed access.
4. Use `disconnect_realinsight` only when the user asks to log out or rotate credentials.

For CLI use:

```bash
ri-agent auth login --base-url https://www.realinsight.cloud/api/v1
ri-agent doctor --json
ri-agent tools
```

Use `RI_AGENT_BASE_URL` or `--base-url` only when the user is working with a Realinsight-provided non-production environment.

## Reference Selection

Read only the reference files needed for the user's request:

- `references/security-and-limits.md`: required before broad reads, sensitive data, write tools, or pipeline tools.
- `references/field-discovery.md`: choosing feature codes, field names, and schema codes.
- `references/entity-search.md`: finding Realinsight entities before record or relationship reads.
- `references/record-augmentation.md`: hydrating entity ids with key fields or selected fields.
- `references/structure-traversal.md`: parent, master, children, references, referenced-by, and periodic traversal.
- `references/analytics-workbenches.md`: dashboard pages, analytics, workbenches, cached tables, CSV paging, and entity extraction.
- `references/report-query.md`: composing bounded ad hoc analytical answers from current tools.
- `references/report-configuration.md`: inspecting, validating, creating, updating, and deleting report definitions.
- `references/record-writes.md`: approval-gated record update workflow when write tools are enabled.
- `references/pipelines.md`: approval-gated document pipeline queue/status workflow when pipeline tools are enabled.

## Default Workflow

1. Check auth and available tools.
2. Discover the right feature and field codes before assuming schema details.
3. Search for a small candidate entity set.
4. Use relationship tools only when the next step needs parent, master, child, reference, or periodic context.
5. Hydrate records with key fields or explicit fields.
6. For dashboard, analytic, workbench, or saved-list questions, prefer cached table tools over manual entity fan-out.
7. For report definition changes, read `references/report-configuration.md`, get the latest conflict token, validate before writing, and require explicit approval.
8. Keep calls bounded, follow cursors, and report truncation or access warnings.
9. Answer with provenance: include the feature, field, dashboard page, analytic, workbench, report id, entity ids, or cache status that materially shaped the result.

## Tool Families

- Auth helpers: `auth_status`, `connect_realinsight`, `disconnect_realinsight`, `request_realinsight_scopes`.
- Schema discovery: `search_features`, `search_fields`, `get_fields`.
- Entity search and relationships: `search_entities`, `get_children`, `get_latest_children`, `get_entity_structure`.
- Records: `get_records`; gated writes with `set_record`.
- Dashboards, analytics, and workbenches: `list_dashboard_pages`, `get_dashboard_page`, `get_analytic_data`, `get_analytic_csv`, `extract_analytic_entities`, `list_workbenches`, `get_workbench_data`, `get_workbench_csv`, `extract_workbench_entities`.
- Report configuration: `search_report_configurations`, `get_report_configuration`; gated validation/write tools with `validate_create_report_configuration`, `validate_update_report_configuration`, `validate_delete_report_configuration`, `create_report_configuration`, `update_report_configuration`, `delete_report_configuration`.
- Pipelines: gated `get_pipeline` and `queue_pipeline` when enabled.

## Safety Rules

- Realinsight APIs are the trust boundary. Do not use backing stores, customer storage, local credential files, or non-tool data sources to bypass toolkit permissions.
- OAuth scopes are coarse grants. The current user's Realinsight permissions, customer access, modules, assignments, and service rules still apply.
- Do not ask for sensitive fields unless the user explicitly needs them and the tool allows them.
- Do not expose access tokens, refresh tokens, auth headers, local profile files, session ids, or document URLs.
- Do not create unbounded scans. Ask for a narrower customer, portfolio, page, feature, metric, date range, or maximum row count when needed.
- Write and pipeline tools are opt-in. Do not call them unless they appear in the tool inventory and the user approves the exact side effect.
- Treat warnings, `is_truncated`, `next_cursor`, cache status, and omitted fields as part of the result.

## Answering Style

Keep answers compact and operational. Use tables for record lists or comparisons, summarize broad analyses, and preserve the ids or source labels needed for follow-up. If the toolkit cannot safely distinguish "not found" from "not authorized," say what the tool proved instead of guessing.
