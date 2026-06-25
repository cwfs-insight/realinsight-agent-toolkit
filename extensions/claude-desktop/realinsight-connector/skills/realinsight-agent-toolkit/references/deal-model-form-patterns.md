# Deal Model Form Map Patterns

Use this with `model-form-configuration.md` when a model form map starts from a deal, a deal child dataset, or needs to move between deal context, collateral, loans, components, or capital stack data.

Deal-centered maps are common, but do not infer a direct relationship from business wording. A user may say "deal to loans" or "deal to collateral", while the valid map path usually goes through deal component rows or capital stack rows first. Always verify the current path with `get_entity_structure` and reference fields with `get_fields` before writing map nodes.

## Verified Schema Paths

These paths are verified from the schema entity types, but still treat them as starting points to confirm in the active customer/schema context.

- Deal to collateral/property:
  `DealMaster` -> `LOWER` `DealComponentAsset` -> `LOWER` `DealComponentAssetEntities` -> `REFERENCE` `CREMaster` through `DealComponentAssetEntities.CREReference`.
- Deal to loan through deal components:
  `DealMaster` -> `LOWER` `DealComponentCapStack` -> `LOWER` `DealComponentCapStackEntities` -> `REFERENCE` `LoanMaster` through `DealComponentCapStackEntities.LoanReference`.
- Deal component loan/equity data:
  `DealComponentCapStackEntitiesData` is a periodic virtual extension of `DealComponentCapStackEntities`. Use it when the requested fields belong to component-entity data rather than directly to `LoanMaster`.
- Deal capital stack route:
  `DealMaster` -> `LOWER` `DealCapStack` -> `LOWER` `DealCapStackTranche` -> `LOWER` `DealCapStackTranchePosition` -> `REFERENCE` `LoanMaster` through `DealCapStackTranchePosition.LoanReference`.
- Capital stack owners:
  Continue from `DealCapStackTranchePosition` to `LOWER` `DealCapStackTranchePositionOwner` when the requested data is tranche-position owner detail.

Prefer the component paths for general deal-to-collateral and deal-to-loan mapping. Prefer the capital stack path when the user asks about capital stack, tranches, positions, owners, or an existing model form already uses that structure.

## Starting From Deal Children

A model form root may be `DealMaster` or a deal child dataset. If the root is a deal child, first establish whether the needed data is below that child, beside it as a sibling, above it through its parent/master, or reachable through a reference field. Do not jump directly to `LoanMaster` or `CREMaster` unless the current node has a reference field or a valid external-reference path.

## From Loan Or Collateral Back To Deal

When the root is already a loan or collateral/property master, the deal relationship is usually reached by the inverse component reference:

- From `LoanMaster`, use `REFERENCE_EXTERNAL` to `DealComponentCapStackEntities` via the target dataset's `LoanReference`, then move `UPPER` to `DealComponentCapStack`, then `UPPER` to `DealMaster`.
- From `CREMaster`, use `REFERENCE_EXTERNAL` to `DealComponentAssetEntities` via the target dataset's `CREReference`, then move `UPPER` to `DealComponentAsset`, then `UPPER` to `DealMaster`.

Validate this with `validate_update_model_form` before approval, because deal membership can be customer/workflow specific and the map must point at the exact reference item or external reference relationship.

## Master Then Child Data

Once a map reaches a top-level master entity, the requested data is often not on the master row itself. It may live in child datasets under that master.

When the user asks for financials, appraisals, balances, payments, inspections, rent rolls, covenants, or another business detail after you have reached a loan or collateral master, do not assume the fields are on the master feature. Use schema discovery first:

1. Call `get_entity_structure` with a child/dependent traversal for the master feature to list available child feature codes.
2. Use `search_features` when the business term needs a feature-code match.
3. Use `get_fields` on candidate child features to confirm the actual fields and date/as-of fields.
4. Add a `LOWER` embedded map only for the verified direct child feature.
5. If the child feature is periodic or multi-occurring, choose the periodic action and layout behavior intentionally.

For requests like "bring in financial and appraisal data plus current loan balances", build the route to the relevant top-level master first, discover the available child datasets under that master, then add embedded child nodes for the selected datasets.

## Relationship Guardrails

- Use `LOWER` only for direct child datasets verified by entity structure.
- Use `UPPER` only for direct parent/master traversal from a dependent node.
- Use `SAME` only for sibling datasets or valid virtual extensions adjacent to the current node.
- Use `REFERENCE` only when the current node has a FIELD map item whose schema field is a reference to the target feature.
- Use `REFERENCE_EXTERNAL` only when the target feature has a reference field back to the current node feature.

Build multi-step paths one embedded node at a time, validate after structural changes, and avoid adding deeper child datasets until the intermediate relationship validates cleanly.
