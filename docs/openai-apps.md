# OpenAI Apps And Marketplace Path

This repository currently packages local and hosted MCP connector surfaces. A ChatGPT app is a related but separate product surface: an MCP server plus optional ChatGPT UI components that can be tested in developer mode and submitted for review.

## What Realinsight Would Build

The likely Realinsight app shape is:

- A hosted MCP server at a public HTTPS `/mcp` endpoint.
- OAuth for user authentication.
- Read-only tools first, using the same Realinsight API trust boundary as the hosted connector.
- Optional UI components only where visual review adds value, such as dashboards, record review, financial statement review, or workflow summaries.

If the app does not need a custom UI, start as a hosted connector. Add Apps SDK UI only for workflows where an iframe component materially improves the experience.

## Development Requirements

OpenAI's Apps SDK quickstart describes a ChatGPT app as:

1. A required MCP server that defines tools and exposes them to ChatGPT.
2. An optional web component rendered inside ChatGPT when the app needs UI.

For local development, run the MCP server on `/mcp`, test with MCP Inspector, then expose it through a public HTTPS tunnel before adding it to ChatGPT developer mode.

## Submission Requirements

Before public submission:

- Use a publicly accessible MCP server URL, not a local or test endpoint.
- Define a narrow widget Content Security Policy if the app has UI.
- Set a unique widget domain for app submission when registering UI resources.
- Complete OpenAI organization verification for the publishing name.
- Ensure the submitting project has the required app read/write permissions.
- Provide app metadata, company and privacy policy URLs, screenshots, tool information, localization information, and test prompts/responses.
- Provide working review credentials if authentication is required. Review credentials should not require MFA, SMS, email verification, or internal network access.

Projects with EU data residency currently cannot submit apps for review.

## Distribution Result

Private or workspace-only use should stay in ChatGPT developer mode. Submit only when the app should be publicly accessible in the countries selected during submission.

After approval and publication, OpenAI's current docs say the app can be listed in ChatGPT or as a plugin in a shared directory that users can browse in Codex, and publishing creates a plugin for Codex distribution.

## Realinsight Readiness Checklist

- Production hosted MCP endpoint is stable, streaming-capable, and observable.
- OAuth flow works for external reviewers with a demo account.
- Tool annotations and descriptions match actual behavior.
- Read-only tools are clearly separated from write/pipeline tools.
- Any UI widget uses exact CSP domains and no broad frame domains unless essential.
- Privacy policy discloses the Realinsight user/customer data types returned by the app.
- Golden prompts and expected outputs pass on ChatGPT web and mobile.
- QA/dev endpoints remain out of public submission metadata.
