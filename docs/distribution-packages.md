# Distribution Packages

Checked-in distribution surfaces are provider marketplaces, not generated `dist/` output.

## Checked-In Providers

Codex provider marketplaces live under:

```text
providers/codex/prod
providers/codex/dev
providers/codex/qa
```

Each folder is a marketplace root with its own `.agents/plugins/marketplace.json`, plugin metadata, Realinsight skill copy, and hosted HTTP MCP config.

Claude provider marketplaces live under:

```text
providers/claude/prod
providers/claude/dev
providers/claude/qa
```

Each folder is a marketplace root with its own `.claude-plugin/marketplace.json`, plugin metadata, Realinsight skill copy, and hosted HTTP MCP config.

Cursor provider plugins live under:

```text
providers/cursor/plugin
providers/cursor/dev/plugin
providers/cursor/qa/plugin
```

Each folder follows the Cursor plugin layout with `.cursor-plugin/plugin.json`, `mcp.json`, and `skills/`.

Use:

```bash
npm run build:providers
npm run validate:providers
```

The root repository marketplace still defaults to production. The provider folders exist so a user or teammate can add an explicit prod, dev, or QA marketplace from the public GitHub repo without receiving localhost or unrelated host-package files.

## Local Scratch Packages

When a one-off package is needed for Claude, Cursor, generic MCP hosts, local stdio, `.mcpb`, or `mcp-remote`, build it into `.tmp/dist`:

```bash
npm run build:dist
npm run validate:dist
```

Build only one environment when needed:

```bash
npm run build:dist:dev
npm run build:dist:qa
npm run build:dist:localhost
```

`.tmp/` is ignored by git. These local packages are not the public GitHub import surface.

## Runtime Rules

- Checked-in Codex providers use hosted Streamable HTTP MCP only.
- Local stdio packages use `node` and bundled source files.
- `mcp-remote` packages use `npx -y mcp-remote@latest` as a stdio bridge to hosted MCP.
- Native `npx @realinsight/agent-toolkit` package configs are reserved until `@realinsight/agent-toolkit` is published to npm.
- Localhost packages are scratch-only and should not be checked in.

## Codex MCP Shape

Codex plugin companion MCP files must use the wrapped shape:

```json
{
  "mcpServers": {
    "realinsight-agent-toolkit-dev": {
      "type": "http",
      "url": "https://www.ri2-dev.com/api/v1/mcp"
    }
  }
}
```

Do not write a bare top-level server object in `.mcp.json`.
