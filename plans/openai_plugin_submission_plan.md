# Realinsight official OpenAI plugin submission plan

Created: 2026-10-15
Status: local audit and review package prepared; external release gates open; not submitted

## Outcome and scope

Prepare Realinsight's public connector package, listing metadata, official brand assets, product/install website, and reviewer materials for official OpenAI publication. Start with the current exported toolkit rather than rebuilding the connector. Prepare a concrete, reviewable submission package and identify the remaining publisher, legal, production deployment, and portal actions.

Do not broaden this into new document search, a documentation-ingestion pipeline, an entity-system redesign, or additional host certifications. Claude/Cursor/Copilot distributions must remain valid, but OpenAI is the priority.

## Verified starting point

- Public repository: https://github.com/cwfs-insight/realinsight-agent-toolkit
- Published release source: toolkit 0.2.4, commit `febbe71d0d3f3c8a418ea2be3770fea9cef33722` on `main`.
- Website: https://cwfs-insight.github.io/realinsight-agent-toolkit/ ; the documentation build and deployment succeeded for that commit.
- Public package/provider validators, existing contract smoke, documentation build, distribution validation, and npm pack dry run passed. Contract smoke advertised 59 local tools; submission metadata describes 54 hosted tools. Native MCPB bundles were also built.
- A deployed development connection and `create_entity` dry run with an initial integer field succeeded. No entity was actually created. These checks do not establish production or official ChatGPT review readiness.
- Codex Dev plugin 0.2.4 was installed, its dev authorization was renewed, and the user confirmed the plugin is visible. The temporary local test registration was removed.
- No npm registry publication or official OpenAI listing approval has occurred.

Recheck checkout state and current official documentation before acting; these are dated observations, not permanent guarantees.

## Decisions to preserve

- Use actual Realinsight branding. The approved connection card embeds official header SVG paths with theme-aware text color; do not replace this with a generic building icon or newly invented logo.
- Current brand sources: `docs/assets/brand/realinsight-logo-primary.svg`, `realinsight-logo-white.svg`, `realinsight-agent-favicon.svg`, and `realinsight-agent-icon-180.png`. The OpenAI primary/composer icon currently uses the 180px PNG. Inspect it visually and verify current submission dimensions, formats, transparency, contrast, and any dark variants rather than assuming it is submission-ready.
- The corporate website is https://www.realinsight.com . The connector install site is the GitHub Pages URL above. Choose the listing's product website deliberately and keep both roles clear.
- Production is the default for checked-in public manifests. Dev/QA remain isolated, labeled distributions. Do not publish a dev endpoint as the official production connector. Deployment identity is the server URL, never the runtime environment. Most external users need only production; external QA testers can use the separate QA plugin. The local toolkit can authorize a separate named profile with an explicit `base_url`, and switch among saved profiles; a URL change requires authentication for that server. The current card does not offer an arbitrary URL-edit control. Do not introduce one as incidental listing work.
- Customer identity comes from the authenticated connection. Do not add customer selectors or `expected_customer_code` to entity/service write calls. Customer switching is a reconnect/authorization flow; changing a browser login does not retarget a token.
- `create_entity` validates and creates initial fields in one tool, defaults to dry run, and needs explicit approval for an actual write. Do not add a separate options tool or a public `set_record` dry-run contract. Do not automatically retry unknown creation outcomes.
- Output schemas remain supported metadata; they are not inherently a publication prerequisite, and hosts cannot be assumed to defer them. Measure loading and context use in target hosts.
- No new tests, fake-server harnesses, reflection checks, or production APIs added for tests. Use existing checks and realistic manual verification.
- Do not commit, push, merge, publish a registry/store release, accept publisher/legal terms, or submit in a portal without a new explicit user instruction. The previous 0.2.4 Git publication authorization has already been used.

## Ownership and entrypoints

Read `AGENTS.md`, `RELEASE_MANIFEST.json`, and `docs/release-process.md` first. Runtime and public usage-skill copies under managed roots are exported from their owning implementation repository. Do not patch generated copies as the durable source. Record backend/exporter dependencies separately and coordinate changes with that owner.

Repo-owned work includes `plugin.json`, `chatgpt-app-submission.json`, `mcp.json`, provider source metadata, `docs/`, `README.md`, `CHANGELOG.md`, and validators. Provider copies are regenerated with `npm run build:providers`.

Website sources are `docs/index.html`, `docs/assets/site.css`, `docs/assets/site.js`, `docs/install-data.json`, and `docs/llms.txt`. `tools/build-docs-site.mjs` publishes those sources; `.github/workflows/pages.yml` deploys pushes to `main` for its configured paths. This repo does not own the corporate marketing website.

