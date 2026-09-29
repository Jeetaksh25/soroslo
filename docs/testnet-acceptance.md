# Testnet acceptance evidence

SoroSLO v0.1 includes a real Stellar Testnet acceptance fixture under `contracts/fixtures`.

The canonical live verification is the **Testnet Acceptance** GitHub Actions workflow. It is intentionally separate from pull-request CI so public Testnet availability cannot make contributor PRs nondeterministic.

## Acceptance contract

The workflow:

1. builds and unit-tests the Rust fixture;
2. creates an ephemeral Testnet deployment identity and funds it through Testnet Friendbot;
3. deploys the fixture contract;
4. invokes a fixture read through Stellar CLI as a deployment sanity check;
5. discards the deployment identity from the SoroSLO execution path;
6. runs SoroSLO's own simulation-only engine against the public contract ID;
7. uploads JSON evidence as a workflow artifact.

The normal SoroSLO acceptance process receives **no secret seed** and performs **no transaction submission**. The only signed transactions are the fixture deployment transactions performed by Stellar CLI before SoroSLO is executed.

## Required cases

A successful artifact records all of the following:

| Case | Expected state |
| --- | --- |
| healthy + structured/freshness read | `pass` |
| chained read using `$steps.<id>.result` | `pass` |
| intentionally false assertion | `service_fail` |
| deterministic fixture contract error | `service_fail` |
| unreachable RPC endpoint | `observer_error` |

## Latest verified deployment

This section is updated after the first M6 live workflow succeeds.

- **Network:** Stellar Testnet
- **Contract ID:** pending first M6 live acceptance run
- **Evidence workflow:** `.github/workflows/testnet-acceptance.yml`
- **Evidence artifact:** `soroslo-testnet-acceptance-<run-id>`

Testnet is reset periodically and Soroban entries have lifecycle limits, so this contract ID is evidence of a dated acceptance run rather than a permanent production dependency. The scheduled workflow redeploys a fresh fixture for new evidence.
