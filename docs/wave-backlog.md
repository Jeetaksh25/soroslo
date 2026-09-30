# Wave-ready contributor backlog

This document is a maintainer planning view of the public contributor backlog. It does **not** assign work and does not replace the issue body or the Drips Wave maintainer dashboard.

The complexity values below are suggested working classifications for future Stellar Wave submissions:

- **Trivial — 100 points:** narrow, localized changes with limited cross-package impact;
- **Medium — 150 points:** multi-file or multi-package work with meaningful tests;
- **High — 200 points:** cross-cutting reliability/Stellar/storage work with larger integration surface.

Final Wave complexity should be set in the Drips maintainer UI after the repository is accepted into a Wave Program.

| Issue | Area | Suggested complexity | Points | Notes |
| --- | --- | ---: | ---: | --- |
| [#8](https://github.com/SoroSLO/soroslo/issues/8) CLI config validation and one-shot checks | CLI / probe | Medium | 150 | Reuses existing execution APIs; multiple failure modes |
| [#9](https://github.com/SoroSLO/soroslo/issues/9) Evidence retention and safe pruning | Storage | High | 200 | Must preserve SLO/incident evidence transactionally |
| [#10](https://github.com/SoroSLO/soroslo/issues/10) Dead-letter visibility and webhook redelivery | Alerts / API / UI | High | 200 | Cross-cutting idempotency and security behavior |
| [#11](https://github.com/SoroSLO/soroslo/issues/11) Multi-RPC observer corroboration | Stellar / reliability | High | 200 | Network identity, evidence, classification semantics |
| [#12](https://github.com/SoroSLO/soroslo/issues/12) Typed vec/map/struct arguments | Soroban / probe | High | 200 | Recursive typed encoding and XDR conversion |
| [#13](https://github.com/SoroSLO/soroslo/issues/13) Multi-window SLO burn-rate alerts | Reliability | High | 200 | SLO engine + incidents + notifications + dashboard |
| [#16](https://github.com/SoroSLO/soroslo/issues/16) Run filtering and pagination | Dashboard | Medium | 150 | UI plus query-state/E2E behavior |
| [#17](https://github.com/SoroSLO/soroslo/issues/17) Cursor pagination for runs/incidents | API / storage | Medium | 150 | Stable opaque cursors and compatibility |
| [#18](https://github.com/SoroSLO/soroslo/issues/18) Portable JSON evidence export | Evidence / API / UI | Medium | 150 | Deterministic export + redaction |
| [#19](https://github.com/SoroSLO/soroslo/issues/19) SQLite backup and restore | Storage / CLI | Medium | 150 | Operationally sensitive but bounded |
| [#20](https://github.com/SoroSLO/soroslo/issues/20) Deterministic scheduler jitter | Runner | Medium | 150 | Restart/idempotency semantics |
| [#21](https://github.com/SoroSLO/soroslo/issues/21) Structured logs and correlation IDs | Observability | Medium | 150 | Cross-component context and redaction |
| [#22](https://github.com/SoroSLO/soroslo/issues/22) Dashboard empty/loading/error states | Dashboard | Trivial | 100 | Narrow UI/E2E entry task |
| [#23](https://github.com/SoroSLO/soroslo/issues/23) Dashboard accessibility pass | Dashboard | Medium | 150 | Multiple views + automated checks |
| [#24](https://github.com/SoroSLO/soroslo/issues/24) Rich YAML validation diagnostics | Config | Medium | 150 | Stable structured diagnostics |
| [#25](https://github.com/SoroSLO/soroslo/issues/25) String comparison assertions | Assertions | Trivial | 100 | Local deterministic operators |
| [#26](https://github.com/SoroSLO/soroslo/issues/26) Safe build/runtime metadata | API | Trivial | 100 | Small version-endpoint extension |
| [#27](https://github.com/SoroSLO/soroslo/issues/27) Reusable Stellar RPC fixture builders | Test infrastructure | Trivial | 100 | Self-contained test-support improvement |
| [#28](https://github.com/SoroSLO/soroslo/issues/28) SLO time-range selection | Dashboard / API | Medium | 150 | Read-model + UI state |
| [#29](https://github.com/SoroSLO/soroslo/issues/29) Incident timeline visualization | Dashboard / API | Medium | 150 | Aggregated evidence and E2E |
| [#30](https://github.com/SoroSLO/soroslo/issues/30) OpenAPI generation | API / docs | Medium | 150 | Schema integration and drift checks |
| [#31](https://github.com/SoroSLO/soroslo/issues/31) Deterministic API error envelopes | API | Medium | 150 | Cross-route compatibility |
| [#32](https://github.com/SoroSLO/soroslo/issues/32) Graceful-shutdown draining state | Runner / API | Medium | 150 | Lifecycle and readiness semantics |
| [#33](https://github.com/SoroSLO/soroslo/issues/33) Migration integrity verification | Storage / CLI | Medium | 150 | Read-only integrity tooling |
| [#34](https://github.com/SoroSLO/soroslo/issues/34) Disable individual checks | Config / runner / UI | Medium | 150 | Cross-surface state behavior |
| [#35](https://github.com/SoroSLO/soroslo/issues/35) Configurable webhook timeout/retries | Alerts / config | Medium | 150 | Bounded policy + deterministic tests |
| [#36](https://github.com/SoroSLO/soroslo/issues/36) Numeric range assertion | Assertions | Trivial | 100 | Local exact-numeric operator |
| [#37](https://github.com/SoroSLO/soroslo/issues/37) Simulation resource-usage trends | Stellar / storage / UI | High | 200 | Cross-stack aggregation and visualization |

## Working totals

- Trivial: **5 issues / 500 points**
- Medium: **17 issues / 2,550 points**
- High: **6 issues / 1,200 points**
- Total: **28 issues / 4,250 points**

These totals are planning estimates only. The actual Wave submission must respect the points budget assigned by Drips to the repository/organization.

## Submission principles

When a new Stellar Wave opens:

1. Apply/confirm SoroSLO for the Wave Program before assigning Wave-targeted issues.
2. Keep candidate issues unassigned until the Wave application flow selects contributors.
3. Submit as many high-quality issues as the repository points budget permits.
4. Prefer a balanced set of Trivial, Medium, and High tasks so contributors with different experience levels can participate.
5. Do not downgrade complexity merely to fit more issues inside a points budget.
6. Keep unresolved contributor issues available for later Waves rather than weakening scope.
