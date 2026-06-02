# Field Discovery

Use this when a user asks for data but does not name exact Realinsight schema codes.

## Workflow

1. Call `search_features` with the user's business terms to identify likely feature codes.
2. Call `search_fields` with the metric, label, or filter term. Add `feature_code` when the target dataset is known.
3. Call `get_fields` when you already know the feature and need a fuller runtime field list.
4. Prefer explicit `schema_code` values in later calls when ambiguity matters.

## Tool Selection

- `search_features`: first step for nouns such as loan, deal, property, lease, rent roll, collateral, owner, payment history, operating statement.
- `search_fields`: first step for values such as balance, tenant, NRA, rent, maturity, city, state, property type.
- `get_fields`: use after a feature is known and you need available fields, key fields, or candidate filters.

## Rules

- Do not guess field names when the question depends on a precise metric. Search fields first.
- Treat field display labels as user-facing hints, not stable ids. Use `schema_code` or `field_name` from tool output in follow-up calls.
- `postable_only` is for future write planning. Current toolkit tools are read-only.
- `include_sensitive` should stay false unless the user explicitly asks for a sensitive field and the tool allows it.
- `used_fields` is not implemented yet for record hydration. Use `key_fields` or explicit fields.

## Example

For "top leases by annual rent":

1. `search_features` with `lease rent roll`.
2. `search_fields` with `annual rent` narrowed to the rent-roll feature if found.
3. `search_fields` with `tenant` and `nra` if the output should explain the ranking.
4. Use the selected fields in `get_children` or `get_records`.
