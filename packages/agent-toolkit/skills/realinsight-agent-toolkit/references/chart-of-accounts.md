# Chart Of Accounts

Use this when a user asks about Chart of Accounts setup, account rows, labels, computed accounts, account types, rollups, external mappings, availability, or accounts fields on records.

## Read Workflow

1. Call `get_chart_of_accounts` by `coa_id`, chart code/name, or search text for chart configuration/layout.
2. Use `include_accounts=true` when the layout matters.
3. Narrow layout reads with `item_types`, `account_types`, `account_numbers`, `account_names`, or `item_ids` when possible.
4. For accounts record fields, call `get_records` normally to obtain the COA Data id. Use `accounts_projection="summary"` only for compact inline metadata.
5. Call `get_coa_data` with that id for a summary or bounded flat values, using source/item/year/period filters where useful.
6. Answer with the relevant chart or data facts, warnings, and truncation status.

Read results wrap the existing chart `AccountsDTO` as `chart`. Use `chart._id`, `chart.ChartName`, and account rows in `chart.Layout`; keep `conflict_token` from the wrapper when planning an update.

## Codes

- Item types: `ACCT`, `LABEL`, `COMPUTE`.
- Account types: `REV`, `EXP`, `CAP`, `MISC`, `PAY`, `REC`, `STAT`.

Use the returned `account_type_values` when presenting labels because customer/system display names can be friendlier than codes.

## Write Workflow

1. Read the current chart immediately before editing and keep the latest `conflict_token`.
2. Build a focused `set_chart_of_accounts` request.
   For each new account, either omit `item_id` or assign a clear temporary non-ObjectId stub such as `revenue_stub`. Reuse that stub in bracketed formulas and local item-id references; Core replaces every occurrence with the same generated ObjectId in the preview and saved chart.
3. Use `dry_run=true` first and show errors or warnings to the user.
4. Ask the user to approve the exact chart/account side effect.
5. Call `set_chart_of_accounts` with `approved=true` and `expected_conflict_token`.
6. Return a concise summary with the chart name, changed account rows or metadata, warnings, and audit receipt context.

Supported operations include `set_metadata`, `set_availability`, `set_rollup_charts`, `set_monitor_rule_sets`, `add_account`, `update_account`, `replace_account`, `remove_account`, and `move_account`.

## Rules

- `get_chart_of_accounts` is read-only, uses the authenticated Realinsight context without a separate COA read scope, and may be auto-approved when local policy allows.
- `set_chart_of_accounts` requires write scope, Realinsight Configuration/Admin access, latest conflict token for existing charts, and explicit approval.
- Do not remove or remap used accounts when dry-run or save returns usage warnings/errors.
- Prefer patch operations over full replacement so unchanged layout rows and mappings are preserved.
- Use `audit_detail=summary` for normal writes. Request `changes` or `full` only when the user needs audit/reversal detail.
