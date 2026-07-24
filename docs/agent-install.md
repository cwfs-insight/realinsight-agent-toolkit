# Realinsight Agent Toolkit Install Guide

This is the agent-readable companion to the interactive installation page.

## Defaults

- Install surface: native desktop app when the harness has a documented desktop path.
- Transport: remote Streamable HTTP MCP.
- Environment: production.
- Authentication: Realinsight OAuth through the agent harness for remote MCP.
- Local alternative: checked-in Node source from a clone of this repository.
- Native npm/npx package: unavailable until the toolkit is published.

## Environment inventory

| Environment | API base URL | MCP URL | Local profile |
| --- | --- | --- | --- |
| Production | `https://www.realinsight.cloud/api/v1` | `https://www.realinsight.cloud/api/v1/mcp` | `realinsight-prod` |
| QA | `https://www.ri2-qa.com/api/v1` | `https://www.ri2-qa.com/api/v1/mcp` | `realinsight-qa` |
| Development | `https://www.ri2-dev.com/api/v1` | `https://www.ri2-dev.com/api/v1/mcp` | `realinsight-dev` |

Production is the public default. QA and development must remain clearly labeled and use isolated local profiles and credential files.

## Remote HTTP MCP

Use the selected environment's MCP URL.

Generic MCP configuration:

```json
{
  "mcpServers": {
    "realinsight-agent-toolkit": {
      "type": "http",
      "url": "https://www.realinsight.cloud/api/v1/mcp"
    }
  }
}
```

Change both the server name and URL for QA or development:

- QA: `realinsight-agent-toolkit-qa` and `https://www.ri2-qa.com/api/v1/mcp`
- Development: `realinsight-agent-toolkit-dev` and `https://www.ri2-dev.com/api/v1/mcp`

### Remote OAuth flow

Remote HTTP MCP authentication belongs to the agent harness, not the local `ri-agent` profile store:

1. Add the selected MCP URL in the harness and keep OAuth enabled.
2. Follow the browser prompt through the normal Realinsight login, SSO, and MFA flow.
3. Confirm the intended Realinsight customer and requested access when prompted.
4. Return to the harness. It owns the connector session and sends an audience-bound bearer token with MCP requests.
5. Verify the connection with a small `get_tool_reference` or schema request.

Realinsight validates the token on every request and continues to enforce the signed-in user's customer context, permissions, modules, assignments, and scopes. Remote connector credentials are not stored in the local toolkit profile file. See the [authentication reference](auth.md) and [hosted Streamable HTTP MCP requirements](http-streamable-mcp.md).

### Harness routing

- ChatGPT native app: add a custom remote MCP connector with the selected MCP URL. Complete OAuth in ChatGPT. This repository does not document ChatGPT CLI or local Node paths.
- Codex Desktop: add the GitHub repository root as a marketplace, use the `main` reference, leave Sparse paths empty, and install `realinsight-connector`, `realinsight-connector-qa`, or `realinsight-connector-dev`.
- Codex CLI: run `codex plugin marketplace add cwfs-insight/realinsight-agent-toolkit --ref main`, start `codex`, then use `/plugins`.
- Claude Desktop: add the selected hosted MCP URL as a custom connector. For local Node, build and install an environment-specific MCPB extension.
- Claude Code CLI: add the `cwfs-insight/realinsight-agent-toolkit` marketplace and install the matching connector name.
- Cursor native app: use `providers/cursor/plugin`, `providers/cursor/qa/plugin`, or `providers/cursor/dev/plugin`, or add the selected remote MCP configuration in Cursor's MCP settings.
- Pi and other CLI-first MCP harnesses: use direct remote HTTP MCP when the harness supports authenticated remote servers. Otherwise use local Node stdio MCP.

## Local Node stdio MCP

Clone the public repository. Do not substitute a native npm/npx toolkit command; the package is not published yet.

Authenticate by running the checked-in source:

```bash
node packages/agent-toolkit/src/ri-agent.mjs auth login \
  --base-url https://www.realinsight.cloud/api/v1 \
  --profile realinsight-prod
```

Generic local MCP configuration:

```json
{
  "mcpServers": {
    "realinsight-agent-toolkit": {
      "type": "stdio",
      "command": "node",
      "args": ["./src/ri-agent.mjs", "mcp"],
      "cwd": "/absolute/path/to/realinsight-agent-toolkit/packages/agent-toolkit",
      "env": {
        "RI_AGENT_BASE_URL": "https://www.realinsight.cloud/api/v1",
        "RI_AGENT_PROFILE": "realinsight-prod",
        "REALINSIGHT_AGENT_CONFIG": "/absolute/path/to/.realinsight/agent-toolkit-prod.json",
        "RI_AGENT_MAX_TOOL_RESULT_BYTES": "240000"
      }
    }
  }
}
```

Replace absolute-path placeholders. For QA or development, replace the server name, base URL, profile, and credential filename together.

### Codex local plugin

Build an environment-specific local Codex marketplace:

```bash
npm run package:plugins -- --env prod --type codex --runtime node
```

Replace `prod` with `qa` or `dev`. The generated Codex marketplace is written below `.tmp/plugin-packages/<environment>/node/codex/marketplace`; it is a local scratch artifact, not a published package.

### Claude Code local plugin

Build an environment-specific local Claude marketplace:

```bash
npm run package:plugins -- --env prod --type claude-plugin --runtime node
```

Replace `prod` with `qa` or `dev`. The generated Claude marketplace is written below `.tmp/plugin-packages/<environment>/node/claude-plugin/marketplace`; it is a local scratch artifact, not a published package.

### Claude Desktop local extension

Generate and pack an environment-specific local extension:

```bash
npm run package:plugins -- --env prod --type claude-mcpb --runtime node
mcpb pack .tmp/plugin-packages/prod/node/claude-mcpb/source
```

Replace `prod` with `qa` or `dev`, then install the resulting `.mcpb` file in Claude Desktop.

## Verification and safety

For remote MCP, complete OAuth and make a small `get_tool_reference` or schema request.

For local MCP, call `auth_status` or run:

```bash
node packages/agent-toolkit/src/ri-agent.mjs doctor --json
```

Do not commit tokens, local profile files, or `.realinsight/` directories. Realinsight remains the permission and customer-data trust boundary.

## Machine-readable sources

- [`install-data.json`](install-data.json)
- [`llms.txt`](llms.txt)
- [Toolkit skill on GitHub](https://github.com/cwfs-insight/realinsight-agent-toolkit/blob/main/skills/realinsight-agent-toolkit/SKILL.md)
