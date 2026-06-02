# Realinsight Claude Desktop Extension

This folder is the source for a Claude Desktop `.mcpb` local extension.

## Build

```bash
mcpb pack ./extensions/claude-desktop/realinsight-connector
```

Install the generated `.mcpb` in Claude Desktop. The extension runs a local stdio MCP server and uses the local `connect_realinsight` browser/device login helper.

It is separate from hosted Claude custom connectors, which should point to the hosted Realinsight `/mcp` endpoint and use OAuth authorization-code + PKCE.
