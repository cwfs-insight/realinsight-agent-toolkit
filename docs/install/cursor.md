# Cursor Install

Cursor should use the Realinsight provider plugin or direct hosted MCP URL by default. Local Node stdio MCP is an optional developer path.

## Cursor Plugin

Use one of the checked-in provider plugin paths:

```text
providers/cursor/plugin
providers/cursor/dev/plugin
providers/cursor/qa/plugin
```

Each plugin folder contains `.cursor-plugin/plugin.json`, `mcp.json`, and `skills/`.

## Remote HTTP MCP

The checked-in provider files use:

```text
Production: https://www.realinsight.cloud/api/v1/mcp
QA: https://www.ri2-qa.com/api/v1/mcp
Development: https://www.ri2-dev.com/api/v1/mcp
```

The generic production and QA remote configurations are:

```text
examples/mcp/mcp.prod.json
examples/mcp/mcp.qa.json
```

## Local Node Stdio

Use the source-based examples from a clone:

```text
examples/mcp/mcp.prod-source.json
examples/mcp/mcp.qa-source.json
examples/mcp/mcp.dev-source.json
```

Replace absolute-path placeholders. These configs run `node ./src/ri-agent.mjs mcp`; they do not depend on a published toolkit package.

## Hosted MCP Through `mcp-remote`

Use a generated `.tmp/dist/*/mcp-remote/` package when Cursor needs a local stdio MCP process but should connect to the hosted Realinsight MCP endpoint. Those configs run:

```text
npx -y mcp-remote@latest <mcp-url>
```

This is a compatibility bridge for hosts that do not yet handle remote authenticated MCP directly.

## Skill Guidance

When Cursor cannot import the skill directly, add a short project rule or instruction telling the agent to read:

```text
skills/realinsight-agent-toolkit/SKILL.md
```

and the relevant files under:

```text
skills/realinsight-agent-toolkit/references/
```
