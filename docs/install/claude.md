# Claude Install

Use one of three paths.

## Claude Desktop Remote Connector (primary)

Use this as the default business-user path.

- MCP endpoint: production `https://www.realinsight.cloud/api/v1/mcp`, QA `https://www.ri2-qa.com/api/v1/mcp`, or development `https://www.ri2-dev.com/api/v1/mcp`.
- Auth: OAuth authorization-code with S256 PKCE.
- Skills/instructions: provide the Realinsight skill as connector guidance where Claude supports it.

In Claude Desktop, add a custom remote MCP connector with the selected endpoint and complete the Realinsight OAuth prompt.

## Anthropic Connectors Directory

Public Claude distribution should submit the production remote MCP server to Anthropic's Connectors Directory. This is separate from the repository's Claude Code plugin marketplace and local MCPB package.

Before submission, verify the production HTTPS endpoint from Claude.ai, Claude Desktop, and Claude Code; complete OAuth authorization-code login with Claude's HTTPS callbacks; confirm every tool's read-only/destructive annotations; and prepare a dedicated review account with sample data. The public listing also needs complete setup/auth documentation, at least three working prompt examples, a privacy policy, and a dedicated support channel.

Directory review and approval are external release gates. Users can still add the URL as a custom remote connector before a public listing is approved.

## Claude Code CLI

Use this for Claude Code or Claude surfaces that support plugin marketplaces. It installs the Realinsight skill and a hosted Streamable HTTP MCP configuration together.

Add the marketplace from this public repository:

```text
/plugin marketplace add cwfs-insight/realinsight-agent-toolkit
```

Then install the production connector:

```text
/plugin install realinsight-connector@realinsight
```

For an explicit non-production environment, install the corresponding root marketplace entry:

```text
/plugin install realinsight-connector-qa@realinsight
/plugin install realinsight-connector-dev@realinsight
```

For local testing from a checkout of this repository:

```text
/plugin marketplace add .
/plugin install realinsight-connector@realinsight
```

The bundled plugin lives at `plugins/claude/realinsight-connector/`. Its MCP config points to the production hosted MCP endpoint by default.

## Claude Desktop Local Extension

Use this for local stdio MCP installs:

```bash
mcpb pack ./extensions/claude-desktop/realinsight-connector
```

Install the generated `.mcpb` in Claude Desktop. The extension includes the local MCP runtime and uses the `connect_realinsight` browser login helper.

The default MCPB manifest points to production and uses the `realinsight-prod` auth profile. For QA or development, pack a variant manifest with a distinct extension name, `base_url` default, and `profile_name` default. See [../environments.md](../environments.md).

The local extension and direct stdio paths run checked-in Node source. The native toolkit package is not yet available through npm/npx.
