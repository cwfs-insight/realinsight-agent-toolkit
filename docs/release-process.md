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
| `plugins/codex/realinsight-connector/assets/` | This repo | Official listing/composer icon copied from `docs/assets/brand/`; copied into native providers and bundles by existing builders. |
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
5. Write source commit, generated timestamp, package version, environment, and checksums into `RELEASE_MANIFEST.json`. Use the exporter's explicit `--update-branding` flag when updating official target-owned brand assets.
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

Requirements refreshed on 2026-10-15 from OpenAI's [submission guide](https://developers.openai.com/plugins/deploy/submission), [package guide](https://developers.openai.com/plugins/build/plugins), [submission errors](https://developers.openai.com/plugins/deploy/submission-errors), [remote MCP review requirements](https://developers.openai.com/plugins/deploy/app-review), and [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines). Portal validation is the final authority.

Use **With MCP** with the production universal HTTPS endpoint and physically bundled skill. The root portable package is supported; a native Codex marketplace ZIP is a separate distribution artifact. Keep production, development, and QA distributions isolated.

### Package and listing

`plugin.json` owns the OpenAI listing in `extensions.com.openai.interface` and review cases in `extensions.com.openai.review.test_cases`. Positive and negative cases use `prompt` and `expected_behavior`. `chatgpt-app-submission.json` remains a legacy worksheet for annotations and cases; do not upload it as the current review-form import. Server annotations, schemas, security schemes, and UI resource metadata are scanned from the live endpoint and cannot be overridden by worksheet justifications.

The public listing requires a display name and subtitle of at most 30 characters, description at most 4000, publisher name at most 80, a supported category (`Business & Operations` here), and four HTTPS URLs: product website, support, privacy, and terms. The product website stays `https://www.realinsight.com`; the GitHub Pages site provides connector setup. The verified technical support destination is `https://www.realinsight.com/contact-us/`. Legal must approve connector policy coverage before adding privacy and terms URLs. The corporate website policies do not establish that coverage.

Both listing and composer icons use the official blue Realinsight mark. The existing 180×180 PNG meets the current square, 48-pixel-minimum, 4096-pixel-maximum, 5-MiB image limits. The website retains the primary and white wordmarks. Dark icon variants and screenshots are optional; do not invent screenshots of a deployed connection.

For a local review ZIP, from the repository root:

```bash
mkdir -p .tmp/openai
rm -f .tmp/openai/realinsight-plugin-0.2.4-review.zip
zip -X -r .tmp/openai/realinsight-plugin-0.2.4-review.zip plugin.json mcp.json skills docs/assets/brand/realinsight-agent-icon-180.png LICENSE
```

This allowlist excludes runtime source, other provider distributions, plans, credentials, and the legacy worksheet. The ZIP is a review candidate while release gates remain open. Rebuild it after the reviewed source export/version and final metadata; do not submit a stale 0.2.4 candidate. Existing package validators check portable/provider conformance, not all OpenAI submission requirements.

### Release and review gates

1. **Source and deployment owner:** coordinate the reviewed source export/version, including removal of the runtime Environment row. Do not patch managed public copies. Deploy the corresponding production server and verify its actual inventory and capabilities. On 2026-10-15 production OAuth discovery did not advertise `ri:entity.create`; development success does not establish production creation support.
2. **Publisher:** confirm the verified business identity, owning organization/project, global data residency eligibility, and Apps Management write permission. Choose country availability deliberately; do not infer it from a missing allowlist.
3. **Legal and support:** approve public connector policies and support ownership. Policies must cover personal-data categories, purposes, recipients, retention, and user controls. Do not equate MIT package licensing with service terms.
4. **OAuth owner:** reconcile OpenAI's per-server `extensions.com.openai.auth` settings with the pinned portable schema/validator, which currently permits only `type`, `url`, and `headers` on remote entries. Confirm CIMD/DCR or an approved registered public client, callback, resource, scopes, consent, and refresh behavior. No secret belongs in the ZIP. Check the saved portal settings before connecting; do not assume uploads replace existing registration.
5. **Reviewer account owner:** provision a dedicated account and sample customer/data on the final production endpoint. It must work immediately without MFA approval, email/SMS codes, magic links, or private-network access. Seed the sample loan, latest servicing children, analytic, and creation feature/parent/field needed by the five draft cases. Run all five positive and three negative cases with that account, document actual results, and record an accessible walkthrough. Provide reviewer credentials and private sign-in instructions only in the secure portal.
6. **Production verification:** exercise permission and scope denial, approved write behavior, failed-write rollback and hooks with authorized sample data, customer reconnect, refresh-token rotation, disconnect/revocation, and errors. Check annotations against actual behavior and confirm advertised structured outputs match their schemas. Verify MCP App CSP and connection-card behavior in the target host. Global/thread entrypoint declarations do not prove host support or a settings surface.
7. **Portal:** upload the final ZIP, verify the exact domain challenge at the portal-provided HTTPS `/.well-known/openai-apps-challenge` URL, connect OAuth, inspect scanned tools and skill findings, and resolve required issues. Enter reviewer access, walkthrough, and release notes, then review imported metadata, countries, and policy attestations. Submit only with explicit user authorization. After approval, publication is another explicit action.

Custom UI is optional. Hosted tool updates undergo continuous review; metadata, assets, and bundled skill changes require a new ZIP. Preserve published schemas and UI resource contracts while server updates are under review. See the ongoing [MCP review requirements](https://developers.openai.com/plugins/deploy/app-review).

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

## 0.2.4 deployment checks

Deploy the corresponding Core API before enabling the new connection and entity-creation tools. Existing OAuth grants do not automatically gain `ri:entity.create`; request fresh consent when creation is needed. Verify customer switching, permission denial, representative creation hooks, and rollback against test data before connector-store submission. Git publication and local package validation do not certify a deployed connector.

Output schemas are advertised at tool discovery. Hosts control whether they load the entire inventory or defer tool search; measure context usage in each target host. MCP App UI requires a compatible host, while ordinary tools remain usable without the card.
