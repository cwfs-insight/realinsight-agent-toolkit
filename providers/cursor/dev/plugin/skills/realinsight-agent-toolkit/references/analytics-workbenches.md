# Analytics And Workbench Cached Tables

Use this when the user asks about an existing dashboard, analytic, portfolio page, watch list, workbench, saved list, or cached operational table in Realinsight.

Do not use this family just because the request mentions business data. If the user names a specific loan, deal, property, tenant, borrower, or other record and asks for current facts about it, usually start with `search_entities` and `get_records`; fall back to dashboard/workbench tools when a curated page/list is likely useful, tool evidence points there, or a broad population/table is the better source.

## Current Tools

- `list_dashboard_pages`: list dashboard pages available to the current user.
- `get_dashboard_page`: inspect one page and its analytics, backing/base report ids, cache status, and filters.
- `get_analytic_data`: read cached analytic data and base report column metadata.
- `get_analytic_csv`: read a cached analytic page as CSV for local temp-file analysis.
- `extract_analytic_entities`: extract compact entity refs from cached analytic rows.
- `list_workbenches`: list saved workbench lists available to the current user, optionally by workbench code.
- `get_workbench_data`: read cached workbench/list-report data and column metadata.
- `get_workbench_csv`: read a cached workbench/list-report page as CSV for local temp-file analysis.
- `extract_workbench_entities`: extract compact entity refs from cached workbench/list-report rows.

All of these require `ri:analytics.read` for OAuth callers, and Realinsight still enforces normal user, customer, report, dashboard, workbench, and module access.

## Dashboard And Analytic Flow

1. Call `list_dashboard_pages` when the question fits a dashboard page, portfolio page, watch list page, curated analytics page, or likely curated summary.
2. Call `get_dashboard_page` with the selected `page_id`.
3. Use the returned analytics list to choose an `analytic_report_id` and understand the backing `base_report_id`.
4. Call `get_analytic_data` with a small `limit` first.
5. For broad analysis, call `get_analytic_csv`, append each CSV page to a temporary file or table, and follow `next_cursor`.
6. For population handoff, call `extract_analytic_entities` and augment returned ids with `get_records`, `get_children`, or `get_latest_children`.
7. Use `columns` to map row keys to display labels, schema codes, feature codes, datasets, and formats.
8. If `cache_status` is `no_cache`, tell the user the analytic/dashboard needs to be run or refreshed in Realinsight before data can be read.

## Workbench Flow

1. Call `list_workbenches` when the question fits a module workbench, saved list, operational list report, queue, or likely cached operational table.
2. Use `workbench_code` when the user clearly names a workbench type, otherwise list available workbenches and choose from names/descriptions.
3. Call `get_workbench_data` with the selected `workbench_id` and a small `limit` first.
4. For broad analysis, call `get_workbench_csv`, append each CSV page to a temporary file or table, and follow `next_cursor`.
5. For population handoff, call `extract_workbench_entities` and augment returned ids with `get_records`, `get_children`, or `get_latest_children`.
6. Use `columns` to map row keys to display labels, schema codes, feature codes, datasets, and formats.
7. If `cache_status` is `no_cache`, tell the user the workbench/list needs to be opened or refreshed in Realinsight before data can be read.

## Large Table Handling

Cached analytic and workbench rows can be too large for model context.

- Prefer paginated reads.
- Prefer CSV helper tools when the goal is local table analysis across many rows.
- Prefer entity-ref helper tools when the goal is to use a cached table as an entity population for follow-up calls.
- For multi-page or all-row analysis, write each page to a temporary CSV, JSONL, or SQLite table in the agent environment.
- Query the temporary table with local tools or ad hoc code.
- Only bring summaries, filtered subsets, anomalies, or final answer rows back into model context.
- Include cache status, row counts, truncation, and source page/workbench ids in the answer.

Use `all=true` only when the user explicitly needs broad export-style analysis and the server cap is acceptable. Even then, stage the result outside model context before detailed analysis.
