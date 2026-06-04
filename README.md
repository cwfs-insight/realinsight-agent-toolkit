# Realinsight For Agents

Realinsight For Agents is the public distribution workspace for Realinsight agent integrations.

It packages the `ri-agent` CLI, local and hosted MCP connection examples, Codex and Claude plugin assets, Claude Desktop extension assets, and Realinsight skills for agent harnesses that can use them.

## Which Install Should I Use?

| User | Recommended path | Why |
| --- | --- | --- |
| Business user in ChatGPT | Hosted Realinsight Connector | Browser-based install and OAuth, no terminal setup. |
| Business user in Claude or Claude Desktop | Hosted custom connector | Uses Claude's connector UI and Realinsight OAuth. |
| Claude Code user | Claude plugin | Bundles the Realinsight skill and local MCP server config. |
| Claude Desktop user who needs local stdio | Claude Desktop `.mcpb` extension | One local extension bundle with the CLI runtime included. |
| Codex user | Codex plugin | Bundles the Realinsight skill and local MCP server config. |
| Cursor, Copilot, OpenCode, or other coding harness | MCP config example | Uses the shared `@realinsight/agent-toolkit` package through stdio or the hosted MCP URL. |
| Developer or pilot | `npx @realinsight/agent-toolkit` | Direct CLI, `doctor`, auth, and local MCP testing. |

Start with [docs/install/chooser.md](docs/install/chooser.md) for the full decision tree.
See [docs/environments.md](docs/environments.md) for dev, QA, production, and pilot environment packaging guidance.
See [docs/openai-apps.md](docs/openai-apps.md) for the ChatGPT Apps SDK and OpenAI submission path.

## Repository Layout

```text
packages/agent-toolkit/              # npm package for ri-agent CLI and stdio MCP
skills/                              # public Realinsight skills and references
plugins/codex/realinsight-connector/ # Codex plugin bundle
plugins/claude/realinsight-connector/ # Claude plugin bundle
extensions/claude-desktop/           # Claude Desktop MCPB source
examples/mcp/                        # MCP config examples by environment
docs/install/                        # host-specific install guides
docs/environments.md                 # dev/qa/prod environment packaging guidance
catalogs/codex/                      # Codex marketplace/catalog metadata
.claude-plugin/                      # Claude plugin marketplace metadata
```

The Realinsight release pipeline exports managed runtime, skill, plugin, and extension assets into this workspace. Repo-owned documentation, install guides, catalog metadata, security docs, and release process files should not be overwritten by that export.

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

## Package Quick Start

```bash
npx -y @realinsight/agent-toolkit@0.1.0 auth login --base-url https://www.realinsight.cloud/api/v1
npx -y @realinsight/agent-toolkit@0.1.0 doctor --json
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

## Managed Content

The managed export contract lives in [docs/release-process.md](docs/release-process.md). In short:

- Generated runtime code lives under `packages/agent-toolkit/src/`.
- Exported public skills live under `skills/`.
- Host bundle copies live under `plugins/` and `extensions/`.
- Root docs, install guides, catalog files, security files, and release process files are repo-owned.

When Realinsight starts publishing documentation corpora for agents, add them as a separate managed root with its own manifest entry rather than mixing them into the CLI or skill folders.
