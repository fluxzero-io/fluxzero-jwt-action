# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- `audience` input to override the OIDC audience claim, allowing connection to different cloud environments (defaults to `https://cloud.fluxzero.io`)

## [2.1.0] - 2026-03-12

### Added
- OIDC mode for secretless GitHub Actions authentication via GitHub OIDC token exchange
- `image-name` input for specifying the Docker image name during OIDC token exchange
- `fluxzero-host` input for overriding the Fluxzero API endpoint
- `deploy-token` and `registry-host` outputs in OIDC mode

## [2.0.0] - 2026-03-01

### Changed
- Renamed project to Fluxzero
