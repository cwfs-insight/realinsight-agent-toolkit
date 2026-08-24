# RealVIEW Configuration

Use this reference when the user explicitly asks to inspect or change RealVIEW system configuration, or to execute a known RealVIEW. RealVIEWS are customer-defined, runtime-calculated fields: a definition starts at one `root_feature_code`, follows ordered relationship maps, and returns a field value, aggregate, linkable result, or entity population.

## Read and execute workflow

1. Call `get_realviews` with a `realview_id`, root feature, or narrow search text. The response contains the full ordered definition and `conflict_token`.
2. Inspect `display`, `root_feature_code`, `field_type`, `source_field_template`, aggregation, result-link/population flags, and every ordered map. Do not treat a RealVIEW definition as an entity field value.
3. Prefer user-specified root entities. Otherwise use `search_entities` for the RealVIEW's root feature and `get_records` only when friendly labels or confirmation fields are needed. Ask the user to choose when the intended entity is ambiguous.
4. Call `execute_realview` with one `realview_id` and one to 100 matching `entity_ids`. Inspect each entity's `has_result`, `value`, optional result-entity identity, and `error` together. The result order matches the input entity order.
5. A blank result can be valid when no related data matches the path. Debug errors or unexpected blanks by checking the root feature, each relationship and target feature, reference fields, filters/sorts/selectors, periodic settings, the final source field, and aggregation requirements.

## Write workflow

1. Read the latest complete definition immediately before editing and preserve unchanged map ids, order, and settings.
2. Send the complete replacement definition to `set_realview` with `dry_run=true`. New definitions omit `realview_id`; replacements include it and the latest `expected_conflict_token`.
3. Review normalized output, errors, and warnings. Do not write when validation reports an unsupported expression/nested-RealVIEW source, invalid feature/field, missing relationship input, or duplicate map order.
4. Ask the user to approve the exact RealVIEW name, root feature, path, final result, and changed settings.
5. Call `set_realview` with `approved=true`, then call `get_realviews` again and `execute_realview` against representative entities. A successful save does not prove the configured result is semantically correct.

Configuration reads and writes require Configuration or Admin access plus their respective `ri:realviews.read` or `ri:realviews.write` scope. Execution requires `ri:realviews.read` and normal access to every requested entity; it does not require configuration-module access. Normal writes should leave `audit_detail=summary`; use `changes` or `full` only for audit/reversal work.

## Map cautions

- Maps execute in ascending `order`; the root map and definition must agree on `root_feature_code`.
- Relationship types include self, parent, master, reference, reference_external, child, sibling, structure, and virtual. Reference relationships require the reference field; traversing relationships require the intended target feature.
- Multiple final records generally need aggregation or population behavior. Do not assume every selector/periodic combination exposed by older UI is supported by the current executor.
- Expression and nested-RealVIEW source templates are not supported by the current executor. Direct fields and supported aggregations are the reliable paths.
