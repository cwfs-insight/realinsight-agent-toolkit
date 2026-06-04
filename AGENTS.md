# AGENTS.md

This is the public distribution repo for Realinsight agent integrations. Keep edits small, public-safe, and aligned with the repo-owned versus generated ownership model in `docs/release-process.md`.

## Working Rules

- Treat `docs/release-process.md` and `RELEASE_MANIFEST.json` as the contract for generated content.
- The Realinsight source repo/exporter owns managed runtime, skills, and bundle copies. Do not hand-edit generated files unless the user asks for a local patch.
- Repo-owned docs, install guides, catalog metadata, security files, license, changelog, and release-process files should not be overwritten by exports.
- Keep the public marketplace production-only. `.agents/plugins/marketplace.json` should expose the production `realinsight-connector`; dev and QA manifests are opt-in/internal.
- Keep the public Claude marketplace production-only. `.claude-plugin/marketplace.json` should expose the production `realinsight-connector`; dev and QA Claude plugins are opt-in/internal.
- Preserve environment isolation with `RI_AGENT_BASE_URL`, `RI_AGENT_PROFILE`, and `REALINSIGHT_AGENT_CONFIG`.

## Structure Notes

- `packages/agent-toolkit/` contains the npm CLI and local stdio MCP runtime.
- `skills/` contains exported public Realinsight skills.
- `plugins/codex/realinsight-connector/` contains the Codex plugin bundle.
- `plugins/claude/realinsight-connector/` contains the Claude plugin bundle.
- `extensions/claude-desktop/realinsight-connector/` contains the Claude Desktop MCPB source.
- `examples/mcp/` contains host-neutral MCP config examples.
- `docs/install/` contains host-specific install guides.

## Validation

Prefer focused checks after changes:

```bash
npm run test:contract
npm run pack:dry-run
```

If only docs or manifests change, at least parse touched JSON files before handing back.
