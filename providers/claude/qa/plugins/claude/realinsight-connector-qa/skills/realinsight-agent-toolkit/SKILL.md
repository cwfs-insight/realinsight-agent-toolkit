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
2. If the user asks which local Realinsight connections are available, call `list_profiles`; this lists only saved local profiles and pending authorizations, not all Realinsight customers.
3. If not connected, call `connect_realinsight`.
4. If the user wants to switch customer context, call `switch_profile`. Use an existing profile when known; otherwise pass `customer_code` only when it is the user's Realinsight login/company code. If only a customer number or uncertain identifier is known, omit it so the user can type the customer code on the Realinsight login screen.
5. If a tool reports insufficient scopes, call `request_realinsight_scopes` with the needed access.
6. Use local `disconnect_realinsight` only when the user asks to log out, rotate credentials, or reconnect as a different Realinsight customer/user. Hosted HTTP MCP exposes `disconnect` instead; it revokes the current grant and the user may still need to reconnect Realinsight in the host.

For CLI use:

```bash
ri-agent auth login --base-url https://www.ri2-qa.com/api/v1
ri-agent doctor --json
ri-agent tools
```

Use `RI_AGENT_BASE_URL` or `--base-url` only when the user is working with a Realinsight-provided non-production environment.

## Choose The Path

Use the user's wording to choose the lightest useful tool family:

- Specific entity questions: when the user names a loan, deal, property, tenant, borrower, or other record, use schema/entity/record tools first. Search for the entity, hydrate only the needed fields, then traverse children or relationships if the answer needs related rows.
- Broad portfolio or system questions: when the user asks across a population or a curated dashboard, workbench, saved list, queue, or operational table seems likely to match the question, consider cached dashboard/workbench tools. Use cached tables when they fit the business question, but do not assume every broad question requires a dashboard or workbench.
- Report questions: use report configuration tools when the user wants to inspect, create, edit, copy, or delete a LIST/COMPOSITE definition or its custom Excel template. LIST reports extract one table; COMPOSITE reports place independent list outputs into template worksheets.
- Model/form questions: use model-form tools when the user asks about Excel/PDF templates, workbook maps, generated outputs, posting back to Realinsight, assignments, or repeating layout. Models are best for transforming or presenting data through a template and map.
- Chart of Accounts questions: use `get_chart_of_accounts` for account configuration/layout and `get_coa_data` for record-bound accounts values.
- RealVIEW questions: use `get_realviews` only for explicit configuration inspection or changes; use `execute_realview` for requested values or to verify a saved definition against entities found with normal entity tools.
- Extended Data configuration questions: only when the user explicitly asks about custom fields or system-field overlays, use `get_extended_data`. Keep this separate from `search_fields`/`get_fields`, which return the merged runtime field catalog used by ordinary record, report, and model-form work.
- Runtime output questions: current report/model-form execution job tools are not exposed yet. Inspect definitions and cached outputs when available, and tell the user when an output must be run or refreshed in Realinsight.

## Tool Discovery For Large Harnesses

When the harness supports tool search, search by family instead of loading or reasoning over every Realinsight tool up front:

