# Auth

Realinsight agent auth has two intended modes.

## Hosted MCP

Hosted Streamable HTTP MCP should use OAuth authorization-code with S256 PKCE. The agent harness owns the connector session, and Realinsight validates bearer tokens on every MCP request.

Use this for nontechnical users when the harness supports hosted connectors.

### Expected user flow

1. Add the Realinsight hosted MCP URL in the harness and keep OAuth enabled.
2. Complete the browser-based Realinsight login, including SSO or MFA when required.
3. Confirm the intended customer and requested access.
4. Return to the harness and ask for connection context where available. Confirm the customer, server URL, user, and granted scopes before using customer data. A small `get_tool_reference` or schema request can also verify basic access.

The harness owns the remote connector session. Remote credentials are not written to the local `ri-agent` profile store. The hosted MCP endpoint requires an audience-bound bearer token on every request, then applies the signed-in user's Realinsight customer context, permissions, modules, assignments, and scopes.

Realinsight rotates public-client refresh tokens. A host must atomically persist the replacement returned by every successful refresh; replaying an older refresh token revokes that token family. Extending token lifetime is not a substitute for correct host persistence.

If authorization expires or is revoked, reconnect Realinsight in the harness. Hosted MCP exposes `disconnect` for explicit grant revocation; the user may still need to reconnect the connector in the host afterward. Realinsight also provides `/oauth/connections` as a small browser Connection Manager for reviewing and disconnecting the signed-in user's grants in the current customer and signing in to another customer.

See [Hosted Streamable HTTP MCP](http-streamable-mcp.md) for protected-resource metadata, PKCE, token audience, and bearer challenge requirements.

### Customer and server changes

The server URL identifies the deployment: production, QA, or development. Hosted plugin installations have fixed endpoints; use separate production and QA installations when testing across deployments. The connection card does not offer an arbitrary server URL editor.

Customer switching is a separate authorization step. Disconnect and reconnect through the host, then select the intended customer during Realinsight sign-in. Signing into a different customer in another browser tab does not retarget an existing token. Entity and record writes use the authenticated customer and do not accept a customer selector.

After a customer change, verify connection context again. Disconnecting revokes access; it does not remove data already returned to a host conversation or saved by the user. Host-side removal and Realinsight grant revocation are separate actions.

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

For another server, authorize a separate named profile with its `base_url`, then switch to that saved profile. Keep `RI_AGENT_BASE_URL`, `RI_AGENT_PROFILE`, and `REALINSIGHT_AGENT_CONFIG` aligned with that server; each server needs its own authentication. See [environment guidance](environments.md).
