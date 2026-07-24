# Install Chooser

Use the [interactive install guide](../index.html) or this page to choose the right Realinsight agent install path.

The native desktop app is the primary surface when a documented desktop path exists; CLI/terminal instructions are explicit alternatives. Remote Streamable HTTP MCP is the default transport, and production is the default environment. Local Node stdio MCP is an explicit developer option and runs checked-in source from a clone; do not use a native toolkit `npx` command until the package is published.

## Recommended Paths

| Harness | Best path | Notes |
| --- | --- | --- |
| ChatGPT | Remote Realinsight MCP connector | Add the selected environment's hosted MCP URL and complete OAuth. |
| Claude or Claude Desktop | Remote Claude custom connector | Best nontechnical path when Claude can connect to the hosted Realinsight MCP endpoint. |
| Claude Code | Claude plugin | Installs the bundled Realinsight skill and hosted MCP server config from this repo's Claude marketplace. |
| Claude Desktop local-only | MCPB extension | Use `extensions/claude-desktop/realinsight-connector`. |
| Codex | Codex plugin | Use the repository root marketplace or `providers/codex/*` for explicit environments. |
| Cursor | Cursor plugin | Use `providers/cursor/plugin` or an explicit environment path. |
| GitHub Copilot in VS Code | MCP config | Use `docs/install/copilot-vscode.md`. |
| OpenCode | MCP config | Use `docs/install/opencode.md`. |
| Pi, OpenClaw, and other harnesses | Remote HTTP MCP if supported | Fall back to local Node stdio MCP when authenticated remote MCP is unavailable. |
| Direct CLI | Local Node source | Use `npm run ri-agent -- ...` from this repo until the toolkit is published to npm. |

## Rule Of Thumb

Use hosted Streamable HTTP MCP for business users and local stdio MCP for developers, pilots, and harnesses that do not support hosted connectors yet. Use generated `mcp-remote` packages for stdio-only hosts that should still connect to the hosted MCP server.

Skills should be included whenever the harness supports a skill, plugin, extension, prompt, or instruction bundle. When a harness only supports MCP, pair the MCP config with a short install note that tells the agent to use the Realinsight skill instructions from this repo.
