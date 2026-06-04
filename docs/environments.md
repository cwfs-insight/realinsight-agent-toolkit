# Environments

Public user-facing examples default to production:

| Environment | Default audience | Base URL |
| --- | --- | --- |
| production | Public and general users | `https://www.realinsight.cloud/api/v1` |
| qa | Internal testers and selected external pilots | `https://www.ri2-qa.com/api/v1` |
| development | Realinsight developers | `https://www.ri2-dev.com/api/v1` |
| custom pilot | Named pilot users | Realinsight-provided environment URL |

Local MCP installs can override the base URL with `RI_AGENT_BASE_URL` or `--base-url` on auth commands when Realinsight provides a non-production or pilot API base URL.
Release automation should pass `--environment` or `--base-url` instead of editing generated files by hand.

## Default Rule

The public repo marketplace must install production by default.

Do not add dev or QA plugin entries to `.agents/plugins/marketplace.json`. Those environments are opt-in, internal, or pilot surfaces. Keeping them out of the default marketplace avoids accidental non-production access for public users.

## Environment Isolation

Use a separate local auth profile per environment:

| Environment | Suggested profile | Suggested credential file |
| --- | --- | --- |
| production | `realinsight-prod` | default `~/.realinsight/agent-toolkit.json` |
| qa | `realinsight-qa` | `~/.realinsight/agent-toolkit-qa.json` |
| development | `realinsight-dev` | `~/.realinsight/agent-toolkit-dev.json` |
| custom pilot | `realinsight-custom` or pilot-specific name | pilot-specific credential file |

`RI_AGENT_PROFILE` selects the default profile for CLI and local MCP calls. `REALINSIGHT_AGENT_CONFIG` can isolate the credential file when the harness supports environment variables.

Example local login for QA:

```bash
RI_AGENT_PROFILE=realinsight-qa \
REALINSIGHT_AGENT_CONFIG="$HOME/.realinsight/agent-toolkit-qa.json" \
npx -y @realinsight/agent-toolkit@0.1.0 auth login \
  --base-url https://www.ri2-qa.com/api/v1
```

## Deployment Models

| Model | Production | QA | Development |
| --- | --- | --- | --- |
| Hosted Streamable HTTP MCP | Public default connector at the production MCP URL. | Optional QA connector for controlled testing only. | Usually not exposed publicly. |
| Local stdio MCP with npm | `npx -y @realinsight/agent-toolkit@<version> mcp`. | Prefer a published QA/prerelease package once QA promotion occurs. | Avoid unless testing a published prerelease. |
| Local stdio MCP from source | Useful for package verification. | Useful when validating a QA source snapshot. | Preferred developer path. |
| Codex plugin | Public marketplace exposes prod only. | Internal marketplace or local checkout entry only. | Local checkout entry only. |
| Claude plugin | Public marketplace exposes prod only. | Internal marketplace or local checkout entry only. | Local checkout entry only. |
| Claude Desktop MCPB | Pack prod for public users. | Pack an internal QA MCPB with QA defaults. | Pack a local dev MCPB from source with dev defaults. |

## Manifest Strategy

Use separate manifest identities when an environment should be visible as a separate install:

- `realinsight-connector` for production.
- `realinsight-connector-qa` for QA.
- `realinsight-connector-dev` for development.

Each variant should set:

- A distinct display name, such as `Realinsight Connector QA`.
- `RI_AGENT_BASE_URL` for the target API base URL.
- `RI_AGENT_PROFILE` for the target local auth profile.
- `REALINSIGHT_AGENT_CONFIG` when local credentials should be stored separately.

The production Codex and Claude marketplaces are the only default marketplaces in this repository. Internal Codex or Claude marketplaces can be generated or copied from templates later, but they should not replace `.agents/plugins/marketplace.json` or `.claude-plugin/marketplace.json`.

For Claude Desktop, pack from a manifest whose `name`, `display_name`, `base_url` default, and `profile_name` default match the target environment.

## Temporary Dev Bundles

A shell environment variable is enough for direct CLI or MCP examples, but it is not the best way to create an installable plugin or extension. Put environment defaults in the manifest or MCP config that the host installs.

Use the local packaging scripts to render repeatable environment bundles into an ignored destination folder:

```bash
npm run package:plugins:dev
npm run package:plugins:qa
```