- Schema and field discovery: search for `Realinsight schema features fields`; common tools are `search_features`, `search_fields`, and `get_fields`.
- Entity, record, and relationship reads: search for `Realinsight entity search records structure children`; common tools are `search_entities`, `get_records`, `get_entity_structure`, `get_children`, and `get_latest_children`.
- Dashboard, analytic, workbench, and cached-table reads: search for `Realinsight analytics dashboard workbench CSV`; common tools are `list_dashboard_pages`, `get_dashboard_page`, `list_workbenches`, and CSV/data/entity extraction tools.
- Report configuration: search for `Realinsight report configuration composite Excel template import`; start with `search_reports`, `search_report_folders` when placing a report in a user-requested folder, and `get_report`, then validate/import/template write tools only after approval.
- Model form configuration: search for `Realinsight model form configuration folders template map`; start with `search_model_forms`, `search_model_form_folders` when placing a model in a user-requested folder, and `get_model_form`, then focused map/template tools only when needed.
- Chart of Accounts and COA Data: search for `Realinsight chart of accounts configuration COAData`; use `get_chart_of_accounts` for configuration/layout, `get_coa_data` for a record-bound data id, and `set_chart_of_accounts` only after dry-run validation and approval.
- RealVIEW configuration and execution: search for `Realinsight RealVIEW configuration maps execute entities`; start with `get_realviews`, find matching root entities with normal entity tools, then use `execute_realview`; use `set_realview` only after dry-run validation and approval.
- Extended Data configuration: search for `Realinsight Extended Data custom field configuration`; use `get_extended_data` for persisted definitions and `set_extended_data` only after dry-run validation and approval.
- Reference/schema fallback: search for `Realinsight tool reference schema` or call `get_tool_reference` when this skill or its reference files are unavailable.

Keep these common entry tools visible or easy to discover: `get_tool_reference`, `search_features`, `search_fields`, `get_fields`, `search_entities`, `get_records`, `get_entity_structure`, `search_reports`, `search_report_folders`, `get_report`, `search_model_forms`, `search_model_form_folders`, `get_model_form`, `get_chart_of_accounts`, `get_coa_data`, `get_realviews`, and `get_extended_data`.

Use the complete input schema attached to the selected callable tool instead of guessing payload fields from prose. Fixed report, model-form, and Chart of Accounts objects are fully typed. `set_record.record` is intentionally runtime-defined, so discover its exact field names and value contracts with `search_fields` or `get_fields` before calling it.

This skill describes the broader Realinsight toolkit, so a tool named here may not be exposed in every agent harness. Confirm a tool is present in the current inventory or discoverable through tool search before planning around it. If it is still absent, treat it as unavailable for this agent session, use the nearest exposed capability when appropriate, or explain the limitation. Do not invent or attempt to call unavailable tools.

## Reference Selection

Read only the reference files needed for the user's request:

- `references/security-and-limits.md`: required before broad reads, sensitive data, or write tools.
- `references/field-discovery.md`: choosing feature codes, field names, and schema codes.
- `references/entity-search.md`: finding Realinsight entities before record or relationship reads.
- `references/record-augmentation.md`: hydrating entity ids with key fields or selected fields.
- `references/structure-traversal.md`: parent, master, children, references, referenced-by, and periodic traversal.
- `references/analytics-workbenches.md`: dashboard pages, analytics, workbenches, cached tables, CSV paging, and entity extraction.
- `references/report-query.md`: composing bounded ad hoc analytical answers from current tools.
- `references/report-configuration.md`: inspecting, validating, creating, updating, deleting, safely importing LIST components into COMPOSITE reports, and custom Excel template transfer.
- `references/report-computed-fields.md`: report column ordering, computed columns, internal formulas, strat ranges, aggregate behavior, and formula column-id references.
- `references/chart-of-accounts.md`: inspecting account structures, account types, COAData values, and approval-gated chart patch operations.
- `references/realview-configuration.md`: inspecting RealVIEW definitions/maps, finding representative entities, value execution, debugging, and approval-gated replacement.
- `references/extended-data-configuration.md`: distinguishing persisted Extended Data configuration from runtime fields and safely creating, updating, or deactivating custom fields and overlays.
- `references/model-form-configuration.md`: inspecting model forms, templates, flat maps, map nodes/items, markers, used fields, approval-gated create/copy/update, and Excel template download/upload.
- `references/model-form-map-layout.md`: model-form markers, repeating blocks, multi-entity layout, and stub/insert behavior.
- `references/deal-model-form-patterns.md`: deal-centered model-form map traversal through components, capital stack, collateral, loans, and child datasets.
- `references/record-writes.md`: approval-gated record update workflow when write tools are enabled.

