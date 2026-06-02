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
| `extensions/claude-desktop/realinsight-connector/src/` | Realinsight release pipeline | Managed, overwrite allowed. |
| `extensions/claude-desktop/realinsight-connector/skills/` | Realinsight release pipeline | Managed copy from exported public skills. |
| `extensions/claude-desktop/realinsight-connector/manifest.json` | This repo with generated tool list updates | Preserve display/auth metadata unless explicitly requested. |
| `examples/mcp/` | This repo with release version updates | Generated examples may update version and environment URLs. |
| `docs/`, `README.md`, `catalogs/`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE` | This repo | Never overwrite from generated export. |

## Export Rules

The exporter should be allowlist-driven:

1. Read `RELEASE_MANIFEST.json`.
2. Verify the target path is inside an allowed managed root.
3. Refuse to overwrite repo-owned files unless a release flag explicitly permits it.
4. Preserve or regenerate `.realinsight-managed-*.json` markers in managed folders.
5. Write source commit, generated timestamp, package version, environment, and checksums into `RELEASE_MANIFEST.json`.
6. Run a dry-run diff before writing.
7. Run contract smoke tests and package dry-run checks after writing.

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
