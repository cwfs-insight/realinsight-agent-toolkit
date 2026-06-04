# Pipeline Tools

Use this when pipeline tools are explicitly enabled and the user asks an agent to run or inspect document pipelines.

## Current State

Pipeline queue/status tools are implemented but paused from the default toolkit MCP/CLI surface while the product workflow is refined.

Required enablement:

- The connected Realinsight environment must have pipeline tools enabled for this toolkit.
- Local toolkit: `RI_AGENT_ENABLE_PIPELINE_TOOLS=1`

Implemented tools:

- `queue_pipeline`
- `get_pipeline`
- allowlisted pipeline types: `doc_extract`, `rent_roll_extract`, `financial_extraction`, `entity_extraction`, and `op_stmt_spread`

## Current Agent Behavior

- Do not use pipeline tools unless they are present in `ri-agent tools` or MCP `tools/list`.
- Use `get_pipeline` for read-only status checks when a pipeline id is known.
- Queueing is a side effect. Do not call `queue_pipeline` until the user explicitly approves that exact queue action.
- Pass `approved: true` only after explicit approval.
- `queue_pipeline` requires a `DocumentTracking` id through `doc_id`; direct local file upload is not available yet.
- `rent_roll_extract`, `financial_extraction`, and `op_stmt_spread` require a known property context through `property_entity_id` or `cre_master_id`.
- Page-scoped pipelines require `start_page`; use `end_page: 0` to continue through the end of the document.
- Do not call unrelated record/entity tools to simulate pipeline queueing.

## Future Rules

- Direct local file upload should create or select a `DocumentTracking` record before queueing.
- Keep posting/creating extracted records behind separate review-gated tools.
- Add audit records for queued pipelines.
- Add a file upload or document-selection flow so the user can supply a local PDF, Excel, Word, or other file before queueing.
- Refine a section-selection flow where document extraction can run first, then the agent asks the user which detected section/pages should feed rent roll or financial extraction.