Reusable helper scripts are available under `scripts/` for common local file workflows. For model-form Excel template edits, prefer `scripts/model_form_template_roundtrip.py` or `scripts/model_form_template_roundtrip.ts` instead of writing signed download/upload glue from scratch.

## Default Workflow

1. Check auth and available tools.
2. Choose the path above before calling tools.
3. For entity/record questions, discover feature and field codes before assuming schema details.
4. Use one coherent concept, name, identifier, or field label per search query. Multiword phrases are fine when they form one concept; do not concatenate alternatives or independent clues. For alternatives or distinct clues, make a small bounded set of independent searches in parallel and compare results. Search for a small candidate entity set, prefer exact field targeting when the field and expected value are known, and use generic or fuzzy search for discovery. Then hydrate only key fields or explicit fields.
5. Use relationship tools only when the next step needs parent, master, child, reference, or periodic context.
6. For dashboard, analytic, workbench, or saved-list questions, prefer cached table tools over manual entity fan-out when the cached source matches the request.
7. For report definition or template changes, read `references/report-configuration.md`, and also read `references/report-computed-fields.md` before editing column order, computed columns, formulas, aggregate settings, or post-aggregate behavior. Use the safe import tool for existing LIST components in a COMPOSITE, get the latest conflict token, validate before writing, and require explicit approval.
8. For Chart of Accounts inspection or edits, read `references/chart-of-accounts.md`, call `get_chart_of_accounts` for the latest structure and conflict token, use `dry_run=true` before writing, and require explicit approval.
9. For RealVIEW work, read `references/realview-configuration.md`, read the latest definition/conflict token when configuration is in scope, execute against representative root entities, dry-run any replacement, require explicit approval, then execute the saved definition again.
10. For Extended Data work, read `references/extended-data-configuration.md`. Use configuration tools only for an explicit system-configuration request, never as a substitute for normal field discovery or record updates.
11. For model form inspection, create/copy, map/template, or metadata updates, read `references/model-form-configuration.md`, search/get the model form, read the latest conflict token when updating existing resources, and inspect only the needed node, item, template, or used-field summary.
12. For model-form maps that cross Deal, Loan, CRE/property, cap-stack, asset, or component relationships, also read `references/deal-model-form-patterns.md` and verify the intended path with schema/entity-structure tools before writing map nodes.
13. Read-only tools have no side effects. Agent harnesses may auto-approve them when local policy allows, but keep reads bounded and report truncation, cache, and access warnings.
14. After any successful write or queue operation, return a concise operation summary using friendly names/context, meaningful changes, and warnings. For configuration writes, leave `audit_detail` at `summary` unless audit/reversal work needs `changes` or `full`. Avoid raw ids unless they are useful configuration follow-up handles or links.
15. Keep calls bounded, follow cursors, and report truncation or access warnings.
16. Answer with provenance: include the feature, field, dashboard page, analytic, workbench, report id, model form id, COA id, RealVIEW id, Extended Data schema code, entity ids, or cache status that materially shaped the result.

## Tool Families

- Reference/schema fallback: `get_tool_reference`.
- Local auth helpers: `auth_status`, `list_profiles`, `connect_realinsight`, `switch_profile`, `disconnect_realinsight`, `request_realinsight_scopes`. Hosted HTTP MCP exposes hosted-only `disconnect`, which revokes the current hosted OAuth grant and then the host/user must reconnect Realinsight.
- Schema discovery: `search_features`, `search_fields`, `get_fields`.
- Entity search and relationships: `search_entities`, `get_children`, `get_latest_children`, `get_entity_structure`.
- Records: `get_records` returns a compact table with shared columns and row `values`/`display_values`; gated writes use `set_record`.
- Dashboards, analytics, and workbenches: `list_dashboard_pages`, `get_dashboard_page`, `get_analytic_data`, `get_analytic_csv`, `extract_analytic_entities`, `list_workbenches`, `get_workbench_data`, `get_workbench_csv`, `extract_workbench_entities`.
- Report configuration: `search_reports`, `search_report_folders`, `get_report`, `download_report_template`; gated validation/write tools with `validate_create_report`, `validate_update_report`, `validate_delete_report`, `create_report`, `update_report`, `delete_report`, `import_report_into_composite`, `stage_report_template_file`, and `upload_report_template`.
- Chart of Accounts configuration: `get_chart_of_accounts` reads without a separate COA OAuth scope; gated writes with `set_chart_of_accounts` require `ri:chart_of_accounts.write`.
- RealVIEW configuration and execution: `get_realviews` and `execute_realview` require `ri:realviews.read`; gated writes with `set_realview` require `ri:realviews.write`.
- Extended Data configuration: `get_extended_data` requires `ri:extended_data.read`; gated writes with `set_extended_data` require `ri:extended_data.write`.
- Model form configuration: `search_model_forms`, `search_model_form_folders`, `get_model_form`, `download_model_form_template`; gated create/update/template writes with `validate_create_model_form`, `create_model_form`, `validate_update_model_form`, `update_model_form`, `stage_model_form_template_file`, and `upload_model_form_template`.

