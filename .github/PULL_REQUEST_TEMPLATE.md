## Summary

Describe the problem and the approach taken.

Closes #

## Acceptance criteria

List the issue acceptance criteria this PR satisfies, and call out anything intentionally deferred.

- [ ] Scope matches the linked issue
- [ ] Required tests were added or updated
- [ ] Public behavior/config/API documentation was updated when needed

## Verification

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e` when dashboard/browser behavior changes
- [ ] Documentation updated where public behavior changed

## Security / compatibility

- [ ] This change preserves the simulation-only runtime boundary unless an accepted architecture decision explicitly says otherwise.
- [ ] No secrets, private keys, mnemonic phrases, production credentials, or credential-bearing URLs were added.
- [ ] Backward-compatibility or migration impact is documented when configuration, persistence, or API contracts change.

## Reviewer notes

Mention any non-obvious trade-offs, follow-up work, or areas where maintainer attention is especially useful.
