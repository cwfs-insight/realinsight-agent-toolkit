# Realinsight Connector For Claude

This Claude plugin bundles the Realinsight skill and launches the `ri-agent` stdio MCP server through the published npm package.

## Install Shape

Add the marketplace from this repository, then install the connector:

```text
/plugin marketplace add cwfs-insight/realinsight-agent-toolkit
/plugin install realinsight-connector@realinsight
```

For local testing from this repository checkout:

```text
/plugin marketplace add .
/plugin install realinsight-connector@realinsight
```

The plugin-provided MCP server runs:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

By default it points to production Realinsight:

```text
https://www.realinsight.cloud/api/v1
```

The default local auth profile is `realinsight-prod`. For dev, QA, or pilot work, use a separate opt-in plugin or MCP config with an environment-specific `RI_AGENT_BASE_URL` and `RI_AGENT_PROFILE`.

## Skills

Claude discovers the bundled skill from `skills/` when the plugin is installed. The skill is namespaced by the plugin name, for example:

```text
/realinsight-connector:realinsight-agent-toolkit
```

## Auth

Use the bundled `connect_realinsight` MCP helper, or run:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 auth login \
  --base-url https://www.realinsight.cloud/api/v1 \
  --profile realinsight-prod
```

The local auth profile is stored outside the repository and uses the normal Realinsight browser login, SSO, and MFA flow.
