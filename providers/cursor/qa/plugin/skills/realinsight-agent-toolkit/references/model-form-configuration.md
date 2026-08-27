# Model Form Configuration

Use this when the user asks to inspect Realinsight model forms, Excel/PDF templates, model maps, embedded maps, map items, markers, fields used by a model form, create/copy a model form, update model-form metadata/maps, or download/upload an Excel template.

Model forms are best for transforming or presenting Realinsight data through an Excel/PDF template and map. They are the right family for workbook/form layout, formulas, repeating sections, generated files, assignment/publishing, or posting values back into Realinsight. If the user only needs a tabular extract or saved report definition, inspect reports instead.

## Read Tools

- `search_model_forms`: find visible model forms by name, root feature, folder, or active state.
- `search_model_form_folders`: find model form folders under a parent folder when the user asks for a specific destination. Use `WORKBOOKPROCESS` or `ROOT` for root.
- `get_model_form`: read one compact model form overview with process metadata, map/template summaries, counts, and latest `conflict_token`; request optional sections with `sections=template,map_tree,map_definition,node,item,used_fields`, `detail_level`, `node_id`, and `map_item_id`.
- `download_model_form_template`: download current Excel template metadata and a signed download URL; when a local file system is available, pass `output_path` so the toolkit fetches the workbook outside the tool result.
- `validate_create_model_form`: validate a new model form or derivative copy without writing.
- `create_model_form`: create a model form or copy from `source_model_form_id` after explicit approval.
- `validate_update_model_form`: validate top-level metadata changes, focused `map_patch`, or optional full flat map replacement without writing.
- `update_model_form`: update top-level metadata, focused `map_patch`, or optional full flat map definition after explicit approval.
- `stage_model_form_template_file`: create a signed multipart upload URL and staged id for a replacement Excel template after explicit approval.
- `upload_model_form_template`: finalize a replacement Excel template from a staged id after explicit approval.

## Workflow

1. Search by `search_text` or `root_feature_code`, unless the user already supplied a model form id.
2. Call `get_model_form` for summary context, including root dataset, template summary, map counts, assignment state, and the latest `conflict_token`.
3. Call `get_model_form` again with `sections=map_tree` only when the hierarchy matters.
4. Inspect only the needed node or item with `sections=node` or `sections=item` plus `node_id` and, for item reads, `map_item_id`.
5. Use `sections=used_fields` for field coverage questions, then call schema tools when field labels or relationship meaning are unclear.

## Create/Copy Workflow

1. Use `search_model_forms` and `get_model_form` when creating a derivative of an existing form; otherwise use schema tools to choose the root feature code.
2. For derivative forms, pass `source_model_form_id` and the source `conflict_token` as `expected_conflict_token`.
3. Preserve source metadata unless the user asked for changes, and pass a clear new `process_name`.
4. For creates, pass `parent_folder_id` only when the user asked for root or a specific folder. If omitted, `create_model_form` creates/uses `agent/{current user name}`. Passing `WORKBOOKPROCESS` or `ROOT` saves at root. Copying from a source form preserves the source folder only when that folder id is supplied.
5. Call `validate_create_model_form` and show any validation errors or warnings.
6. Ask the user to approve the exact create/copy side effect.
7. Call `create_model_form` only with `approved=true`.
8. Use the default `audit_detail=summary`; request `audit_detail=changes` or `audit_detail=full` only when audit/reversal work needs the extra detail.
9. Return a concise summary with the new model/form name, source context if copied, warnings, and an open link or model form id only when useful.

## Metadata And Map Update Workflow

1. Call `get_model_form` immediately before editing and keep the latest `conflict_token`.
2. Send only metadata fields that are changing; omitted metadata preserves existing values.
3. For small map edits, inspect the target `node` or `item` section and submit `map_patch`. `update_node` and `update_item` merge only supplied fields; use `replace_node` only when intentionally replacing a whole node. Supported operations are `add_node`, `update_node`, `replace_node`, `remove_node`, `add_item`, `update_item`, and `remove_item`.
4. For bulk map replacement or revert, request `sections=map_definition`, preserve unchanged nodes/items, and use temporary ids for new nodes/items so the server can assign persistent ids.
5. Pass `expected_conflict_token` from `get_model_form`.
6. Call `validate_update_model_form` and show any validation errors or warnings.
7. Ask the user to approve the exact metadata/map change.
8. Call `update_model_form` only with `approved=true`.
9. Use the default `audit_detail=summary`; request `audit_detail=changes` for changed paths/types or `audit_detail=full` only when audit/reversal work needs before/after values.
10. Return a concise write summary with the model/form name, changed metadata/map sections, warnings, and an open link or model form id only when useful for the user to jump back to it.

