# Entity Search

Use this when the agent needs to find Realinsight entities before reading records, children, or relationships.

## Search Modes

- Generic search: call `search_entities` with only `query` when the user gives a name, id, address, loan number, or deal name and the exact dataset is unknown.
- Feature-constrained search: add `feature_code` when feature discovery already identified the target entity type.
- Explicit field search: use `schema_code`, `schema_codes`, or `feature_code` plus `field_names` when field discovery identified the exact searchable fields.
- Exact search: use `exact` only with explicit fields. Do not use exact matching for broad generic search.

## Follow-Up Pattern

1. Search entities with a small `limit`.
2. Inspect `feature_code`, `matched_value`, `parent_id`, and `master_id`.
3. If multiple plausible results exist, hydrate key fields with `get_records` or ask for clarification.
4. Use `get_entity_structure` when the next step needs parent, master, child, reference, or periodic context.
5. Use `get_children` when the user asks for rows under the found entity, such as payment history or rent-roll rows.

## Business Status And Target Selection

Search excludes soft-deleted entities, but business-inactive and not-pursued records remain discoverable for historical questions. Before choosing an extraction destination, resolving same-name candidates, or relying on an incomplete match:

1. Get the feature's `status_schema_code` from `search_features`. Do not guess a status field from its label.
2. Load that field with `get_fields`. Allowed values include the writable `code`, display/description, and optional `classification_code` from the configured `CODE` parameter. Resolve customer-defined classifications using that field's allowed codes and metadata.
3. Reuse any already-read status, or batch `get_records` for only the bounded candidate ids, declared status field, and identity fields needed to distinguish them. Do not add these reads to every routine search.
4. For current work, prefer active or potential matches only when the other identity/relationship evidence agrees. Keep inactive matches available for past or dead-deal requests. Status must not override an exact user-selected entity or authorize substituting another target.
5. A missing field, unset value, unknown classification, or `hide_from_selection` flag does not establish business activity. Ask when the intended target remains ambiguous, showing status and useful identifiers or location so same-name choices are distinguishable.

## Rules

- Pass one actual candidate name, identifier, address, or field value per query. A multiword proper name is one candidate; do not combine alternative names or unrelated clues.
- When alternatives or distinct clues are useful, make a small bounded set of independent searches in parallel and compare the candidate ids.
- Once field discovery identifies the searchable field and expected value, prefer an exact field-targeted search. Use generic or fuzzy search for discovery.
- Broad generic search is useful for user-entered names, but it is not a substitute for feature and field discovery when the task is analytical.
- Keep limits small for exploratory searches. Increase only when the user asks for a larger result set.
- Preserve result provenance and note truncation in the final answer.
- Do not fan out across customers unless a future explicit multi-customer tool exists.

## Example

For "find the Madison loan and show recent payment history":

1. `search_features` with `loan`.
2. `search_entities` with `Madison`, optionally constrained to the loan feature.
3. If there are multiple loans, `get_records` with `key_fields`.
4. `search_features` with `payment history` if the child feature is not known.
5. `get_children` with the payment-history feature, loan entity id, `mode=recent`, and a concrete payment date field found through `search_fields`.
