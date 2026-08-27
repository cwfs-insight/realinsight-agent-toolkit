# Entity Query

Use `run_entity_query` when the user asks for an exact population, filtered list, sorted ranking, or top-N entities. It selects entity ids; call `get_records` afterward to hydrate the labels and values needed in the answer.

## Distinction

- `search_entities` finds candidate records from names, identifiers, addresses, or searchable values. It is discovery-oriented and may be fuzzy.
- `run_entity_query` selects a deterministic population from one `feature_code` using exact runtime-field filters, sorts, paging, and limits.
- `get_records` hydrates already-selected entity ids. It does not choose the population.
- `get_children` retrieves a child feature under known parent ids. Prefer it for relationship traversal and per-parent fan-out.

## Workflow

1. Discover the target `feature_code` with `search_features`.
2. Discover exact filter, sort, and output fields with `search_fields` or `get_fields`.
3. Call `run_entity_query` with a bounded `limit`. For a ranking, sort the metric descending before applying the limit.
4. Pass the returned `entity_id` values to `get_records`, requesting the ranking/filter field plus the user-facing identifying fields.
5. Report the query feature, fields, ordering, truncation, and any access warnings.

For example, “top 5 loans by balance” means a loan feature query sorted by the discovered balance field descending with `limit=5`, followed by `get_records` for the loan label/number and balance.

## Relationship Bounds

- Use either `parent_ids` or `master_ids`, never both.
- `limit_per_master` selects the top N dependent rows for every supplied master id. It requires an explicit sort and cannot be combined with global `limit` or `skip`.
- Use `get_children` instead when the task is specifically “children under these parents,” especially when a separate limit per parent is needed.

## Rules

- Use exact field names or `FeatureCode.FieldName` schema codes discovered from the authenticated customer's runtime schema.
- Keep requests bounded. Page with `skip` only when the user truly needs more than one result page, and include an explicit sort so pages are deterministic.
- Do not sort locally over an incomplete candidate set when Core can apply the sort before the limit.
- A customer-wide query still returns only entities readable by the authenticated user; OAuth scopes do not expand customer, module, team, assignment, or entity access.
