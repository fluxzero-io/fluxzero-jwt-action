This patch refreshes the bundled dependencies and improves token masking.

- Updates bundled Undici to 6.29.1, including its upstream security fixes.
- Masks the generated API-key JWT before writing the action output.
- Refreshes the build tooling and reproducible distribution.
- Verifies and commits rebuilt bundles before automatic dependency merges.

The existing token/OIDC inputs and outputs are unchanged. The action continues
to run on GitHub's `node24` runtime.
