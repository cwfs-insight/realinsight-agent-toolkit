# Codex Install

Codex should use the Realinsight Connector plugin when possible.

## Codex Desktop (primary)

In Codex Desktop's GitHub marketplace form, use:

```text
Repository: https://github.com/cwfs-insight/realinsight-agent-toolkit
Reference: main
Sparse paths: leave empty
```

Then open the plugin browser and install the connector for the selected environment:

```text
Production: realinsight-connector
QA: realinsight-connector-qa
Development: realinsight-connector-dev
```

Use the repository root. `Sparse paths` filters the checkout; it does not make a subdirectory the marketplace root.

## Codex CLI

Add the repository marketplace, start Codex, and open the plugin browser:

```bash
codex plugin marketplace add cwfs-insight/realinsight-agent-toolkit --ref main
codex
/plugins
```

Choose the same environment-specific connector name listed above. The checked-in root marketplace defaults to production.

The rendered provider folders are kept in the repo for validation, local folder installs, and host layouts that can use a subdirectory as the actual marketplace root:

```text
providers/codex/prod
providers/codex/dev
providers/codex/qa
```

If you are testing a local checkout instead of GitHub, add the repository root:

```bash
codex plugin marketplace add /path/to/ri-agent-toolkit
```

Do not point Codex directly at `plugins/codex/realinsight-connector`. Codex expects a marketplace root, and this repository exposes that at `.agents/plugins/marketplace.json`.

## Environments

The default Codex plugin is production:

```text
RI_AGENT_BASE_URL=https://www.realinsight.cloud/api/v1
RI_AGENT_PROFILE=realinsight-prod
```

Dev and QA are available in the root GitHub marketplace as clearly named entries and are also rendered as checked-in provider marketplaces under `providers/codex/dev` and `providers/codex/qa`. Use [../environments.md](../environments.md) for the environment matrix and release guardrails.

For non-production testing in Codex Desktop, prefer adding the repository root and installing:

- Dev: `realinsight-connector-dev`.
- QA: `realinsight-connector-qa`.
- Prod: `realinsight-connector`.

## Plugin

The plugin source lives at:

```text
plugins/codex/realinsight-connector
```

The plugin bundles:

- Realinsight skill instructions.
- MCP server config for the selected runtime.
- User-facing metadata for the Codex plugin directory.

## Marketplace

Codex marketplace metadata is stored at:

```text
.agents/plugins/marketplace.json
```

## MCP Runtime

The checked-in production Codex plugin points at the hosted production Streamable HTTP MCP endpoint:

```text
https://www.realinsight.cloud/api/v1/mcp
```

Provider marketplaces under `providers/codex/*` point Codex at hosted MCP URLs. Local generated `.tmp/dist/*/node/codex/` packages can include bundled Node source when explicitly built for local testing. Native `npx @realinsight/agent-toolkit` packages should not be used until npm publication exists.

For local stdio auth testing, run:

```bash
npm run ri-agent -- auth login \
  --base-url https://www.realinsight.cloud/api/v1 \
  --profile realinsight-prod
```

The plugin sets `RI_AGENT_PROFILE=realinsight-prod`, so `connect_realinsight` stores the browser login in the production profile by default.
