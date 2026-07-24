# Auth

Realinsight agent auth has two intended modes.

## Hosted MCP

Hosted Streamable HTTP MCP should use OAuth authorization-code with S256 PKCE. The agent harness owns the connector session, and Realinsight validates bearer tokens on every MCP request.

Use this for nontechnical users when the harness supports hosted connectors.

### Expected user flow

1. Add the Realinsight hosted MCP URL in the harness and keep OAuth enabled.
2. Complete the browser-based Realinsight login, including SSO or MFA when required.
3. Confirm the intended customer and requested access.
4. Return to the harness and verify the connector with a small `get_tool_reference` or schema request.

The harness owns the remote connector session. Remote credentials are not written to the local `ri-agent` profile store. The hosted MCP endpoint requires an audience-bound bearer token on every request, then applies the signed-in user's Realinsight customer context, permissions, modules, assignments, and scopes.

If authorization expires or is revoked, reconnect Realinsight in the harness. Hosted MCP exposes `disconnect` for explicit grant revocation; the user may still need to reconnect the connector in the host afterward.

See [Hosted Streamable HTTP MCP](http-streamable-mcp.md) for protected-resource metadata, PKCE, token audience, and bearer challenge requirements.

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
