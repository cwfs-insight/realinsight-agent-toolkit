# OpenCode Install

OpenCode should use a hosted MCP endpoint when it supports authenticated remote MCP. Local Node stdio is the optional developer path.

## Remote HTTP MCP

```text
Production: https://www.realinsight.cloud/api/v1/mcp
QA: https://www.ri2-qa.com/api/v1/mcp
Development: https://www.ri2-dev.com/api/v1/mcp
```

## Local Stdio

Use:

```bash
node /path/to/ri-agent-toolkit/packages/agent-toolkit/src/ri-agent.mjs mcp
```

with `RI_AGENT_BASE_URL` set to the target environment.

For hosted MCP through a local stdio bridge, use an explicitly generated `mcp-remote` package for the target environment.

## Production Environment

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
```

Use the MCP examples under `examples/mcp/` as the source for command, args, and environment settings. For custom environments, start with `examples/mcp/mcp.custom.json`.
