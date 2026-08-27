# Model Form Map Layout

Use this with `model-form-configuration.md` when changing workbook layout behavior: markers, repeating blocks, multi-entity sections, dynamic sheets, Top N, or stub/insert settings.

## Markers

- `MARKER` map items are layout anchors for workbook generation. They are not schema fields and do not appear in `used_fields`.
- Markers should not be used as `REFERENCE` map items. A `REFERENCE` embedded map needs a FIELD map item whose `schema_code` is a reference field to the embedded target feature.
- Normal schema-backed map items should use `item_type=FIELD`. When `item_type` is omitted, Core infers `FIELD` when `schema_code` is supplied and `MARKER` otherwise.
- Inspect `sections=node` or `sections=item` when layout behavior matters; `sections=used_fields` intentionally omits markers and other pure layout anchors.

## Repeating Sections

- Multi-entity embedded maps can repeat by row, column, or sheet. Valid `multi_entity_direction` values are `DOWN`, `ACROSS`, and `SHEET`. A blank direction leaves that node non-repeating and does not inherit a direction from an ancestor. Core defaults an omitted direction to `DOWN` only when the same node supplies direction-dependent repeating settings. In a focused `update_node` patch, send `multi_entity_direction: ""` to clear it; omission or JSON `null` preserves the existing value.
- `start_relative_to_embed_map_id` and `relative_start_direction` control layout relative to another embedded map. Preserve existing relative-layout anchors unless the user asks to move the repeated region.
- `sheet_name_map_item_id` can derive dynamic sheet names from a map item. Verify the target item exists and belongs to the repeated section before changing it.
- `multi_entity_top=true` limits repeated rows to the top N records. If no positive `multi_entity_top_records` is supplied, Core defaults it to `1`. Use explicit sorting when the selected "top" row matters.

## Stub And Insert Behavior

Stub and insert settings are node-level behavior, separate from map item `usage`.

- `stub_missing` and `stub_new_entities` relate to creating placeholder repeated records during generation.
- `can_insert` and `can_delete` control whether generated forms can insert or delete repeated records.
- `multi_entity_shift_rows_columns` controls whether repeated generated sections shift surrounding rows or columns.
- Only change these settings when the user explicitly asks for stubbing, pre-created rows, insert/delete behavior, or repeated-section generation behavior. Do not infer them from `SOURCE` or `RESULT` map item usage.

## Usage Is Not Layout

Map item `usage` controls value direction for a field item, not repeated layout:

- `REF` is normal read-only generation/reference behavior.
- `SOURCE` means uploaded workbook input can post back to Realinsight.
- `RESULT` means the workbook cell is formula-driven; generation should preserve the formula, and upload should post the formula result.

Default usage depends on item type. `FIELD` items default to `REF`, `COA_REF` items default to `SOURCE`, and `MARKER` items stay blank unless a usage is explicitly supplied.

## COA Map Items

COA item mappings are map-item configuration, not Chart of Accounts CRUD. Use them when a model form needs to place or post account rows from a referenced COA.

- `COA_REF` items can carry budget-year controls, schedule flags, `coa_actuals_layout`, `coa_budget_layout`, and `coa_servicing_balance_layout`.
- `coa_actuals_layout` includes account, label, value, adjustment, total, notes, header, external xref, and feature/header-field mapping columns.
- `coa_budget_layout` includes account, label, value, total, notes, year, format, skip-column, header, external xref, and feature/header-field mapping columns.
- `coa_servicing_balance_layout` includes COA name, loan number, header row, first account row, label, account, and value columns.
- Request `get_model_form` with `sections=item` for a single map item or `sections=map_definition` for full-map round trips before sending a COA layout patch.

Runtime generation and posting tools are not exposed in this toolkit phase. Configuration tools can inspect and edit these settings, but agents should validate map changes and get explicit user approval before saving.
