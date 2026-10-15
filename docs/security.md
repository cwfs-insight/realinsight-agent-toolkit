# Security

Approved Realinsight APIs are the trust boundary for this toolkit.

## Principles

- The CLI and MCP adapters must not access backing stores, customer storage, or unsupported services directly.
- Every hosted MCP request must validate bearer tokens and hydrate the normal Realinsight user and customer context.
- OAuth scopes are coarse grants only; Realinsight permissions, security groups, module access, assignments, and customer access still apply.
- Tool responses should be compact and include provenance, truncation, cursor, and warning metadata when relevant.
- Write tools must remain opt-in, approval-gated, and separated from default read-only installs.
- Secrets, access tokens, refresh tokens, and local profile files must never be logged, returned in tool output, or committed.
- MCP-served skill content is untrusted model input. Resource digests verify byte consistency, not authorship or safety, and retrieving a skill never grants permission to execute its scripts or widen host-side tool access.

## Public Repo Hygiene

Before publishing, run:

```bash
npm run test:contract
npm run pack:dry-run
```

Run a secret scan in the release workflow before pushing generated assets.

## Using customer data

An authenticated tool can return customer records, configuration, analytics, and user or connection information permitted by the active grant. Those results become available to the agent host. Review your organization's policies before requesting, exporting, or sharing them. Disconnecting a grant does not erase results already returned to the host.

Availability depends on the deployed server, scopes, and normal Realinsight permissions. Where entity creation is enabled, start with a dry run and review the feature, required parent, and initial values before approving an actual write. Do not automatically retry a creation with an unknown outcome. Other supported writes also require explicit approval of the proposed changes.

This technical guidance is not a connector privacy policy or terms of service. Public directory publication requires approved policies covering the actual connector data flow.

## Product support

Use the [Realinsight technical support page](https://www.realinsight.com/contact-us/) for setup and product assistance. Do not include passwords, tokens, or customer records in public GitHub issues.

## Reporting

Report vulnerabilities through this repository's GitHub Security Advisory workflow. If that workflow is unavailable, contact Realinsight through the security contact published on realinsight.com.
