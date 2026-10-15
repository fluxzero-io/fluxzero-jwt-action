# Dependency maintenance

Dependabot checks the npm manifest/lockfile and pinned GitHub Actions daily.
Minor and patch PRs can enable native rebase auto-merge through the dedicated
Dependabot App, behind the strict `JWT Action required checks` rule. The merge
job never checks out PR code. Keep its App key exclusively in Dependabot secrets;
build and runtime jobs need no private credentials.

Every PR runs the complete Node matrix, lint/type checks, rebuilt-distribution
tests for token and OIDC mode, and the actual checked-out `node24` GitHub Action
with an ephemeral RSA key. Human PRs and version tags must also reproduce the
committed `dist` bytes. Dependabot cannot generate the bundle, so its PR tests
the freshly rebuilt action instead.

After the complete matrix and runtime pass for a native Dependabot event, a
separate job downloads the tested artifact from that same workflow run. It
never checks out or executes PR code. The bounded merge App token writes only
`dist/index.js` and `dist/licenses.txt` to the unchanged bot branch, using the
Git data API and a non-forced update. That App push starts fresh CI, including
the committed-distribution comparison. Native auto-merge waits for this final
head to pass the strict required gate. An original PR with stale bundled bytes
cannot pass that gate. Neither the merge App nor GitHub Actions has a bypass.

This replaces the old main autobuild: GitHub does not allow its built-in Actions
integration as a ruleset bypass actor. No App credential is passed to build or
runtime jobs, and no main follow-up commit or new credential is needed.

Build the committed distribution with Node 26. The supported action runtime
remains `node24`; Node 20 in CI is legacy coverage only. Keep `@types/node` on
the current 24 line so the compiler cannot silently approve newer runtime APIs.

TypeScript stays on 6.0.x while typescript-eslint requires `>=4.8.4 <6.1.0`.
Reassess the exclusion when the parser supports newer compilers; do not bypass
its peer dependencies with force or legacy-peer-deps.

Releases remain explicit `vX.Y.Z` tags. The tag workflow verifies the complete
matrix, actual action runtime and committed distribution before moving `vX` and
publishing the release. Dependency merges do not create release tags.
