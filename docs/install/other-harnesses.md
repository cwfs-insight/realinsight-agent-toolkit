# Other Agent Harnesses

Use this path for Pi, OpenClaw, and other agent harnesses when their install model is not documented separately.

## If The Harness Supports MCP

Prefer remote Streamable HTTP MCP:

```text
Production: https://www.realinsight.cloud/api/v1/mcp
QA: https://www.ri2-qa.com/api/v1/mcp
Development: https://www.ri2-dev.com/api/v1/mcp
```

Use the selected endpoint with the harness's authenticated remote MCP configuration. If the harness cannot complete remote MCP OAuth, use local Node stdio MCP from a clone.

Local stdio command from this repo:

```bash
node /path/to/ri-agent-toolkit/packages/agent-toolkit/src/ri-agent.mjs mcp
```

Set `RI_AGENT_BASE_URL` and an isolated `RI_AGENT_PROFILE` for the selected environment. For production:

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
RI_AGENT_PROFILE=realinsight-prod
```

The native toolkit package is not yet available through npm/npx.

## If The Harness Supports Instructions But Not Skills

Add a short instruction that tells the agent to use the Realinsight skill guidance from:

```text
skills/realinsight-agent-toolkit/SKILL.md
```

## If The Harness Does Not Support MCP

Use the direct CLI as a fallback:

```bash
npm run ri-agent -- doctor --json
npm run ri-agent -- search-features loan
```

Do not build a one-off integration that bypasses approved Realinsight APIs or the normal Realinsight auth flow.
