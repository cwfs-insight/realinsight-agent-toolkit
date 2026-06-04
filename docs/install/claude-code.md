# Claude Code Install

Claude Code should use the Realinsight Claude plugin when plugin marketplaces are available. Fall back to a direct MCP config when plugin installation is not available in the target environment.

## Claude Plugin

Add the marketplace from this public repository:

```text
/plugin marketplace add cwfs-insight/realinsight-agent-toolkit
```

Install the production connector:

```text
/plugin install realinsight-connector@realinsight
```

The plugin bundles:

- `skills/realinsight-agent-toolkit/`
- A plugin-root `.mcp.json` that starts the local Realinsight MCP server.

The installed skill is namespaced by the plugin name:

```text
/realinsight-connector:realinsight-agent-toolkit
```

## Local Stdio

Use this fallback when plugin installation is unavailable. Configure Claude Code to run:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

with:

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
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
