# @realinsight/agent-toolkit

`@realinsight/agent-toolkit` provides the `ri-agent` CLI and local stdio MCP server for authenticated Realinsight agent access.

## Quick Start

```bash
npx -y @realinsight/agent-toolkit@0.1.0 auth login --base-url https://www.realinsight.cloud/api/v1
npx -y @realinsight/agent-toolkit@0.1.0 doctor --json
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

## What This Package Owns

- `ri-agent` CLI commands.
- Local browser/device auth helpers.
- Stdio MCP server transport.
- Shared tool definitions for schema, entity, record, dashboard, analytic, and workbench tools.

Skills, Codex plugin manifests, Claude Desktop extension manifests, and host-specific install guides live in the repository outside this package.
