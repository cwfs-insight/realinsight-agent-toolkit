# Hosted Streamable HTTP MCP

The hosted MCP version is an HTTPS MCP protocol endpoint, not a hosted copy of the local CLI. Local testing can use a local `/mcp` endpoint; production should use a Realinsight-hosted `/mcp` endpoint.

## Recommended Shape

- Host the Streamable HTTP MCP endpoint at `/mcp`.
- Reuse the same public tool contracts used by the CLI package.
- Validate OAuth bearer tokens on every HTTP request and hydrate the normal Realinsight user/customer context.
- Keep the endpoint stateless. Do not depend on server memory for customer, cursor, selected entities, or prior tool calls.
- Use `Mcp-Session-Id` only for future protocol compatibility if a client expects it; the server should still be horizontally scalable without sticky state.
- Return Realinsight server instructions, tools, and later resources/prompts from the MCP protocol adapter.

## Auth Requirements

- Publish OAuth protected-resource metadata for the MCP endpoint.
- Return `WWW-Authenticate` challenges for unauthenticated or insufficient-scope requests.
- Use the environment's `/oauth/authorize` and `/oauth/token` routes for authorization-code with S256 PKCE where the MCP client supports native OAuth.
- Use `/oauth/register` for dynamic public-client registration when self-service onboarding is enabled. Environments can disable dynamic registration and preconfigure clients instead.
- Include the MCP endpoint as the OAuth `resource` so tokens are audience-bound to the Realinsight MCP server.
- Require bearer tokens in the `Authorization` header on every MCP HTTP request.

## Deployment Options

The hosted adapter should delegate authorization, permissions, audit, and customer data access to approved Realinsight services.

This is the best business-user path because the harness can show a normal "Connect Realinsight" flow, launch browser login/SSO/MFA, store refresh credentials in the harness or server-side connector, and avoid terminal setup.
