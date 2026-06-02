# Claude Code Install

Claude Code should use the Realinsight MCP server through the MCP configuration path it supports in the target environment.

## Local Stdio

Use:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

with:

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud
```

Use the files under `examples/mcp/` as the source for command, args, and environment settings.

## Skill Guidance

When Claude Code cannot import this skill directly, include a short instruction to read:

```text
skills/realinsight-agent-toolkit/SKILL.md
```

and the relevant files under:

```text
skills/realinsight-agent-toolkit/references/
```
