# Hosted Streamable HTTP MCP

The hosted MCP version is an HTTPS MCP protocol endpoint, not a hosted copy of the local CLI. Production uses the Realinsight-hosted MCP endpoint under the API base URL, currently `https://www.realinsight.cloud/api/v1/mcp`.

The endpoint is dual-era. MCP `2026-07-28` clients use stateless per-request protocol/client metadata and may call `server/discover` for versions, capabilities, server identity, and Realinsight instructions. Older clients through `2025-11-25` keep the initialization handshake. The local stdio package implements the same split, so existing hosts remain compatible while newer hosts can adopt the finalized protocol.

## Recommended Shape

- Host the Streamable HTTP MCP endpoint at `/api/v1/mcp` for the current Realinsight API deployment, or at the equivalent path for a Realinsight-provided environment.
- Reuse the same public tool contracts used by the CLI package.
- Validate OAuth bearer tokens on every HTTP request and hydrate the normal Realinsight user/customer context.
- Keep the endpoint stateless. Do not depend on server memory for customer, cursor, selected entities, or prior tool calls.
- Do not introduce `Mcp-Session-Id` or sticky protocol state. Modern MCP removed protocol-level sessions; legacy compatibility also remains request-scoped in Realinsight.
- Return Realinsight server instructions and tools from the MCP protocol adapter; modern discovery replaces `initialize` as the up-front instruction surface.
- Require modern HTTP metadata headers to match the request body, reject modern batches and cross-origin requests, and return the protocol-defined header/version errors.

## Auth Requirements

- Publish OAuth protected-resource metadata for the MCP endpoint.
- Return `WWW-Authenticate` challenges for unauthenticated or insufficient-scope requests.
- Use the environment's `/oauth/authorize` and `/oauth/token` routes for authorization-code with S256 PKCE where the MCP client supports native OAuth.
- Prefer a pre-registered client when available, then an HTTPS Client ID Metadata Document (CIMD), with `/oauth/register` DCR retained as a compatibility fallback when enabled. DCR clients should send the correct `application_type` (`native` for desktop/CLI/loopback, `web` for remote web callbacks).
- Include the MCP endpoint as the OAuth `resource` so tokens are audience-bound to the Realinsight MCP server.
- Require bearer tokens in the `Authorization` header on every MCP HTTP request.

## Deployment Options

The hosted adapter should delegate authorization, permissions, audit, and customer data access to approved Realinsight services.

This is the best business-user path because the harness can show a normal "Connect Realinsight" flow, launch browser login/SSO/MFA, store refresh credentials in the harness or server-side connector, and avoid terminal setup.
