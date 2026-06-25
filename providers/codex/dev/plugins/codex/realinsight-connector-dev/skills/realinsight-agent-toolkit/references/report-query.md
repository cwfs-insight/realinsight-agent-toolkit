# Report Query Composition

Use this for ad hoc analytical questions before a dedicated `run_entity_query` or `run_report` tool exists.

## Current State

The toolkit exposes report definition search/read tools, but it does not yet run arbitrary report jobs or expose a general query tool. Compose small read-only answers from:

- `search_features`
- `search_fields`
- `search_entities`
- `get_children`
- `get_entity_structure`
- `get_records`
- `search_reports`
- `get_report`

If the user asks to run an existing RI report, say that report execution is not currently exposed through the toolkit. You can inspect the definition with `search_reports` and `get_report`, then answer from cached analytics/workbenches or compose a bounded lower-level read when appropriate.

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
- Do not confuse inspecting a report definition with running that report.
- Do not create unbounded fan-out. Ask for a narrower scope when root entities or child rows exceed safe limits.
- If a metric is ambiguous, present the candidate fields and ask the user to choose.
