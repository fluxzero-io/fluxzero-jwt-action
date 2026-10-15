# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.3.1] - 2026-10-15

### Fixed
- Update bundled Undici to 6.29.1, including the upstream security fixes.
- Mask the generated API-key JWT before writing the action output.

### Changed
- Refresh the build tooling and the reproducible action distribution.
- Require complete verification and a matching committed bundle before dependency merges.
- Preserve the existing token/OIDC inputs, outputs and node24 action runtime.

## [2.3.0] - 2026-08-17

### Changed
- OIDC mode exchanges the GitHub credential through the provider-neutral `/api/integrations/exchange-token` endpoint.
- Existing action outputs remain unchanged while authentication no longer depends on GitHub App installation or repository-connection state.
- `image-name` remains accepted for workflow compatibility but is no longer required or sent during authentication.

### Added
- Executable coverage for the bundled OIDC exchange contract.

## [2.2.1] - 2026-07-03

### Fixed
- Shortened the Action metadata description so GitHub Marketplace validation can publish the release.

### Changed
- Runs the action on GitHub's `node24` JavaScript action runtime.
- Verifies compatibility on Node.js 20, 24, and 26.
- Uses Node.js 26 for the bundled `dist` build in CI.
- Updates Actions toolkit, JWT, TypeScript, ESLint, and related dependencies.
- Updates workflows to `actions/checkout@v6` and `actions/setup-node@v6`.
- Documents runtime defaults, Node.js 26 compatibility, and the temporary Node.js 20 override behavior.

## [2.1.0] - 2026-06-30

### Added
- `audience` input to override the OIDC audience claim, allowing connection to different cloud environments (defaults to `https://cloud.fluxzero.io`)
- OIDC mode for secretless GitHub Actions authentication via GitHub OIDC token exchange
- `image-name` input for specifying the Docker image name during OIDC token exchange
- `fluxzero-host` input for overriding the Fluxzero API endpoint
- `deploy-token` and `registry-host` outputs in OIDC mode

## [2.0.0] - 2026-03-01

### Changed
- Renamed project to Fluxzero
