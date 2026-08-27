# Record Augmentation

Use this when search results need real field values before answering.

## Workflow

1. Find the target entity ids with `search_entities` or `get_entity_structure`.
   - If the source population comes from an analytic or workbench, prefer `extract_analytic_entities` or `extract_workbench_entities`.
   - If the next step needs one latest child per parent, call `get_latest_children` first, then hydrate returned `child_entity_id` values.
2. Decide the field profile:
   - `key_fields` for identity, labels, and lightweight disambiguation.
   - explicit `field_names` or `schema_codes` for a user-requested metric or column set.
3. Call `get_records` with one feature code and bounded `entity_ids`.
4. Accounts fields return their COA Data id by default. Add `accounts_projection="summary"` only when compact counts/period metadata help decide the next read.
5. Use `display_value` for user-facing labels when present, and `value` for exact ids or codes.
6. Use `warnings`, `is_truncated`, `limits`, and `provenance` in the final answer.

## Field Selection

- Use `search_fields` before explicit record hydration if the user names a business metric.
- Prefer `schema_codes` when values may come from similarly named fields across features.
- Use `field_names` only when all fields belong to the same known `feature_code`.
- Do not request every field unless the user explicitly asks for a broad inspection and the response limit is safe.
- Batch large populations by feature code. Current agent record reads are capped at 50 entity ids and 100 fields per call.

## Rules

- `get_records` is read-only and runs through Realinsight APIs. It does not bypass normal Realinsight security.
- `used_fields` is intentionally rejected until the Used Fields Cache is exposed through an agent-safe read path.
- Some fields may be omitted if unavailable or not readable. Treat warnings as part of the answer, not as noise.
- Do not infer missing values are zero or false.
- Unset dates are returned as `value = null` with `is_unset_value = true` when possible. Older raw paths may show `0001-01-01` or `1900-01-01`; treat those as unset, not real business dates.
- Dictionary, reference, user, document, currency, index-rate, and accounts fields may include `expansion_type` and `expansion_hint`. Prefer existing `display_value`; only make follow-up calls when the user needs richer detail.
- Accounts fields have runtime `field_type = "accounts"` and usually store a COA Data id in `value`. Call `get_coa_data` with that id for a summary or bounded flat values. Call `get_chart_of_accounts` separately only when chart definition/layout is needed.

## Example

For "show the maturity date and balance for these loans":

1. `search_fields` with `maturity date` for the loan feature.
2. `search_fields` with `balance` for the loan feature.
3. `get_records` with the loan entity ids and selected schema codes.
4. Answer as a compact table and include any warnings.
