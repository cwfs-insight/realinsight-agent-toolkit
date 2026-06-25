# Realinsight Connector For Cursor

This Cursor plugin follows the `.cursor-plugin/plugin.json`, `mcp.json`, and `skills/` layout used by Cursor plugin distributions.

Plugin: `realinsight-connector`
MCP endpoint: `https://www.realinsight.cloud/api/v1/mcp`

When adding from GitHub, use this folder path:

```text
providers/cursor/plugin
```

The bundled `mcp.json` points at the hosted Realinsight Streamable HTTP MCP endpoint. Authentication is handled by Cursor's MCP flow when supported by the installed Cursor version.
