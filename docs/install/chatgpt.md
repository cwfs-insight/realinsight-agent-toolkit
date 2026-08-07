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

## Published app path

Publishing uses the OpenAI Platform plugin submission portal. Create a **With MCP** submission, enter the production Realinsight MCP URL as a universal server, configure OAuth and reviewer credentials, verify the MCP domain, scan the tools, and upload the bundled Realinsight skill. The same submission can contain the MCP server and skill; custom UI is optional.

The bundled Realinsight skill remains useful in Codex, Claude, and other skill-aware distributions. OpenAI can also import a static skill snapshot from an MCP server through its supported subset of the draft Skills extension, but direct upload is the stable packaging path until we intentionally add that extension.

Use `chatgpt-app-submission.json` as the review-form import artifact. Before submission, supply public website, support, privacy, and terms URLs; a verified publisher identity; domain-verification token; reviewer credentials that do not require MFA; and a final review of every tool annotation and response shape.

## No local package path

Do not use an unpublished native toolkit package command. When local Node stdio MCP is required, use a harness that can launch a local process from a clone of this repository.
