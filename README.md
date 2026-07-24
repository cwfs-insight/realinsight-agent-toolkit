# Realinsight For Agents

Realinsight For Agents is the public distribution workspace for Realinsight agent integrations.

It packages the `ri-agent` CLI, local and hosted MCP connection examples, Codex, Claude, and Cursor plugin assets, Claude Desktop extension assets, and Realinsight skills for agent harnesses that can use them.

## Which Install Should I Use?

| User | Recommended path | Why |
| --- | --- | --- |
| Business user in ChatGPT | Hosted Realinsight Connector | Browser-based install and OAuth, no terminal setup. |
| Business user in Claude or Claude Desktop | Hosted custom connector | Uses Claude's connector UI and Realinsight OAuth. |
| Claude Code user | Claude plugin | Bundles the Realinsight skill and MCP server config. |
| Claude Desktop user who needs local stdio | Claude Desktop `.mcpb` extension | One local extension bundle with the CLI runtime included. |
| Codex user | Codex plugin | Bundles the Realinsight skill and MCP server config. |
| Cursor user | Cursor plugin | Bundles Realinsight skill files and hosted MCP config. |
| Copilot, OpenCode, or other coding harness | Generated MCP package | Uses bundled Node source, hosted HTTP MCP, or `mcp-remote` depending on host support. |
| Developer or pilot | Local Node source from this repo | Direct CLI, `doctor`, auth, and local MCP testing before npm publication. |

Start with the [guided installation site](docs/index.html) or [docs/install/chooser.md](docs/install/chooser.md) for the full decision tree.
Agents can read [docs/agent-install.md](docs/agent-install.md), [docs/install-data.json](docs/install-data.json), or [docs/llms.txt](docs/llms.txt).
See [docs/environments.md](docs/environments.md) for dev, QA, production, and pilot environment packaging guidance.
See [providers/](providers/) for checked-in provider marketplaces, and [docs/distribution-packages.md](docs/distribution-packages.md) for local-only generated package workflows.

## Quick Install Paths

Use this repository as the source:

```text
cwfs-insight/realinsight-agent-toolkit
```

| Host | Production | Development | QA |
| --- | --- | --- | --- |
| Codex marketplace | Repository root, install `realinsight-connector` | Repository root, install `realinsight-connector-dev` | Repository root, install `realinsight-connector-qa` |
| Claude marketplace path | Repository root, or `providers/claude/prod` | `providers/claude/dev` | `providers/claude/qa` |
| Cursor plugin path | `providers/cursor/plugin` | `providers/cursor/dev/plugin` | `providers/cursor/qa/plugin` |

Codex and Claude install from marketplace roots. Cursor installs from the plugin folder itself.
In Codex Desktop, leave `Sparse paths` empty when adding this GitHub marketplace; sparse paths filter the checkout but do not change the marketplace root.

Default production endpoints use:

```text
https://www.realinsight.cloud/api/v1/mcp
```

Dev and QA provider paths are intentionally explicit so they do not replace the public production default.

## Repository Layout

```text
packages/agent-toolkit/              # npm package for ri-agent CLI and stdio MCP
skills/                              # public Realinsight skills and references
plugins/codex/realinsight-connector/ # Source Codex plugin bundle copied into providers
plugins/claude/realinsight-connector/ # Source Claude plugin bundle copied into providers
extensions/claude-desktop/           # Claude Desktop MCPB source
providers/                           # checked-in Codex, Claude, and Cursor providers
examples/mcp/                        # MCP config examples by environment
docs/install/                        # host-specific install guides
docs/environments.md                 # dev/qa/prod environment packaging guidance
.claude-plugin/                      # Claude plugin marketplace metadata
```

The Realinsight release pipeline exports managed runtime, skill, plugin, and extension assets into this workspace. Repo-owned documentation, install guides, provider metadata, security docs, and release process files should not be overwritten by that export.

## Developer Quick Start

```bash
npm run ri-agent -- auth login --base-url https://www.realinsight.cloud/api/v1
npm run ri-agent -- doctor --json
npm run ri-agent -- mcp
```

For package publication testing:

```bash
npm run test:contract
npm run pack:dry-run
```

For checked-in provider marketplaces:

```bash
npm run build:providers
npm run validate:providers
```

## Local Toolkit Quick Start

```bash
npm run ri-agent -- auth login --base-url https://www.realinsight.cloud/api/v1
npm run ri-agent -- doctor --json
npm run ri-agent -- mcp
```

The native `npx -y @realinsight/agent-toolkit@<version>` path is reserved for a future npm publication. Until then, generated stdio bundles use checked-in Node source, and generated `mcp-remote` bundles use `npx -y mcp-remote@latest` as a bridge to the hosted Streamable HTTP MCP endpoint.

## Managed Content

The managed export contract lives in [docs/release-process.md](docs/release-process.md). In short:

- Generated runtime code lives under `packages/agent-toolkit/src/`.
- Exported public skills live under `skills/`.
- Host bundle copies live under `plugins/` and `extensions/`.
- Root docs, install guides, provider metadata, security files, and release process files are repo-owned.

When Realinsight starts publishing documentation corpora for agents, add them as a separate managed root with its own manifest entry rather than mixing them into the CLI or skill folders.
