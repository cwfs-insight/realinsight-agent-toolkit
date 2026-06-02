# OpenCode Install

OpenCode can use the Realinsight MCP server with a local stdio command or hosted MCP endpoint.

## Local Stdio

Use:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

with `RI_AGENT_BASE_URL` set to the target environment.

## Production Environment

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud
```

Use the MCP examples under `examples/mcp/` as the source for command, args, and environment settings. For custom environments, start with `examples/mcp/mcp.custom.json`.