These default to the bundled `node` runtime and package the Codex and Claude plugin bundles. Use `npx` only after `@realinsight/agent-toolkit` has been published:

```bash
npm run package:plugins:dev -- --npx
npm run package:plugins:qa -- --npx
```

To include Claude Desktop MCPB source bundles too, pass `--type all`:

```bash
npm run package:plugins:dev -- --type all
npm run package:plugins:qa -- --type all
```

The `node` runtime bundles the current local `ri-agent` source into each plugin and sets `cwd` so the MCP server starts from the installed plugin folder. The `npx` runtime writes MCP configs that use `npx -y @realinsight/agent-toolkit@<version> mcp`; packaging does not execute `npx`.

For direct local MCP testing:

```bash
RI_AGENT_BASE_URL=https://www.ri2-dev.com/api/v1 \
RI_AGENT_PROFILE=realinsight-dev \
REALINSIGHT_AGENT_CONFIG="$HOME/.realinsight/agent-toolkit-dev.json" \
node ./packages/agent-toolkit/src/ri-agent.mjs mcp
```

For a temporary Codex dev plugin:

1. Copy `plugins/codex/realinsight-connector/` to a temporary plugin folder such as `plugins/codex/realinsight-connector-dev/`.
2. In the copied `.codex-plugin/plugin.json`, change `name` to `realinsight-connector-dev` and update the display name to make the dev target obvious.
3. In the copied `.mcp.json`, set `RI_AGENT_BASE_URL`, `RI_AGENT_PROFILE=realinsight-dev`, and optionally `REALINSIGHT_AGENT_CONFIG`.
4. Add a temporary marketplace entry that points to the copied plugin folder.
5. Add that temporary marketplace root in Codex, then install `realinsight-connector-dev`.

Do not put the dev entry in this repository's default `.agents/plugins/marketplace.json`.

For a temporary Claude plugin:

1. Copy `plugins/claude/realinsight-connector/` to a temporary plugin folder such as `plugins/claude/realinsight-connector-dev/`.
2. In the copied `.claude-plugin/plugin.json`, change `name` to `realinsight-connector-dev`, update `displayName`, and keep `skills` plus `mcpServers` pointed at the copied plugin contents.
3. In the copied `.mcp.json`, set `RI_AGENT_BASE_URL`, `RI_AGENT_PROFILE=realinsight-dev`, and optionally `REALINSIGHT_AGENT_CONFIG`.
4. Add a temporary Claude marketplace entry that points to the copied plugin folder.
5. Add that temporary marketplace in Claude, then install `realinsight-connector-dev`.

Do not put the dev entry in this repository's default `.claude-plugin/marketplace.json`.

For a temporary Claude Desktop dev MCPB:

1. Copy `extensions/claude-desktop/realinsight-connector/` to a temporary folder.
2. In the copied `manifest.json`, change `name`, `display_name`, `user_config.base_url.default`, and `user_config.profile_name.default`.
3. Pack the temporary folder:

```bash
mcpb pack /path/to/temp/realinsight-connector-dev
```

4. Install the generated `.mcpb` in Claude Desktop.

Because the production Claude manifest exposes `base_url` and `profile_name` as user configuration, a short-lived internal test can also use the production MCPB and override those values in Claude Desktop's extension settings during install. Use a distinct dev-labeled manifest when you want dev and prod installed side by side.

## Examples

General MCP harness examples:

- Production npm: `examples/mcp/mcp.prod.json`
- Production source: `examples/mcp/mcp.prod-source.json`
- QA npm: `examples/mcp/mcp.qa.json`
- QA source: `examples/mcp/mcp.qa-source.json`
- Development source: `examples/mcp/mcp.dev-source.json`
- Custom/pilot npm: `examples/mcp/mcp.custom.json`
- Custom/pilot source: `examples/mcp/mcp.custom-source.json`

## Release Guardrails

- Never commit private dev or QA URLs into public default manifests.
- Keep Streamable HTTP MCP public docs pointed at production unless a specific QA connector is being tested.
- Make `auth_status` part of every environment-specific install guide so the user and model can confirm `profile`, `base_url`, customer, user, and scopes before reading data.
- When the Realinsight source repo publishes into this repo, it should update shared runtime code and skills, then render or validate environment-specific manifests without overwriting repo-owned docs and catalog defaults.
