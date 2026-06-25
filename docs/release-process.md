# Release Process

This repository is the public distribution workspace. The Realinsight release pipeline publishes managed assets into it.

## Ownership Model

| Path | Owner | Export behavior |
| --- | --- | --- |
| `packages/agent-toolkit/src/` | Realinsight release pipeline | Managed, overwrite allowed. |
| `packages/agent-toolkit/package.json` | Shared | Update version and package metadata only through the release manifest. |
| `skills/` | Realinsight release pipeline for now | Managed skill export. May become source-of-truth here later. |
| `plugins/codex/realinsight-connector/skills/` | Realinsight release pipeline | Managed copy from exported public skills. |
| `plugins/codex/realinsight-connector/.codex-plugin/plugin.json` | This repo with release version updates | Do not overwrite descriptive metadata unless explicitly requested. |
| `plugins/codex/realinsight-connector/.mcp.json` | This repo with release version updates | Update package version and default environment only. |
| `plugins/claude/realinsight-connector/skills/` | Realinsight release pipeline | Managed copy from exported public skills. |
| `plugins/claude/realinsight-connector/.claude-plugin/plugin.json` | This repo with release version updates | Do not overwrite descriptive metadata unless explicitly requested. |
| `plugins/claude/realinsight-connector/.mcp.json` | This repo with release version updates | Update package version and default environment only. |
| `.claude-plugin/marketplace.json` | This repo with release version updates | Public Claude marketplace metadata. Keep production first, with clearly named dev and QA entries when official. |
| `extensions/claude-desktop/realinsight-connector/src/` | Realinsight release pipeline | Managed, overwrite allowed. |
| `extensions/claude-desktop/realinsight-connector/skills/` | Realinsight release pipeline | Managed copy from exported public skills. |
| `extensions/claude-desktop/realinsight-connector/manifest.json` | This repo with generated tool list updates | Preserve display/auth metadata unless explicitly requested. |
| `providers/` | This repo, generated from checked-in plugin and skill sources | Checked-in Codex, Claude, and Cursor provider roots. Rebuild with `npm run build:providers`; do not hand-edit copied provider skills. |
| `examples/mcp/` | This repo with release version updates | Generated examples may update version and environment URLs. |
| `docs/`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE` | This repo | Never overwrite from generated export. |

## Export Rules

The exporter should be allowlist-driven:

1. Read `RELEASE_MANIFEST.json`.
2. Verify the target path is inside an allowed managed root.
3. Refuse to overwrite repo-owned files unless a release flag explicitly permits it.
4. Preserve or regenerate `.realinsight-managed-*.json` markers in managed folders.
5. Write source commit, generated timestamp, package version, environment, and checksums into `RELEASE_MANIFEST.json`.
6. Run a dry-run diff before writing.
7. Run contract smoke tests and package dry-run checks after writing.

## Environment Manifests

The checked-in public default remains production:

- `.agents/plugins/marketplace.json` exposes the production `realinsight-connector`.
- The production Codex plugin points at the hosted production Streamable HTTP MCP endpoint.
- `.claude-plugin/marketplace.json` exposes the production `realinsight-connector` first, plus clearly named official dev and QA entries.
- The production Claude plugin points at the hosted production Streamable HTTP MCP endpoint.
- The production Claude Desktop manifest defaults to the production API URL and `realinsight-prod`.

Dev and QA Codex and Claude marketplaces are official checked-in provider distributions under `providers/codex/*` and `providers/claude/*`. They use distinct names, versions, marketplace roots, and MCP server ids. They must not silently replace the checked-in production default.

Cursor provider plugins are checked in under `providers/cursor/plugin`, `providers/cursor/dev/plugin`, and `providers/cursor/qa/plugin`. They use the same hosted MCP endpoints and copied skill files as the Codex and Claude providers.

When rendering an environment-specific local MCP bundle, set:

- `RI_AGENT_BASE_URL` to the target API base URL.
- `RI_AGENT_PROFILE` to `realinsight-dev`, `realinsight-qa`, or another clear environment profile.
- `REALINSIGHT_AGENT_CONFIG` to an environment-specific credential file when the host supports it.

## Future Documentation Packages

When Realinsight publishes documentation corpora for agents, add a new managed root instead of mixing them into skills or the CLI runtime.

Suggested future shape:

```text
docs-packages/
  realinsight-product/
  realinsight-api/
  realinsight-servicing/
```

Each documentation package should declare:

- Source package identifier and version.
- Audience.
- Visibility level.
- How agents should discover it: MCP resource, CLI command, local file reference, or skill reference.
- Redaction and secret-scan status.
