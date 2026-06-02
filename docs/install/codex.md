# Codex Install

Codex should use the Realinsight Connector plugin when possible.

## Plugin

The plugin source lives at:

```text
plugins/codex/realinsight-connector
```

The plugin bundles:

- Realinsight skill instructions.
- Stdio MCP server config for the published toolkit package.
- User-facing metadata for the Codex plugin directory.

## Marketplace Catalog

Codex catalog metadata is stored under:

```text
catalogs/codex/marketplace.json
```

If your Codex install supports repository marketplace metadata, publish or copy that catalog into the Codex-supported marketplace location for your environment, such as:

```text
.agents/plugins/marketplace.json
```

Keep the catalog entry pointed at:

```text
plugins/codex/realinsight-connector
```

## MCP Auth

The plugin launches:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

Use the `connect_realinsight` helper tool or run:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 auth login --base-url https://www.realinsight.cloud
```
