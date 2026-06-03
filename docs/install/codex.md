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

If you are testing a local checkout instead of GitHub, add the repository root:

```bash
codex plugin marketplace add /Users/cshelton/Projects/ri-agent-toolkit
```

Do not point Codex directly at `plugins/codex/realinsight-connector` or `catalogs/codex`. Codex expects a marketplace root, and this repository exposes that at `.agents/plugins/marketplace.json`.

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
npx -y @realinsight/agent-toolkit@0.1.0 auth login --base-url https://www.realinsight.cloud/api/v1
```
