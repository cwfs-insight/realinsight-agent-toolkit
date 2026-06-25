# GitHub Copilot In VS Code Install

GitHub Copilot in VS Code can use Realinsight through MCP server configuration.

## Local Stdio

Use the production example as a starting point:

```text
examples/mcp/mcp.prod.json
```

For a Realinsight-provided pilot or custom environment, use:

```text
examples/mcp/mcp.custom.json
```

The source-based stdio server launches:

```bash
node /path/to/ri-agent-toolkit/packages/agent-toolkit/src/ri-agent.mjs mcp
```

## Hosted MCP

When the hosted Realinsight MCP endpoint is available, prefer it for business users so authentication can stay in the connector flow instead of a local CLI profile.

## Instruction Pairing

Copilot does not consume Codex skills directly. Pair the MCP config with a short repository instruction that points to:

```text
skills/realinsight-agent-toolkit/SKILL.md
```
