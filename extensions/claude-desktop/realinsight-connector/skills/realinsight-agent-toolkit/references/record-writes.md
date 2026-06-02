# Record Writes

Use this only when write tools are explicitly enabled and the user asks to update Realinsight data.

## Preconditions

- The connected Realinsight environment must have write tools enabled for this toolkit.
- The local toolkit must have `RI_AGENT_ENABLE_WRITE_TOOLS=1`.
- The active OAuth profile must include `ri:record.write`.
- The user must approve the exact entity id, field names, and new values before the tool call.

## Workflow

1. Resolve the target entity with `search_entities` and, when needed, `get_entity_structure`.
2. Resolve concrete field names with `search_fields` or `get_fields`; prefer `postable_only` during planning.
3. Read current values with `get_records` unless the user already supplied the exact current and new values.
4. Ask the user to approve the exact update.
5. Call `set_record` with `approved: true`.
6. Report the returned values, provenance, and warnings.

## Rules

- Do not call `set_record` based only on an inferred intent such as "clean this up" or "fix the loan."
- Do not update more fields than the user approved.
- Do not use `set_record` to create records, post pipeline output, or run workflow actions.
- Treat warnings about locked, unavailable, computed, read-only, sensitive, or security-blocked fields as part of the answer.
- Realinsight remains authoritative for edit permissions, locks, update rules, and audit behavior.
