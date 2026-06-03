# @realinsight/agent-toolkit

`@realinsight/agent-toolkit` provides the `ri-agent` CLI and local stdio MCP server for authenticated Realinsight agent access.

## Quick Start

```bash
npx -y @realinsight/agent-toolkit@0.1.0 auth login --base-url https://www.realinsight.cloud/api/v1
npx -y @realinsight/agent-toolkit@0.1.0 doctor --json
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

For non-production environments, set a separate base URL and profile:

```bash
RI_AGENT_BASE_URL=https://your-qa-realinsight-environment.example/api/v1 \
RI_AGENT_PROFILE=realinsight-qa \
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

## What This Package Owns

- `ri-agent` CLI commands.
- Local browser/device auth helpers.
- Stdio MCP server transport.
- Shared tool definitions for schema, entity, record, dashboard, analytic, and workbench tools.
- Environment-specific defaults through `RI_AGENT_BASE_URL`, `RI_AGENT_PROFILE`, and `REALINSIGHT_AGENT_CONFIG`.

Skills, Codex plugin manifests, Claude Desktop extension manifests, and host-specific install guides live in the repository outside this package.
