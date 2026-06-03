# Codex Catalog

This folder contains a reference copy of the Codex marketplace metadata for the Realinsight Connector.

The canonical repo marketplace file is:

```text
.agents/plugins/marketplace.json
```

Use the repository root as the marketplace source. Do not add this `catalogs/codex` folder as the marketplace root, because Codex resolves plugin paths relative to the marketplace root.

Keep the plugin path pointed at:

```text
./plugins/codex/realinsight-connector
```
