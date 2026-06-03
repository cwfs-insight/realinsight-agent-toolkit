# Environments

Public user-facing examples default to production:

| Environment | Base URL |
| --- | --- |
| production | `https://www.realinsight.cloud/api/v1` |
| custom pilot | Realinsight-provided environment URL |

Local MCP installs can override the base URL with `RI_AGENT_BASE_URL` or `--base-url` on auth commands when Realinsight provides a non-production or pilot API base URL.
Release automation should pass `--environment` or `--base-url` instead of editing generated files by hand.
