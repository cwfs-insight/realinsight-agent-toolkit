# GitHub Copilot In VS Code Install

GitHub Copilot in VS Code can use Realinsight through MCP server configuration.

## Remote HTTP MCP

Prefer the selected hosted endpoint so authentication stays in the connector flow:

```text
Production: https://www.realinsight.cloud/api/v1/mcp
QA: https://www.ri2-qa.com/api/v1/mcp
Development: https://www.ri2-dev.com/api/v1/mcp
```

## Local Node Stdio

Use a source-based example from a clone:

```text
examples/mcp/mcp.prod-source.json
examples/mcp/mcp.qa-source.json
examples/mcp/mcp.dev-source.json
```

For a Realinsight-provided pilot or custom environment, use:

```text
examples/mcp/mcp.custom.json
```

The source-based stdio server launches:

```bash
node /path/to/ri-agent-toolkit/packages/agent-toolkit/src/ri-agent.mjs mcp
```

## Instruction Pairing

Copilot does not consume Codex skills directly. Pair the MCP config with a short repository instruction that points to:

```text
skills/realinsight-agent-toolkit/SKILL.md
```
