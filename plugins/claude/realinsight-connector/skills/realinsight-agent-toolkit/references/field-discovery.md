# Field Discovery

Use this when a user asks for data but does not name exact Realinsight schema codes.

## Workflow

1. Call `search_features` with the user's business terms to identify likely feature codes.
2. Call `search_fields` with the metric, label, or filter term. Add `feature_code` when the target dataset is known.
3. Call `get_fields` when you already know the feature and need the full runtime mapping guidance, including field descriptions and allowed value codes.
4. Prefer explicit `schema_code` values in later calls when ambiguity matters.

## Tool Selection

- `search_features`: first step for nouns such as loan, deal, property, lease, rent roll, collateral, owner, payment history, operating statement.
- `search_fields`: first step for values such as balance, tenant, NRA, rent, maturity, city, state, property type.
- `get_fields`: use after a feature is known and you need available fields, descriptions, allowed value codes, key fields, or candidate filters.

## Rules

- Use one coherent feature or field concept per query. A multiword phrase such as `operating statement` or `maturity date` is one concept; a list of alternatives is not.
- When several alternatives may match, make two to four independent bounded calls, in parallel when useful, and compare or deduplicate the results.
- Do not guess field names when the question depends on a precise metric. Search fields first.
- Treat field display labels as user-facing hints, not stable ids. Use `schema_code` or `field_name` from tool output in follow-up calls.
- For fields with `values`, submit the returned `code`, using each value's display and description to select the right business meaning. Do not select a value marked `hide_from_selection` for new data.
- `postable_only` is for write planning. Write tools still require the matching write scope and explicit approval.
- `include_sensitive` should stay false unless the user explicitly asks for a sensitive field and the tool allows it.
- `used_fields` is not implemented yet for record hydration. Use `key_fields` or explicit fields.

## Example

For "top leases by annual rent":

1. Run independent `search_features` calls with `lease` and `rent roll`, then compare the candidates.
2. `search_fields` with `annual rent` narrowed to the rent-roll feature if found.
3. `search_fields` with `tenant` and `nra` if the output should explain the ranking.
4. Use the selected fields in `get_children` or `get_records`.