## Initial listing gaps and local corrections

Official listing guidance checked on 2026-10-15:
https://developers.openai.com/plugins/deploy/submission#listing-metadata

The initial `plugin.json` OpenAI interface had a 40-character `shortDescription` (`Work with your Realinsight customer data`); official submission guidance limits it to 30. The local draft now uses `Work with Realinsight data` (26 characters). The initial category `Business` is not in the current supported category list; the local OpenAI manifests and Codex marketplace entries now use `Business & Operations`.

`supportURL` now points to `https://www.realinsight.com/contact-us/`, whose public page explicitly provides technical support. `privacyPolicyURL` and `termsOfServiceURL` remain absent. All four HTTPS listing URLs, including `websiteURL`, are required for MCP review; package `homepage` and `author.url` do not populate them automatically. Chris confirmed on 2026-10-15 that the listing website should be realinsight.com; that value is retained.

The published [corporate privacy policy](https://www.realinsight.com/privacy-policy/) and [terms](https://www.realinsight.com/terms-and-conditions/) describe use of the corporate website. They do not establish coverage for authenticated connector data. Legal ownership and approved connector URLs remain required. No policy text, support commitment, publisher verification, or production availability was invented.

## Work checklist

- [x] Refresh official OpenAI submission, metadata, package, image, OAuth, and review requirements; sources and retrieval date recorded below. Portal/schema validation remains authoritative.
- [x] Build a metadata matrix and align the local portable/OpenAI, native Codex/provider, and site identity. Legal URL gaps remain explicit.
- [x] Inspect actual listing/composer mark, wordmarks, favicon, and website at desktop/mobile sizes. Replace stale favicon artwork using the existing official PNG; no invented brand asset or unnecessary icon upscale.
- [x] Update local site, auth/security/install/release docs, support links, and example prompts. Save website screenshots without customer data. Legal policies and deployed connection screenshots remain owner gates.
- [ ] Complete authenticated production audit. Public discovery and unauthenticated errors checked; live tools, consent, refresh, switching, disconnect, schemas, and hosted UI still require the dedicated reviewer setup.
- [ ] Execute reviewer cases and record a walkthrough. Five positive/three negative cases and provisioning/runbook requirements are prepared; account, sample data, actual results, and recording are still needed.
- [x] Validate the local review package and website and record the remaining gates. This is draft package validation, not production or portal approval.

Pending source-owner correction: the user explicitly requested hiding the meaningless runtime Environment row. The owning implementation now has an uncommitted change removing that row and the runtime label from the app's model-context message, with the server URL retained. The published 0.2.4 copies still contain the old row. Coordinate the source-owner change and next reviewed export/version before shipping it; do not hand-edit public managed copies or imply that the change is deployed. The diagnostic API field remains intact. Do not add a guessed environment label or hostname-mapping abstraction.

Still unverified: production consent and capabilities, actual creation/update-hook failure rollback against customer data, full reconnect/switch behavior in ChatGPT, and publisher/domain verification. Do not advertise atomicity across independently committed operations or external side effects. The default validation rejects initial `user`, `currency_forward`, and `index_rate_forward` values until the writer supports them.

## Validation and acceptance

Run only checks appropriate to touched behavior. Existing commands include:

```sh
npm run test:contract
npm run test:agent-plugin
npm run validate:agent-plugin
npm run build:providers
npm run validate:providers
npm run build:docs-site
npm run build:dist
npm run validate:dist
npm run pack:dry-run
git diff --check
```

Do not rerun or expand testing without a relevant change. The final handoff must contain consistent metadata, reviewed assets and rendered website, a reproducible package, official source references, and an explicit remaining submission checklist. Keep the final portal submission as a separate user-approved action.

Documentation impact: docs_required: yes — update the nearest existing `docs/release-process.md`, installation/auth/security pages, and website sources as needed. Maintain this plan rather than creating competing submission plans.

## 2026-10-15 audit evidence

### Official requirements refreshed

Read the actual official pages on 2026-10-15:

- [Upload and submit a plugin](https://developers.openai.com/plugins/deploy/submission): supported portable ZIP, verified identity/permissions, four listing URLs, five positive/three negative cases, reviewer account, recording, domain challenge, and separate submission/publication actions.
- [Listing and interface errors](https://developers.openai.com/plugins/deploy/submission-errors#listing-and-interface-errors): submission text limits, supported categories, prompt limits, and light/dark color contrast.
- [Icons and screenshots](https://developers.openai.com/plugins/deploy/submission#icons-and-screenshots): square PNG/JPEG/WebP/SVG, at least 48×48, at most 4096×4096 for rasters, at most 5 MiB. Optional dark variants and screenshots.
- [Package and MCP authentication](https://developers.openai.com/plugins/build/plugins#configure-mcp-authentication): per-server OpenAI auth extension, CIMD/DCR/provided client options, endpoint/scope configuration, no embedded secrets. Inline OpenAI metadata replaces the native overlay rather than merging it.
- [Review metadata](https://developers.openai.com/plugins/deploy/submission#configure-onboarding-review-and-publication): cases belong in `extensions.com.openai.review.test_cases`, using `prompt` and `expected_behavior`. Reviewer credentials and private sign-in instructions must stay outside the ZIP.
- [Remote MCP review](https://developers.openai.com/plugins/deploy/app-review) and [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines): production endpoint, transparent least-privilege auth, accurate annotations, data minimization/policies, and continuous tool review.
- [UI CSP](https://developers.openai.com/plugins/build/chatgpt-ui#content-security-policy-csp): narrow connect/resource/frame allowlists, matched to actual UI behavior.

### Metadata and branding matrix

| Surface | Local decision and evidence | Remaining boundary |
| --- | --- | --- |
| Portable `plugin.json` | Stable `realinsight-connector` identity, 0.2.4; public display `Realinsight`; 26-character subtitle; `Business & Operations`; audience, tasks, permissions, limitations, and deployment-dependent writes described. | Final reviewed export/version and portal validation. |
| OpenAI interface | realinsight.com product URL confirmed by Chris; technical support on the same domain; three unique prompts of 71/48/59 characters; customer/server URL wording. | Approved connector privacy/terms URLs and verified publisher display identity. |
| Review metadata | Exactly five positive and three negative cases in the supported manifest shape, plus draft release notes. Cases cover context, sample loan/records, latest child, analytic, and creation dry run; no actual writes required by these draft cases. | Seed data and run all cases on the final account/endpoint; final release notes and accessible video. |
| Legacy submission JSON | Retained 54-tool annotation worksheet with aligned prose and matching scenarios. It records one primary tool per positive case for the existing validator. | Not a current portal import; reconcile annotations with the actual hosted scan. |
| Native Codex source and providers | Retain `Realinsight Connector`, `Realinsight Connector Dev`, and `Realinsight Connector QA` install labels; align category/subtitle/prompts/URLs/colors. Add packaged icon references and regenerate with `build:providers`. | Local metadata only; installed 0.2.4 caches are unchanged. |
| Images | Existing official 180×180 RGBA PNG is the root and native listing/composer icon; all five copies are byte-identical. Primary and white SVG wordmarks remain in the website. Transparent icon corners and blue/white mark inspected. | Portal rendering still needs review. Separate dark icon artwork is optional and unnecessary for this blue mark. |
| Colors/favicon | Use official mark blue `#3498DB` in both themes: contrast 3.15:1 against white and 5.11:1 against `#212121`. Old ICO included a sparkle badge; regenerate 16/32/48 sizes from the existing official icon and inspect. | Website changes are not deployed. |
| Website | Existing install-site layout retained; clearer use cases, sign-in/access, fixed endpoints, customer reconnect, revocation, limitations, real support link. Actual desktop and mobile renders inspected; QA Codex selector names the separate QA plugin. | Corporate site is outside this repo; no production connection screenshot or walkthrough was fabricated. |
| Install catalog / agent index | Catalog remains 0.2.4 with ChatGPT/desktop/remote/production defaults and explicit isolated prod/dev/QA endpoints. Agent index adds corporate product/support links. | No npm publication or official OpenAI-directory install is claimed. |

### Public production probes and source-only review

No credentials or customer data were used. Public probes on 2026-10-15:

- `GET https://www.realinsight.cloud/api/v1/mcp` → 405, JSON explaining POST-only operation. This does not prove an authenticated MCP session.
- An unauthenticated JSON-RPC `initialize` POST → 401 with a Bearer `resource_metadata` challenge; no customer operation ran.
- `GET https://www.realinsight.cloud/.well-known/oauth-protected-resource/api/v1/mcp` → 200, correct MCP audience/resource and authorization server.
- `GET https://www.realinsight.cloud/.well-known/oauth-authorization-server` → 200; authorization-code/refresh, public token auth method `none`, S256 PKCE, CIMD support, DCR and revocation endpoints advertised.
- Both scope lists and the 401 challenge omit `ri:entity.create`. Treat production creation as a deployment/readiness blocker; no authenticated production inventory or creation was verified.
- Live GitHub Pages returned 200 through curl and still contains the old site prose. All website changes here remain local. One fetch client rejected its certificate chain; curl's normal certificate validation succeeded, so no TLS bypass was used.

The checked-in local runtime advertises `ui://realinsight/connection/v1.html`, MCP App HTML, empty network/resource CSP allowlists, and `openai/ui` global/thread entrypoints. The HTML embeds styles, script, and the official wordmark and uses host messages for tools. This source inspection does not verify production UI metadata, host support, a settings surface, or reconnect behavior. The fetched official UI guidance did not establish availability of the global/thread entrypoints in the target host. Retain these as manual host checks.

OpenAI's current per-server auth extension conflicts with the fields accepted by this repo's pinned remote-server validator. The root MCP config remains the credential-free production endpoint. Do not silently change the pinned standard or weaken validation to make a draft pass. Resolve the supported OpenAI auth configuration/format before portal connection, then inspect the actual saved settings. No OAuth registration or scope grant was changed during this audit.

### Reviewer runbook and owner inputs

1. Publisher owner confirms business identity, organization/project, permissions, eligible data residency, countries, and support ownership. No verification or legal attestations have been made.
2. Legal approves connector privacy/terms destinations covering personal-data categories, uses, recipients, retention, and user controls. The corporate website policies are candidates for legal review only.
3. Source/deployment owner lands the reviewed runtime UI correction, coordinates the next export/version, and aligns production capabilities/OAuth scopes. Preserve existing contracts during deployment.
4. Account owner provisions a dedicated sample-only reviewer customer/account on the final production endpoint, with no MFA/approval/code/private-network dependency. Supply a sample loan named Riverfront Center, two dated servicing children with documented type/date fields, an accessible sample portfolio analytic, and a creation-capable feature with its required parent and an editable integer field. Keep login details and private instructions outside Git and the package.
5. Reviewer signs in, verifies customer/server/user/scopes, runs the five positive and three negative manifest cases, and records actual tool calls/results. Dry-run creation must not persist an entity. Consequential writes, customer changes, and revocation need explicit approval; this audit did not perform them.
6. Verify separate authorized sample-data cases for approval gates, permission/scope denial, real writes, hook failures/rollback, token refresh, reconnect/customer isolation, disconnect/revocation, schema conformance, and UI behavior. Record the accessible walkthrough only after final deployment; do not claim development results as production results.
7. Rebuild the ZIP after final metadata/export; with Chris's authorization upload, verify the exact domain token, connect OAuth, review scans/imported cases, enter private reviewer access and recording, and submit. Publish only after approval and separate authorization.

### Local validation and review artifacts

Passed existing checks: `test:contract` (59 tools / 58 requests), `test:agent-plugin`, `validate:agent-plugin`, `build:providers`, `validate:providers`, `build:docs-site`, HTTP `build:dist` for prod/dev/QA, `validate:dist`, and `pack:dry-run`. No new tests or production test seams were added. Touched JSON parses; managed roots remain unchanged; `git diff --check` passes.

The portable candidate was built using the allowlist recipe in `docs/release-process.md`, opened as a ZIP, checked for required asset paths and allowed contents, extracted, and validated with the existing portable validator. A focused secret-pattern check found no private-key/token patterns in the candidate; this does not replace the release workflow's full secret scan.

- Draft ZIP: `.tmp/openai/realinsight-plugin-0.2.4-review.zip` (53,152 bytes; 28 entries).
- SHA-256: `2095099f12007ba24477fcd6474516edf4c79ef6be55bcf8538bd1e3500e7b6b`.
- Visual evidence: `.tmp/openai/website-desktop.jpg`, `website-mobile.jpg`, and `website-preview.jpg`. Screenshots show the local website, not a deployed connector session. Mobile viewport requested at 390×844; measured content width 375 with no horizontal page overflow. Temporary viewport override was reset.
- The ZIP omits plans, private implementation, runtime source, other providers, and the legacy worksheet. Native HTTP distributions remain separately under `.tmp/dist`.

Readiness: local metadata, assets, docs, website, and draft package are reviewable. Submission remains blocked on legal URLs, publisher decisions/verification, OAuth package compatibility/setup, reviewed source export and production deployment, dedicated reviewer data/account, live verification and recording, and authorized portal actions. Nothing was committed, pushed, published, submitted, or accepted in the portal.
