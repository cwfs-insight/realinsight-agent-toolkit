# Cursor Install

Cursor can use the Realinsight MCP server through a local stdio config or a hosted MCP URL.

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

## Skill Guidance

When Cursor cannot import the skill directly, add a short project rule or instruction telling the agent to read:

```text
skills/realinsight-agent-toolkit/SKILL.md
```

and the relevant files under:

```text
skills/realinsight-agent-toolkit/references/
```
