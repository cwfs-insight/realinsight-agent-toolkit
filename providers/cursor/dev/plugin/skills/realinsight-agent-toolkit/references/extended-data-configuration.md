# Extended Data Configuration

Use this reference only when the user explicitly asks to inspect or change Extended Data system configuration. Extended Data has two persisted customer configuration kinds:

- `custom`: a new customer field. Core generates an id-based field name and schema code `<feature_code>.<configuration_id>`.
- `overlay`: customer metadata layered over an existing system field. It keeps the system field's schema code and cannot change its owning feature or data type.

This is deliberately separate from ordinary field tools. `get_extended_data` returns compact persisted customer configuration, its kind, schema code, and conflict token. `search_fields`/`get_fields` return the merged runtime field catalog used for records, reports, and model forms. `set_record` changes an entity value; it never changes an Extended Data definition.

## Read workflow

1. Call `get_extended_data` by `configuration_id`, `schema_code`, `feature_code`, kind, or narrow search text.
2. Inspect `kind`, `schema_code`, and `field`. Use `search_fields` or `get_fields` separately only when the effective runtime field is needed.
3. For an overlay, `system_schema_code` on create identifies the existing system field. For a custom field, omit it and provide the owning `feature_code`.
4. Configuration reads have no tool-specific row limit. Narrow by configuration id, schema code, feature, kind, or search text whenever possible, and include inactive definitions only when the task requires them.

## Write workflow

1. Use the default `upsert` operation: omit `configuration_id` to create or supply it to update. Use `deactivate` only to inactivate an existing definition.
2. For create, provide field settings. A custom field requires `feature_code`; an overlay requires `system_schema_code`. For update/deactivate, call `get_extended_data` immediately first and pass `configuration_id` plus the latest `expected_conflict_token`.
3. Call `set_extended_data` with `dry_run=true`. Review normalized output, warnings, and `affected_resources`.
4. Ask the user to approve the exact field label/schema context, operation, and material settings. Then call with `approved=true`.
5. Read the configuration again. When the user also wants to verify runtime discovery, call `search_fields` or `get_fields` separately after save.

Writes require `ri:extended_data.write` plus Configuration or Admin access. Reads require `ri:extended_data.read`. Normal writes should leave `audit_detail=summary`; use `changes` or `full` only for audit/reversal work.

## Safety and supported settings

- The owning feature, system-field identity, and field type cannot change after creation.
- Reference custom fields require `ref_feature_code`.
- Sensitive fields are normalized to non-searchable. Disabling search or marking a field sensitive removes its search-index rows.
- Enabling search updates configuration immediately, but historical search-index population remains asynchronous maintenance work.
- Deactivation and enabling encryption are blocked when active indexed usages make the change unsafe. Remove or migrate affected usage first; do not bypass the block.
- Supported settings include label/description, type at creation, reference metadata, length/precision, dictionary values, list/key-info placement, computed formula/order, searchable, sensitive, encrypted, and multi-select behavior.
