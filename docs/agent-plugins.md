# Agent Plugins package

The repository root is a production [Agent Plugins 1.0.0](https://agent-plugins.org/specification) package:

- `plugin.json` declares the portable package identity and version.
- `mcp.json` declares the production hosted Realinsight MCP server with the `streamable-http` transport.
- `skills/` contains the public Realinsight Agent Skill.

Use the repository root as the plugin directory when a client supports the Agent Plugins standard. The portable package intentionally has one production connection instead of separate production, development, and QA variants. Environment-specific provider bundles remain under `providers/`.

## Portable scope

Agent Plugins 1.0.0 standardizes the package floor, not distribution or installation:

- Clients discover the manifest only from root `plugin.json`.
- Clients discover skills only from immediate child directories under `skills/`.
- Clients discover MCP servers only from root `mcp.json`.
- A compatible client may support skills, MCP servers, or both. Unsupported component types are ignored.
- Marketplace discovery, installation, permissions, updates, and client-specific UI remain client-owned.

The [current compatible-client registry](https://agent-plugins.org/compatible-clients) lists VS Code, Cursor, GitHub Copilot, ChatGPT and Codex, and Kiro. Their install flows and supported MCP transports can differ even though they share this package format.

The checked-in native packages remain intentional compatibility layers:

| Client family | Portable root | Native distribution retained |
| --- | --- | --- |
| VS Code, Cursor, GitHub Copilot, Kiro | Use the repository root when the client accepts an Agent Plugins source. | Cursor provider bundles remain available for environment-specific installs. |
| ChatGPT and Codex | The standard registry lists skills plus stdio and Streamable HTTP support. | Public OpenAI distribution still uses the [OpenAI plugin package and universal directory](https://developers.openai.com/plugins/build/plugins), so `.codex-plugin/` assets and submission metadata remain required. |
| Claude and Claude Code | Claude is not currently listed as an Agent Plugins 1.0.0 client. | Use the checked-in `.claude-plugin/` marketplace packages or Claude Desktop MCPB. |

Format conformance therefore means the same portable directory can be loaded by conforming clients; it does not guarantee that every client exposes the same install button or public marketplace path.

## Validation

Run the portable check before provider validation:

```bash
npm run test:agent-plugin
npm run validate:agent-plugin
npm run validate:providers
```

The portable validator enforces the closed 1.0.0 manifest and MCP shapes, canonical schema identifiers, remote URL and literal-header rules, package path containment, and Agent Skills frontmatter and directory naming. Provider validation additionally pins the production server name and URL and keeps all release versions aligned.

Agent Plugins 1.0.0 does not define portable OAuth or credential-reference fields. Authentication remains client-managed: the client connects to the hosted MCP endpoint, follows its OAuth discovery flow, and stores and refreshes credentials itself. The package does not contain access tokens, refresh tokens, OAuth client secrets, or credential-bearing HTTP headers.

The 1.0.0 specification currently identifies itself as a working draft and current published release. The manifest schemas are pinned to the canonical 1.0.0 identifiers so clients can validate the package deterministically; future incompatible changes require an explicit package and validator update.
