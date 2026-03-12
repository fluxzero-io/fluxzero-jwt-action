# Fluxzero JWT Action

[![GitHub release](https://img.shields.io/github/v/release/fluxzero-io/fluxzero-jwt-action?display_name=tag&sort=semver)](https://github.com/fluxzero-io/fluxzero-jwt-action/releases)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Use%20this%20Action-2ea44f)](https://github.com/marketplace/actions/fluxzero-jwt)

This action generates a short-lived JWT for authenticating against the **Fluxzero System API**. It supports two modes:

- **Token mode** (default): uses a stored API key secret to generate a JWT locally.
- **OIDC mode**: exchanges a GitHub OIDC token with Fluxzero for registry and deploy credentials — no stored secrets needed.

---

## OIDC Mode (recommended)

OIDC mode uses GitHub's built-in OIDC provider to authenticate with Fluxzero. No API key secret needs to be stored in the repository.

**Prerequisites:** your repository must be connected to a Fluxzero team via the GitHub App integration.

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate with Fluxzero
        id: auth
        uses: fluxzero-io/fluxzero-jwt-action@v2
        with:
          mode: oidc

      - name: Log in to Fluxzero Container Registry
        run: |
          echo "${{ steps.auth.outputs.token }}" | docker login ${{ steps.auth.outputs.registry-host }} -u ${{ steps.auth.outputs.userId }} --password-stdin

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ steps.auth.outputs.registry-host }}/my-app:${{ github.sha }}

      - name: Deploy
        uses: fluxzero-io/fluxzero-deploy-action@v1
        with:
          token: ${{ steps.auth.outputs.deploy-token }}
          cluster-name: production
          application-name: my-app
          image-name: my-app
          version: ${{ github.sha }}
```

## Token Mode (API key)

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Fluxzero JWT
        id: jwt
        uses: fluxzero-io/fluxzero-jwt-action@v2
        with:
          api-key: ${{ secrets.FLUXZERO_API_KEY }}

      - name: Log in to Fluxzero Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.fluxzero.io
          username: ${{ steps.jwt.outputs.userId }}
          password: ${{ steps.jwt.outputs.token }}
```

---

## Inputs

| Name               | Required | Default                              | Description                                                  |
|--------------------|:--------:|:------------------------------------:|--------------------------------------------------------------|
| `mode`             |    no    | `token`                              | `token` (API key) or `oidc` (GitHub OIDC token exchange)     |
| `api-key`          |    no    |                -                     | Fluxzero System API key (required in `token` mode)           |
| `fluxzero-host`    |    no    | `https://api.dashboard.fluxzero.io`  | Fluxzero API host (used in `oidc` mode)                      |
| `validity-seconds` |    no    | `300`                                | Token validity in seconds (`token` mode only)                |

---

## Outputs

| Name            | Modes         | Description                                    |
|-----------------|---------------|------------------------------------------------|
| `token`         | token, oidc   | JWT for registry auth (docker login password)  |
| `userId`        | token, oidc   | User ID (docker login username)                |
| `deploy-token`  | oidc          | JWT for the fluxzero-deploy-action             |
| `registry-host` | oidc          | Registry hostname for docker login             |

---

## Security notes

- All secrets and tokens are masked in workflow logs.
- OIDC mode is recommended as it eliminates the need for stored API key secrets.
- Use short validity where possible (default 5 minutes).
- For maximum supply-chain safety, pin this action to a specific commit SHA:
  ```yaml
  uses: fluxzero-io/fluxzero-jwt-action@<commit-sha>
  ```