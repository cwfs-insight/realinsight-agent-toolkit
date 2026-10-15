# ChatGPT Install

The supported repository-backed ChatGPT path is a remote Realinsight MCP connector. Local Node stdio MCP is not documented for ChatGPT.

## Environment endpoints

| Environment | MCP endpoint |
| --- | --- |
| Production (default) | `https://www.realinsight.cloud/api/v1/mcp` |
| QA | `https://www.ri2-qa.com/api/v1/mcp` |
| Development | `https://www.ri2-dev.com/api/v1/mcp` |

In the ChatGPT workspace connector settings, add a custom MCP connector with the selected endpoint. Keep OAuth enabled and complete the normal Realinsight browser sign-in. Realinsight APIs remain the permission and customer-data trust boundary.

Verify the connection with connection context where available: check the customer, server URL, user, and granted access. A small `get_tool_reference` or schema request can also confirm basic access. Custom MCP availability and menu labels depend on your workspace and client.

The server URL identifies the deployment. Hosted installations have fixed endpoints; keep production and approved QA testing in separate connections. To change customers, disconnect and reconnect through ChatGPT and choose the intended customer during Realinsight sign-in. See [authentication](../auth.md) for revocation and local-profile differences.

## Published app path

Official OpenAI directory publication has not occurred. Use a custom MCP connection while review is pending.

Publishing uses the [OpenAI plugin submission flow](https://developers.openai.com/plugins/deploy/submission). Upload a ZIP containing root `plugin.json`, `mcp.json`, bundled `skills/`, and referenced assets. Use **With MCP** with the production universal server. Complete OAuth, domain verification, automated scans, review information, and policy attestations. Approval and the final publish action are separate steps.

Listing and five positive/three negative review cases import from `extensions.com.openai` in `plugin.json`. `chatgpt-app-submission.json` is a legacy annotation and case worksheet, not the current portal import format. Reviewer sign-in instructions and credentials belong only in the secure portal, outside Git and the ZIP. See [release process](../release-process.md#openai-plugin-submission) for package preparation and remaining gates.

## No local package path

Do not use an unpublished native toolkit package command. When local Node stdio MCP is required, use a harness that can launch a local process from a clone of this repository.
