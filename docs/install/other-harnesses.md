# Other Agent Harnesses

Use this path for Pi, OpenClaw, and other agent harnesses when their install model is not yet documented here.

## If The Harness Supports MCP

Prefer hosted Streamable HTTP MCP for business users. Use local stdio MCP for developer and pilot installs.

Local stdio command from this repo:

```bash
node /path/to/ri-agent-toolkit/packages/agent-toolkit/src/ri-agent.mjs mcp
```

Production environment:

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
```

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
