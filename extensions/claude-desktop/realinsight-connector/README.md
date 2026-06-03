# Realinsight Connector For Claude Desktop

This folder is the source for a Claude Desktop `.mcpb` local extension.

## Build

```bash
mcpb pack ./extensions/claude-desktop/realinsight-connector
```

Install the generated `.mcpb` in Claude Desktop. The extension runs a local stdio MCP server and uses the local `connect_realinsight` browser/device login helper.

The default manifest points to production and uses the `realinsight-prod` profile. For QA or dev, pack a variant manifest with environment-specific `base_url` and `profile_name` defaults.

Hosted Claude custom connectors should point to `https://www.realinsight.cloud/api/v1/mcp` or the equivalent Realinsight-provided MCP URL and use OAuth authorization-code + PKCE instead.
