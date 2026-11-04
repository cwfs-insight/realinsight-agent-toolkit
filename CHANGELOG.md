# Changelog

## 0.2.5

- Added nine integrator tools with combined configuration-option discovery, focused configuration reads and mapping edits, separate read-only validation, and approved saves.
- Added temporary Excel/CSV staging and bounded source previews for mapping and key checks.
- Added approved asynchronous scan, SQL query, connection-test and import tools using the existing integrator runtime, with a single run handle for status and result polling.
- Updated callable schemas, public workflow references and provider distributions. Integrator tools require a compatible Realinsight server and consent for the corresponding integrator scopes.

## 0.2.4

- Added a branded MCP App connection view showing the authenticated customer, user, server, permissions, and connection switching controls.
- Added `create_entity` to validate or create an entity and its initial fields in one call, with parent/field security checks and explicit approval for creation.
- Added shared output schemas, accurate local file-download results, and clearer Core validation errors.
- Updated connector metadata and bundled branding across production, dev, and QA distributions.


## 0.2.3

- Added draft SEP-2640 MCP skill discovery for the public Realinsight Agent Toolkit skill through `skills/list`, `skills/get`, and lazy `resources/read`, with complete SHA-256 resource manifests on stdio and hosted-compatible clients.
- Added `run_entity_query` for deterministic bounded populations using exact field filters, sorts, paging, and per-master top-N selection before record hydration.
- Made local OAuth scope upgrades additive to the selected profile's existing scopes so requesting a newly needed scope does not drop prior access.
- Packaged the public skill inside `@realinsight/agent-toolkit` and kept provider/extension skill copies synchronized for release 0.2.3.

## 0.1.0

- Initial public distribution workspace structure.
- Added `packages/agent-toolkit` for the `@realinsight/agent-toolkit` package.
- Added Realinsight Connector bundles for Codex and Claude Desktop.
- Added MCP examples, install guides, security guidance, and release ownership contract.
