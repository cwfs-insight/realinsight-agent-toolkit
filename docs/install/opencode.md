# OpenCode Install

OpenCode can use the Realinsight MCP server with a local stdio command or hosted MCP endpoint.

## Local Stdio

Use:

```bash
node /path/to/ri-agent-toolkit/packages/agent-toolkit/src/ri-agent.mjs mcp
```

with `RI_AGENT_BASE_URL` set to the target environment.

For hosted MCP through a local stdio bridge, use the generated `mcp-remote` package for the target environment.

## Production Environment

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
```

Use the MCP examples under `examples/mcp/` as the source for command, args, and environment settings. For custom environments, start with `examples/mcp/mcp.custom.json`.