## Safety Rules

- Realinsight APIs are the trust boundary. Do not use backing stores, customer storage, local credential files, or non-tool data sources to bypass toolkit permissions.
- OAuth scopes are coarse grants. The current user's Realinsight permissions, customer access, modules, assignments, and service rules still apply.
- Local profile listing is not a customer directory. Do not imply that Realinsight exposed all customers; it only reflects profiles already authorized on this machine.
- Customer switching uses Realinsight login and approval. A supplied `customer_code` helps prefill login, but it must be the Realinsight login/company code, not an internal customer number. The user still approves the final signed-in customer on the Realinsight page.
- Do not ask for sensitive fields unless the user explicitly needs them and the tool allows them.
- Do not expose access tokens, refresh tokens, auth headers, local profile files, session ids, or document URLs.
- Do not create unbounded scans. Ask for a narrower customer, portfolio, page, feature, metric, date range, or maximum row count when needed.
- Read-only tools have no side effects; allow harness-level auto-approval for reads when configured, while still keeping calls bounded.
- Write tools are opt-in. Do not call them unless they appear in the tool inventory and the user approves the exact side effect.
- Pipeline queue/status tools and scopes are not part of the current OAuth, CLI, or MCP surface.
- For report/COA/model-form writes, default `audit_detail=summary`; request `changes` for paths/types or `full` only when before/after values are needed.
- For Chart of Accounts writes, get the latest conflict token, run `dry_run=true`, and do not override usage-check blocks for account removal or high-risk mapping/type edits.
- For RealVIEW writes, preserve the complete ordered definition, use the latest conflict token, run `dry_run=true`, require approval, and execute the saved definition with `execute_realview` before declaring it correct.
- For Extended Data writes, distinguish custom fields from system-field overlays, use the latest conflict token for update/deactivate, run `dry_run=true`, require approval, and do not bypass affected-resource or sensitivity/searchability safeguards.
- After a successful write or queue action, summarize the applied operation for the user with names/context; keep raw ids out of the answer unless they are useful report/model/COA follow-up handles or the user asks.
- Treat warnings, `is_truncated`, `next_cursor`, cache status, and omitted fields as part of the result.
- Model form maps are returned as flat node ids through `get_model_form` sections. Prefer `map_patch` after inspecting the target `node` or `item`; `update_node` and `update_item` merge supplied fields, while `replace_node` replaces the full node. Request `map_definition` only for bulk map replacement or revert. Request `used_fields` for schema-code-backed fields, and inspect `node` or `item` sections for markers, COA layout fields, and repeating-block layout anchors. Read `references/model-form-map-layout.md` before changing COA map item columns, repeating blocks, or stub/insert behavior.

## Answering Style

Keep answers compact and operational. Use tables for record lists or comparisons, summarize broad analyses, and preserve the ids or source labels needed for follow-up. If the toolkit cannot safely distinguish "not found" from "not authorized," say what the tool proved instead of guessing.
