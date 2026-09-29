# M0 bootstrap checklist

After the repository is created:

1. Push this scaffold to `main` (or open it as the first PR).
2. Run `corepack enable && pnpm install` from a networked development environment.
3. Commit the generated `pnpm-lock.yaml`.
4. Change CI install from `pnpm install --no-frozen-lockfile` to `pnpm install --frozen-lockfile`.
5. Confirm the first CI run is green.
6. Enable branch protection for `main` requiring CI.
7. Enable private vulnerability reporting / GitHub security advisories where available.
8. Add repository description and topics: `stellar`, `soroban`, `sre`, `observability`, `synthetic-monitoring`, `typescript`.
9. Do not create Wave backlog issues yet; complete M1 conventions first.
