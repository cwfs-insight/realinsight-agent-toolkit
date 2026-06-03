# Claude Install

Use one of two paths.

## Hosted Claude Connector

Use this for business users when the hosted Realinsight MCP endpoint is available.

- MCP endpoint: `https://www.realinsight.cloud/api/v1/mcp`, or the equivalent MCP URL for a Realinsight-provided environment.
- Auth: OAuth authorization-code with S256 PKCE.
- Skills/instructions: provide the Realinsight skill as connector guidance where Claude supports it.

## Claude Desktop Local Extension

Use this for local stdio MCP installs:

```bash
mcpb pack ./extensions/claude-desktop/realinsight-connector
```

Install the generated `.mcpb` in Claude Desktop. The extension includes the local MCP runtime and uses the `connect_realinsight` browser login helper.

The default MCPB manifest points to production and uses the `realinsight-prod` auth profile. For QA or development, pack a variant manifest with a distinct extension name, `base_url` default, and `profile_name` default. See [../environments.md](../environments.md).