## Template Download/Upload Workflow

1. Call `get_model_form` for the target and keep the latest `conflict_token`.
2. Call `download_model_form_template` with a local output path when the harness supports local files; otherwise use the returned `download_url` when the harness can fetch files outside tool context.
3. Modify the Excel template locally. Preserve formulas, names, formatting, markers, and repeated-layout regions unless the user asks to change them.
4. Stage the edited workbook. Local CLI/stdio MCP can call `stage_model_form_template_file` with `file_path`, or call `upload_model_form_template` with `file_path` and let the toolkit create the stage, upload to the signed URL, and finalize. Hosted clients should call `stage_model_form_template_file` with `file_name` and optional `content_type`, upload the file as multipart form field `file` to the returned `upload_url` outside the model/tool-call body, then pass the resulting `staged_file_id` to the final tool call.
5. Call `upload_model_form_template` with `staged_file_id`, `expected_conflict_token`, and `approved=true` only after the user approves the replacement.
6. Prefer the bundled reference scripts for simple local round trips:
   - `scripts/model_form_template_roundtrip.py` uses `openpyxl` and can edit `.xlsx`/`.xlsm` files.
   - `scripts/model_form_template_roundtrip.ts` uses `exceljs` and edits `.xlsx` files.
7. Current stage/upload validation accepts Excel templates only: `.xlsx`, `.xlsm`, and `.xls` with Excel content types or `application/octet-stream`. Word, PDF, CSV, and DOCX template upload are not exposed through this tool.
8. Use the default `audit_detail=summary`; request `audit_detail=changes` or `audit_detail=full` only when audit/reversal work needs it.
9. Return a concise summary with the model/form name, uploaded file name, warnings, and open link or model form id only when useful.

Do not send workbook bytes, base64, or multipart file content in the `upload_model_form_template` tool call. The final upload tool consumes an existing staged upload by `staged_file_id`; local `file_path` is a toolkit convenience that performs the signed transfer outside model context before finalization.

## Map Payload Shape

The MCP tool schemas intentionally keep `map` and nested `node`/`item` objects compact. Use this reference plus `get_model_form sections=map_definition` when preparing a map write.

- Full `map` replacement is a flat object with optional `map_name`, `map_description`, `root_feature_code`, `sheet`, `editable`, and `nodes`.
- `nodes` is a flat list. Reconstruct hierarchy from `node_id` and `parent_node_id`; use `node_id="root"` for the root map.
- Node fields include `node_id`, `parent_node_id`, `node_type`, `map_name`, `map_description`, `relationship`, `feature_code`, `sheet`, `editable`, `reference_map_item_id`, `reference_map_schema_code`, periodic fields, layout fields, repeating fields, `sort`, `filter`, and `map_items`.
- Repeating/layout node fields include `stub_missing`, `stub_new_entities`, `start_relative_to_embed_map_id`, `relative_start_direction`, `multi_entity_direction`, `paste_action`, `sheet_name_map_item_id`, `can_insert`, `can_delete`, `multi_entity_shift_rows_columns`, `process_order`, `hide_sheet_on_complete`, `multi_entity_top`, and `multi_entity_top_records`; read `model-form-map-layout.md` before changing them.
- Map item fields include `map_item_id`, `map_order`, `item_type`, `dictionary_type`, `schema_code`, `usage`, `cell`, `use_for_sheet_name`, `output_type`, `clear_values_from_template`, `is_stub_out_key_data`, COA fields, and `pdf_field_mappings`.
- COA map item fields include `override_chart_id`, budget year controls, schedule flags, `coa_actuals_layout`, `coa_budget_layout`, and `coa_servicing_balance_layout`. Use `sections=item` or `sections=map_definition` to read full COA layouts before patching account/value/adjustment/total columns.
- `map_patch.operations[]` supports `add_node`, `update_node`, `replace_node`, `remove_node`, `add_item`, `update_item`, and `remove_item`.
- Patch operation fields include `op`, `node_id`, `map_item_id`, `parent_node_id`, `remove_children`, `node`, and `item`. `update_node` and `update_item` merge supplied fields; `replace_node` replaces the full node.
- Prefer `map_patch` for focused edits and full `map` only for bulk import, revert, or source-controlled reconstruction. Do not send both in one request.

