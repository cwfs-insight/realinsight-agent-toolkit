# Report Query Composition

Use this for ad hoc analytical questions before a dedicated `run_entity_query`, `search_reports`, or `run_report` tool exists.

## Current State

The toolkit does not yet expose report search/run or a general query tool. Compose small read-only answers from:

- `search_features`
- `search_fields`
- `search_entities`
- `get_children`
- `get_entity_structure`
- `get_records`

If the user asks to run an existing RI report, say that report tools are planned but not currently exposed through the toolkit.

## Deterministic Composition Pattern

1. Restate the target population, metric, grouping, and limit.
2. Discover features and fields for the root entities and child rows.
3. Resolve root entity ids with `search_entities`.
4. Fetch child rows with `get_children` when the metric lives in a child dataset.
5. Hydrate labels and metric fields with `get_records`.
6. Sort/filter/group locally only on values returned by Realinsight tools.
7. Keep the result bounded and include provenance/truncation warnings.

## Example: Top Leases

For "Show me the top 5 leases for each property in the New York area for office properties":

1. Find property, lease/rent-roll, city/state/market, property type, tenant, NRA/rent fields.
2. Search or filter properties in New York with property type office.
3. For each bounded property set, fetch lease/rent-roll children.
4. Hydrate tenant and ranking metric fields.
5. Sort leases per property and return top 5 per property.
6. If the property set is too large, ask for a portfolio, market, or maximum property count before continuing.

## Rules

- Do not pretend to run RI report definitions when using composed lower-level tools.
- Do not create unbounded fan-out. Ask for a narrower scope when root entities or child rows exceed safe limits.
- If a metric is ambiguous, present the candidate fields and ask the user to choose.
