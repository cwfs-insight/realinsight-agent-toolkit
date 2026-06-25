# Realinsight Connector For Codex

This Codex plugin bundles the Realinsight skill and connects to the hosted Realinsight Streamable HTTP MCP server.

## Install Shape

The bundled MCP config points to:

```text
https://www.realinsight.cloud/api/v1/mcp
```

By default it points to production Realinsight:

```text
https://www.realinsight.cloud/api/v1
```

For dev or QA work, use the checked-in provider marketplaces under `providers/codex/dev` or `providers/codex/qa`. For pilot work, use a generated local package or MCP config with an environment-specific URL and clear display name.

## Auth

Authentication is handled by the host's MCP OAuth flow and uses the normal Realinsight browser login, SSO, and MFA flow.
