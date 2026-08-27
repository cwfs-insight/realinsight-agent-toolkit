# Release Process

This repository is the public distribution workspace. The Realinsight release pipeline publishes managed assets into it.

## Ownership Model

| Path | Owner | Export behavior |
| --- | --- | --- |
| `packages/agent-toolkit/src/` | Realinsight release pipeline | Managed, overwrite allowed. |
| `packages/agent-toolkit/skills/` | Realinsight release pipeline | Managed npm-package copy used by MCP skill resource reads. |
| `packages/agent-toolkit/package.json` | Shared | Update version and package metadata only through the release manifest. |
| `plugin.json` | This repo with release version updates | Portable Agent Plugins manifest; preserve descriptive metadata and the pinned schema. |
| `mcp.json` | This repo with hosted environment updates | Portable Agent Plugins MCP config; keep the production entry `streamable-http` and credential-free. |
| `tools/validate-agent-plugin.mjs` | This repo | Portable Agent Plugins and Agent Skills conformance gate; update it explicitly when changing the pinned standard version. |
| `skills/` | Realinsight release pipeline for now | Managed skill export. May become source-of-truth here later. |
| `plugins/codex/realinsight-connector/skills/` | Realinsight release pipeline | Managed copy from exported public skills. |
| `plugins/codex/realinsight-connector/.codex-plugin/plugin.json` | This repo with release version updates | Do not overwrite descriptive metadata unless explicitly requested. |
| `plugins/codex/realinsight-connector/.mcp.json` | This repo with hosted environment updates | Keep the checked-in connector HTTP-only; update its hosted URL only. Generate local stdio packages separately. |
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

Hosted and local MCP transports are separate release artifacts. A hosted MCP server entry contains only `type` and `url`; a local stdio entry contains `type`, `command`, `args`, and any local environment settings. A release must fail validation if one entry mixes both shapes.

The root portable `mcp.json` follows Agent Plugins rather than a host-native configuration shape. Its production hosted entry uses `type: "streamable-http"`; host-specific Codex, Claude, Cursor, and generic examples retain the transport names required by those clients. Agent Plugins 1.0.0 has no portable OAuth or credential fields, so the root package contains no token, secret, or authorization header and relies on MCP host-managed OAuth discovery.

The portable package is production-only. Do not multiply the root manifest into dev and QA portable variants unless a real client install flow requires them; the checked-in environment-specific providers already serve that need.

Before release, run:

```bash
npm run test:agent-plugin
npm run validate:agent-plugin
npm run validate:providers
```

Changing the Agent Plugins schema version requires an explicit update to `plugin.json`, `mcp.json`, `tools/validate-agent-plugin.mjs`, and this documentation. Do not follow an unversioned draft URL at validation time.

## OpenAI Plugin Submission

OpenAI's current publication flow accepts skills-only, MCP-only, and combined MCP-plus-skills plugins through the Platform plugin submission portal. Realinsight should use a **With MCP** submission with the production universal MCP URL and the physically bundled skill.

Before submission:

1. Verify the publisher identity and ensure the submitter has Apps Management write access.
2. Verify control of the MCP domain using the portal-provided `/.well-known/openai-apps-challenge` token.
3. Configure the production universal MCP URL, OAuth, and reviewer credentials that work without MFA or private-network access.
4. Scan tools, review annotations and response data, upload the final bundled skill, and import `chatgpt-app-submission.json`.
5. Re-run the five positive and three negative review cases before submitting.

Custom UI is optional. Codex/Claude skill files remain a parallel packaging layer for hosts that support install-time skills. OpenAI can import skills during **Scan Tools** through a bounded subset of the draft Skills extension, but that remains additive rather than a reason to remove install-time skill files.

## Anthropic Directory Submission

Submit the production hosted MCP URL as a remote connector for cross-surface Claude distribution. Keep this distinct from the Claude Code plugin marketplace and local Claude Desktop MCPB release.

Before submitting, validate OAuth and all tools from Claude.ai, Claude Desktop, and Claude Code; provide a dedicated review account with sample data; verify tool annotations; and publish setup, authentication, privacy, support, and at least three working usage examples. Anthropic review remains an external gate, and the hosted URL can be installed as a custom connector while review is pending.

## Environment Manifests

The checked-in public default remains production:

- `.agents/plugins/marketplace.json` exposes the production `realinsight-connector` first, plus clearly named official dev and QA entries for Codex Desktop's repo-root marketplace flow.
- The production Codex plugin points at the hosted production Streamable HTTP MCP endpoint.
- `.claude-plugin/marketplace.json` exposes the production `realinsight-connector` first, plus clearly named official dev and QA entries.
- The production Claude plugin points at the hosted production Streamable HTTP MCP endpoint.
- The production Claude Desktop manifest defaults to the production API URL and `realinsight-prod`.

Dev and QA Codex and Claude marketplaces are official checked-in provider distributions under `providers/codex/*` and `providers/claude/*`. Codex and Claude also expose dev and QA through their root marketplaces because their GitHub marketplace flows are repo-root oriented. They use distinct names, versions, marketplace roots, and MCP server ids. They must not silently replace the checked-in production default.

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
