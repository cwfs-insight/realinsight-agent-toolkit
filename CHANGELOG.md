# Changelog

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
