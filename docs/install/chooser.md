# Install Chooser

Use this page to choose the right Realinsight agent install path.

## Recommended Paths

| Harness | Best path | Notes |
| --- | --- | --- |
| ChatGPT | Hosted Realinsight Connector | Use once the hosted Streamable HTTP MCP endpoint is deployed and approved for the workspace. |
| Claude or Claude Desktop | Hosted Claude custom connector | Best nontechnical path when Claude can connect to the hosted Realinsight MCP endpoint. |
| Claude Code | Claude plugin | Installs the bundled Realinsight skill and hosted MCP server config from this repo's Claude marketplace. |
| Claude Desktop local-only | MCPB extension | Use `extensions/claude-desktop/realinsight-connector`. |
| Codex | Codex plugin | Use the repository root marketplace or `providers/codex/*` for explicit environments. |
| Cursor | Cursor plugin | Use `providers/cursor/plugin` or an explicit environment path. |
| GitHub Copilot in VS Code | MCP config | Use `docs/install/copilot-vscode.md`. |
| OpenCode | MCP config | Use `docs/install/opencode.md`. |
| Pi, OpenClaw, and other harnesses | MCP if supported | Use `docs/install/other-harnesses.md`. |
| Direct CLI | Local Node source | Use `npm run ri-agent -- ...` from this repo until the toolkit is published to npm. |

## Rule Of Thumb

Use hosted Streamable HTTP MCP for business users and local stdio MCP for developers, pilots, and harnesses that do not support hosted connectors yet. Use generated `mcp-remote` packages for stdio-only hosts that should still connect to the hosted MCP server.

Skills should be included whenever the harness supports a skill, plugin, extension, prompt, or instruction bundle. When a harness only supports MCP, pair the MCP config with a short install note that tells the agent to use the Realinsight skill instructions from this repo.
