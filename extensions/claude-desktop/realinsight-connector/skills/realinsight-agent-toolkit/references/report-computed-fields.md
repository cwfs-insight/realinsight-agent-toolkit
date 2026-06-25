# Report Computed Fields

Use this with `report-configuration.md` when adding or changing `list.columns[]` entries with `computed_column_type`.

## Formula References

Report computed formulas reference other report columns by `column_id`, not by display label or schema code.

- The formula editor shows column names for humans, but the saved payload stores bracketed ids such as `[64f...] + [650...]`.
- Preserve existing `column_id` values from `get_report` when editing formulas.
- When a new computed formula must reference another new column, provide stable ObjectId-shaped `column_id` values for those new columns in the same request; otherwise the server-generated ids cannot be referenced in the formula.
- Do not reference the column being computed.
- For post-aggregate computed formulas, referenced columns must participate in aggregation; do not reference columns whose `aggregate_options.exclude=true`.

Internal formulas use the same computed-field expression surface as the report designer. Common operators/functions include `+`, `-`, `*`, `/`, `if(...)`, `Period(...)`, `Quarter(...)`, `Day(...)`, `Month(...)`, `Year(...)`, `DateDiff(..., 'm'|'y'|'d')`, `DateAdd('m'|'y'|'d', number, ...)`, and `Today()`.

## Computed Column Types

- `DATA`: internal computed data column. Set `computed_column_data_type` and `computed_column_formula`.
- `STRAT`: stratification column. Set `computed_column_formula`, `computed_column_data_type=text`, and ordered `computed_column_strats`; the formula result is assigned to the matching range description.
- `AG_COUNT`: aggregate count column. Use `computed_column_data_type=integer`; no formula is needed.
- `REALVIEW`: RealView-backed column. Set `data_set_id`, `real_view_id`, and `computed_column_data_type`; the data type normally comes from the selected RealView.
- `REALVIEW_EMBEDDED`: embedded RealView-style column used by legacy report definitions. Preserve existing values unless intentionally matching an existing pattern.
- `SKIP`: legacy workbook copy/skip behavior. Avoid creating new `SKIP` columns unless copying an existing custom report/template pattern.
- `EXCEL`: workbook formula column. This is not the internal formula engine and is not exposed by the normal computed-field selector. Avoid creating new `EXCEL` columns unless copying an existing report/template pattern.

## Strat Ranges

For `STRAT`, `computed_column_strats` is ordered by `strat_order`.

- The first range is normalized to open-ended low.
- The last range is normalized to open-ended high.
- Ranges need distinct low/high values.
- Use clear `strat_description` values because those become the report output bucket labels.

## Aggregate Reports

For aggregate list reports:

- `aggregate_group_by` points at one or more report `column_id` values.
- `aggregate_options.exclude=false` means the column participates in aggregation.
- Numeric columns use `numeric_method` (`sum`, `avg`, `max`, `min`, or `concat`).
- Date columns use `date_method` (`latest`, `earliest`, or `concat`).
- Boolean columns use `boolean_method` (`any_yes`, `any_no`, or `both`).
- Text-like columns can concatenate, with optional uniqueness, ordering, delimiter, and space handling.
- `compute_post_agg=true` means the computed formula runs after aggregation and should only reference columns available in the aggregate result.

Always validate after computed-field changes. Return validation errors directly instead of attempting to save.
