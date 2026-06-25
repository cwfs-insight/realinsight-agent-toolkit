# Cursor Install

Cursor can use the Realinsight plugin provider, a local stdio config, a hosted MCP URL when the installed Cursor version supports the needed transport and auth flow, or an `mcp-remote` stdio bridge.

## Cursor Plugin

Use one of the checked-in provider plugin paths:

```text
providers/cursor/plugin
providers/cursor/dev/plugin
providers/cursor/qa/plugin
```

Each plugin folder contains `.cursor-plugin/plugin.json`, `mcp.json`, and `skills/`.

## Local Stdio

Use one of the files under:

```text
examples/mcp/
```

For production:

```text
examples/mcp/mcp.prod.json
```

For a Realinsight-provided pilot or custom environment:

```text
examples/mcp/mcp.custom.json
```

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
