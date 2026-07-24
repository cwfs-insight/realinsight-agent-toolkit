# ChatGPT Install

The supported repository-backed ChatGPT path is a remote Realinsight MCP connector. Local Node stdio MCP is not documented for ChatGPT.

## Environment endpoints

| Environment | MCP endpoint |
| --- | --- |
| Production (default) | `https://www.realinsight.cloud/api/v1/mcp` |
| QA | `https://www.ri2-qa.com/api/v1/mcp` |
| Development | `https://www.ri2-dev.com/api/v1/mcp` |

In the ChatGPT workspace connector settings, add a custom MCP connector with the selected endpoint. Keep OAuth enabled and complete the normal Realinsight browser sign-in. Realinsight APIs remain the permission and customer-data trust boundary.

Verify the connection with a small `get_tool_reference` or schema request.

## No local package path

Do not use an unpublished native toolkit package command. When local Node stdio MCP is required, use a harness that can launch a local process from a clone of this repository.
