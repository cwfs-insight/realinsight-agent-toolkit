# Local Node Auth UX

The local Node path is available for developers, pilots, and harnesses that only support stdio MCP. Run the checked-in source from a clone of this repository; the native toolkit package is not published to npm yet.

## Baseline Flow

```bash
npm run ri-agent -- auth login --base-url https://www.realinsight.cloud/api/v1
npm run ri-agent -- auth status
npm run ri-agent -- doctor --json
```

`auth login` should open a browser when possible, display the user code as a fallback, and use the normal Realinsight login/SSO/MFA flow. The CLI stores profiles locally in `~/.realinsight/agent-toolkit.json` unless `REALINSIGHT_AGENT_CONFIG` is set.
Use `RI_AGENT_PROFILE` to choose the default profile for a local MCP process, such as `realinsight-prod`, `realinsight-qa`, or `realinsight-dev`.

## Agent-Friendly Auth Tools

For stdio MCP, the CLI owns credentials because the MCP client is only launching a local process. To make this approachable for non-terminal users, the local MCP server exposes these helper tools:

- `auth_status`: reports whether a usable profile exists, its customer, user, scopes, and expiry.
- `connect_realinsight`: starts the browser/device login flow, stores a pending authorization, and polls every 5 seconds for up to 5 minutes by default.
- `disconnect_realinsight`: revokes/logs out a local profile.
- `request_realinsight_scopes`: reopens consent when a tool needs new scopes.

`auth_status` also completes a pending authorization after the user approves the browser login, including after the helper polling timeout. Tool calls that need auth should return clear `auth_required`, `reauthorization_required`, or `insufficient_scope` guidance instead of failing opaquely. Scope upgrades should use friendly access levels where possible, such as read-only analytics or approved write tools, rather than expecting a business user to type raw scope strings.

Hosted Streamable HTTP MCP should eventually supersede this for business users because native connector auth can happen inside the agent harness install/connect flow.
