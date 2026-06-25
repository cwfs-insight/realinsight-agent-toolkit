# ChatGPT Install

The preferred ChatGPT path is a hosted Realinsight Connector backed by the Realinsight Streamable HTTP MCP endpoint.

## Target Shape

- MCP endpoint: `https://www.realinsight.cloud/api/v1/mcp` or a dedicated agent gateway URL.
- Auth: OAuth authorization-code with S256 PKCE.
- Data access: approved Realinsight APIs remain the trust boundary.
- Tool behavior: stateless requests with explicit entity ids, cursors, page ids, or report ids.

## Local Package Is Not The Business-User Path

The `@realinsight/agent-toolkit` package is still useful for local pilots, but ChatGPT users should not need to install Node, run `npx`, or manage local auth files.

Future official hosted connector work should be tracked outside the local package install guides. The generated packages in this repo are not marketplace submissions.