## Map Relationships And Defaults

- Root maps use the model form root `feature_code`. Embedded maps use `relationship` plus `feature_code`.
- Valid embedded relationships are `LOWER`, `SAME`, `UPPER`, `REFERENCE`, and `REFERENCE_EXTERNAL`.
- `LOWER` means a direct child dataset of the parent node. Do not use `LOWER` for a feature that is only related through an intermediate component, cap-stack, asset, or reference path.
- `UPPER` means a direct parent/master dataset of the parent node.
- `SAME` means a sibling dataset or valid virtual extension adjacent to the parent node.
- `REFERENCE` requires `reference_map_item_id` pointing to a FIELD map item on the parent node. That field's `ref_feature_code` must match the embedded map `feature_code`.
- `REFERENCE_EXTERNAL` targets a dataset that has an external reference field back to the parent node feature.
- Valid periodic actions are `CURRENT`, `ASOF`, `EXACT`, `EARLIEST`, `DETAIL`, `MAX`, `PRIOR`, and `PRIORTOROOT`; use periodic settings only for periodic or multi-occurring target datasets.
- Valid multi-entity directions are `ACROSS`, `DOWN`, and `SHEET`. A blank direction leaves that node non-repeating and is not inherited by descendants. Core defaults an omitted direction to `DOWN` only when the same node supplies direction-dependent repeating settings. In a focused `update_node` patch, send `multi_entity_direction: ""` to clear it; omission or JSON `null` preserves the existing value.
- If `multi_entity_top=true` and no positive `multi_entity_top_records` is supplied, the server defaults to `1`.
- Map item `usage` is `REF`, `SOURCE`, or `RESULT`. Empty or omitted usage defaults to `REF` only for `FIELD` items, defaults to `SOURCE` for `COA_REF` items, and stays blank for `MARKER` items.
- `REF` is the normal read-only mapping mode for generated/reference template values. It does not post uploaded workbook values back to Realinsight.
- `SOURCE` is for a source/input cell whose uploaded workbook value should be posted back to Realinsight.
- `RESULT` is for a post-back field whose workbook value is formula-driven. Generation should preserve the formula instead of overwriting it, and upload should post the formula result back to Realinsight.
- Map item `item_type` is `FIELD` for schema-code-backed fields and `MARKER` for layout/repeating-block anchors. When omitted, the server infers `FIELD` when `schema_code` is supplied and `MARKER` otherwise. Read `model-form-map-layout.md` before changing markers or repeating sections.

Before adding embedded maps, use `search_features`, `get_entity_structure`, and `get_fields` to confirm the exact feature codes, relationships, and reference fields. If the relationship is uncertain, validate with `validate_update_model_form` before asking for approval.

## Interpretation

- Active model forms are broadly readable with the OAuth scope. Inactive model forms only appear when the user has Configuration/Admin module access.
- The map tree is flat transfer DTO data. Reconstruct hierarchy from `node_id` and `parent_node_id`.
- Markers are layout/repeating-block anchors, not entity fields. They do not appear in used-field summaries; use `model-form-map-layout.md` for marker and repeating-block changes.
- Used fields only include map items that have a schema code. They are not a complete workbook layout.
- Template summary reads intentionally return metadata, not repository file bytes. Use `download_model_form_template` when the user needs the actual Excel file.
- Excel templates support dynamic repeating rows, columns, and sheets. Fillable PDF templates are fixed-format and should not be treated like repeating Excel layouts.
- Top N, sorting, and filtering are model-map behavior. When order matters, Top N should be paired with an explicit sort field in the selected map.
- Current write tools support create/copy, metadata updates, focused map patch, full flat map replacement, staged Excel template intake, and Excel template upload. Folder CRUD, delete, PDF template upload, and runtime generation/posting are not exposed as agent tools in this phase.
- After a write, summarize the applied operation for the user rather than only returning raw ids. Prefer model/form names and links over raw ids.

For deal-centered map design, read `deal-model-form-patterns.md` before choosing embedded map relationships. For repeating layout or stub/insert behavior, read `model-form-map-layout.md`.
