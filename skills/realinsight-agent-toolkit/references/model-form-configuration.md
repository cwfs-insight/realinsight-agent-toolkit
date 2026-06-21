# Model Form Configuration

Use this when the user asks to inspect Realinsight model forms, Excel/PDF templates, model maps, embedded maps, map items, markers, fields used by a model form, create/copy a model form, update model-form metadata/maps, or download/upload an Excel template.

Model forms are best for transforming or presenting Realinsight data through an Excel/PDF template and map. They are the right family for workbook/form layout, formulas, repeating sections, generated files, assignment/publishing, or posting values back into Realinsight. If the user only needs a tabular extract or saved report definition, inspect reports instead.

## Read Tools

- `search_model_forms`: find visible model forms by name, root feature, folder, or active state.
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
4. Call `validate_create_model_form` and show any validation errors or warnings.
5. Ask the user to approve the exact create/copy side effect.
6. Call `create_model_form` only with `approved=true`.
7. Use the default `audit_detail=summary`; request `audit_detail=changes` or `audit_detail=full` only when audit/reversal work needs the extra detail.
8. Return a concise summary with the new model/form name, source context if copied, warnings, and an open link or model form id only when useful.

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
4. Stage the edited workbook. Local CLI/stdio MCP can call `stage_model_form_template_file` with `file_path`, or call `upload_model_form_template` with `file_path` and let the toolkit create the stage, upload to the signed URL, and finalize. Hosted clients should call `stage_model_form_template_file` with `file_name` and optional `content_type`, upload the file as multipart form field `file` to the returned `upload_url`, then pass the resulting `staged_file_id` to the final tool call.
5. Call `upload_model_form_template` with `staged_file_id`, `expected_conflict_token`, and `approved=true` only after the user approves the replacement.
6. Prefer the bundled reference scripts for simple local round trips:
   - `scripts/model_form_template_roundtrip.py` uses `openpyxl` and can edit `.xlsx`/`.xlsm` files.
   - `scripts/model_form_template_roundtrip.ts` uses `exceljs` and edits `.xlsx` files.
7. Current stage/upload validation accepts Excel templates only: `.xlsx`, `.xlsm`, and `.xls` with Excel content types or `application/octet-stream`. Word, PDF, CSV, and DOCX template upload are not exposed through this tool.
8. Use the default `audit_detail=summary`; request `audit_detail=changes` or `audit_detail=full` only when audit/reversal work needs it.
9. Return a concise summary with the model/form name, uploaded file name, warnings, and open link or model form id only when useful.

## Interpretation

- Active model forms are broadly readable with the OAuth scope. Inactive model forms only appear when the user has Configuration/Admin module access.
- The map tree is flat transfer DTO data. Reconstruct hierarchy from `node_id` and `parent_node_id`.
- Markers are layout/repeating-block anchors, not entity fields. They do not appear in used-field summaries.
- Used fields only include map items that have a schema code. They are not a complete workbook layout.
- Template summary reads intentionally return metadata, not repository file bytes. Use `download_model_form_template` when the user needs the actual Excel file.
- Excel templates support dynamic repeating rows, columns, and sheets. Fillable PDF templates are fixed-format and should not be treated like repeating Excel layouts.
- Top N, sorting, and filtering are model-map behavior. When order matters, Top N should be paired with an explicit sort field in the selected map.
- Current write tools support create/copy, metadata updates, focused map patch, full flat map replacement, staged Excel template intake, and Excel template upload. Folder CRUD, delete, PDF template upload, and runtime generation/posting are not exposed as agent tools in this phase.
- After a write, summarize the applied operation for the user rather than only returning raw ids. Prefer model/form names and links over raw ids.
