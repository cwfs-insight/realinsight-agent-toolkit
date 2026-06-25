# Security

Approved Realinsight APIs are the trust boundary for this toolkit.

## Principles

- The CLI and MCP adapters must not access backing stores, customer storage, or unsupported services directly.
- Every hosted MCP request must validate bearer tokens and hydrate the normal Realinsight user and customer context.
- OAuth scopes are coarse grants only; Realinsight permissions, security groups, module access, assignments, and customer access still apply.
- Tool responses should be compact and include provenance, truncation, cursor, and warning metadata when relevant.
- Write tools must remain opt-in, approval-gated, and separated from default read-only installs.
- Secrets, access tokens, refresh tokens, and local profile files must never be logged, returned in tool output, or committed.

## Public Repo Hygiene

Before publishing, run:

```bash
npm run test:contract
npm run pack:dry-run
```

Run a secret scan in the release workflow before pushing generated assets.

## Reporting

Report vulnerabilities through this repository's GitHub Security Advisory workflow. If that workflow is unavailable, contact Realinsight through the security contact published on realinsight.com.
