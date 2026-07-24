# @realinsight/agent-toolkit

`@realinsight/agent-toolkit` provides the `ri-agent` CLI and local stdio MCP server for authenticated Realinsight agent access.

## Quick Start

```bash
npm run ri-agent -- auth login --base-url https://www.realinsight.cloud/api/v1
npm run ri-agent -- doctor --json
npm run ri-agent -- mcp
```

For non-production environments, set a separate base URL and profile:

```bash
RI_AGENT_BASE_URL=https://www.ri2-qa.com/api/v1 \
RI_AGENT_PROFILE=realinsight-qa \
npm run ri-agent -- mcp
```

The native `npx -y @realinsight/agent-toolkit@<version>` path is reserved for future npm publication.

## What This Package Owns

- `ri-agent` CLI commands.
- Local browser/device auth helpers.
- Stdio MCP server transport.
- Shared tool definitions for schema, entity, record, dashboard, analytic, and workbench tools.
- Environment-specific defaults through `RI_AGENT_BASE_URL`, `RI_AGENT_PROFILE`, and `REALINSIGHT_AGENT_CONFIG`.

Skills, Codex plugin manifests, Claude Desktop extension manifests, and host-specific install guides live in the repository outside this package.
