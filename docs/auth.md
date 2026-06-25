# Auth

Realinsight agent auth has two intended modes.

## Hosted MCP

Hosted Streamable HTTP MCP should use OAuth authorization-code with S256 PKCE. The agent harness owns the connector session, and Realinsight validates bearer tokens on every MCP request.

Use this for nontechnical users when the harness supports hosted connectors.

## Local Stdio MCP

Local stdio MCP uses the `ri-agent` CLI profile store:

```bash
npm run ri-agent -- auth login --base-url https://www.realinsight.cloud/api/v1
```

The local MCP server also exposes helper tools:

- `auth_status`
- `connect_realinsight`
- `disconnect_realinsight`
- `request_realinsight_scopes`

Local profiles are stored outside this repository. Never commit local credential files, tokens, or `.realinsight/` directories.
