# Realinsight Connector For Claude

This Claude plugin bundles the Realinsight skill and connects to the hosted Realinsight Streamable HTTP MCP server.

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

The plugin-provided MCP server points to:

```text
https://www.realinsight.cloud/api/v1/mcp
```

By default it points to production Realinsight:

```text
https://www.realinsight.cloud/api/v1
```

For dev, QA, or pilot work, use a separate generated package or MCP config with an environment-specific URL and clear display name.

## Skills

Claude discovers the bundled skill from `skills/` when the plugin is installed. The skill is namespaced by the plugin name, for example:

```text
/realinsight-connector:realinsight-agent-toolkit
```

## Auth

Authentication is handled by the host's MCP OAuth flow and uses the normal Realinsight browser login, SSO, and MFA flow.
