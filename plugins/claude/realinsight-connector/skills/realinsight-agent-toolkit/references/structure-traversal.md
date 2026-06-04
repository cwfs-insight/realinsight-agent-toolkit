# Structure Traversal

Use this when the user asks how entities are related or when the next tool call needs parent, master, child, reference, or periodic context.

## Traversals

| Traversal | Use For | Required Inputs |
| --- | --- | --- |
| `parent` | Find each entity's direct parent. | `entity_ids` |
| `master` | Find each entity's master/root entity. | `entity_ids` |
| `children` | Get direct children for specific child features. | `entity_ids`, `feature_code` or `feature_codes` |
| `all_dependents_for_master` | Get dependent rows under a master for selected features. | `entity_ids`, `feature_code` or `feature_codes` |
| `references` | Follow xref/reference fields from source entities. | `entity_ids`, `reference_feature_code` |
| `referenced_by` | Find entities of a feature that reference the source ids. | `entity_ids`, `feature_code` |
| `periodic_current` | Get the current periodic child/entity for a feature. | `entity_ids`, `feature_code` |
| `periodic_as_of` | Get the periodic child/entity as of a date. | `entity_ids`, `feature_code`, `as_of_date` |

## Rules

- Use one traversal per call. Chain explicit follow-up calls when the workflow needs multiple hops.
- Keep `limit` bounded and read warnings for truncated graph nodes.
- Use `get_records` after traversal when the final answer needs labels or values for returned nodes.
- Use `get_children` instead of `get_entity_structure` when the main output is a sorted or filtered child row list.
- Use `get_latest_children` instead of `get_children` when the workflow needs one latest child per parent. Supply the concrete child sort field, then hydrate returned `child_entity_id` values with `get_records`.

## Examples

- "What deal is this loan in?": `get_entity_structure` with `traversal=parent` or `master`, then `get_records` on returned deal/master nodes.
- "Get all collateral for this loan": find the collateral feature, then `get_entity_structure` with `traversal=children` if collateral is direct, or `all_dependents_for_master` if collateral sits under the master.
- "Show the current property financial period": find the periodic feature, then use `periodic_current`.
- "Show the latest inspection for each property": find the inspection child feature and date field, call `get_latest_children`, then call `get_records` on returned inspection ids.
