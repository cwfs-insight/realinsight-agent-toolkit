# Codex Install

Codex should use the Realinsight Connector plugin when possible.

## Install From GitHub

Add the repository marketplace, then install the plugin from Codex's plugin browser:

```bash
codex plugin marketplace add cwfs-insight/realinsight-agent-toolkit --ref main
codex
/plugins
```

In the plugin browser, choose the Realinsight marketplace and install `realinsight-connector`.
This public marketplace exposes production only.

If you are testing a local checkout instead of GitHub, add the repository root:

```bash
codex plugin marketplace add /path/to/ri-agent-toolkit
```

Do not point Codex directly at `plugins/codex/realinsight-connector` or `catalogs/codex`. Codex expects a marketplace root, and this repository exposes that at `.agents/plugins/marketplace.json`.

## Environments

The default Codex plugin is production:

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
RI_AGENT_PROFILE=realinsight-prod
```

Dev and QA should be separate opt-in plugin entries or local MCP configs, not entries in the public marketplace. Use [../environments.md](../environments.md) for the environment matrix and release guardrails.

For internal testing, prefer:

- Dev: local source command with `RI_AGENT_PROFILE=realinsight-dev`.
- QA: npm package or local source command with `RI_AGENT_PROFILE=realinsight-qa`.
- Prod: the public plugin, npm package, or hosted Streamable HTTP MCP connector.

## Plugin

The plugin source lives at:

```text
plugins/codex/realinsight-connector
```

The plugin bundles:

- Realinsight skill instructions.
- Stdio MCP server config for the published toolkit package.
- User-facing metadata for the Codex plugin directory.

## Marketplace Catalog

Codex marketplace metadata is stored at:

```text
.agents/plugins/marketplace.json
```

The legacy reference copy under `catalogs/codex/marketplace.json` should stay in sync, but the repo marketplace path above is the install surface.

Keep the marketplace entry pointed at:

```text
./plugins/codex/realinsight-connector
```

## MCP Auth

The plugin launches:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 mcp
```

Use the `connect_realinsight` helper tool or run:

```bash
npx -y @realinsight/agent-toolkit@0.1.0 auth login \
  --base-url https://www.realinsight.cloud/api/v1 \
  --profile realinsight-prod
```

The plugin sets `RI_AGENT_PROFILE=realinsight-prod`, so `connect_realinsight` stores the browser login in the production profile by default.
