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
| `fluxzero-host`    |    no    | `https://api.dashboard.fluxzero.io`  | Fluxzero API host (`oidc` mode)                              |
| `audience`         |    no    | `https://cloud.fluxzero.io`          | OIDC audience claim (`oidc` mode)                            |
| `image-name`       |    no    |                -                     | Docker image name to push (required in `oidc` mode)          |
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

## Testing OIDC mode against a local environment

You can test the OIDC token exchange end-to-end against a locally running `flux-host-service` using the `local-deploy` workflow in `flux-host-service`.

### Prerequisites

- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installed
- `flux-host-service` checked out locally
- A GitHub App installed on the target org/repo with a repo connection to a Fluxzero team

### 1. Start the backend

Start the Spring Boot backend in `flux-host-service`:

```bash
mvn -pl app spring-boot:run
```

Make sure `app/src/main/resources/application-local.properties` has these properties set:

```properties
feature.github.enabled=true
github.webhook-secret=<your-webhook-secret>
github.ci.token-secret=<your-ci-token-secret>
docker-registry-public.host=registry.fluxzero.io
```

### 2. Start the Angular dev server

The Angular proxy forwards `/api/*` requests to Spring Boot on port 8080:

```bash
cd frontend
ng run flux-host-dashboard:serve-marketplace --disable-host-check
```

The `--disable-host-check` flag is required because the Cloudflare tunnel sends requests with an external hostname.

### 3. Start a Cloudflare tunnel

Open a tunnel to the Angular dev server (default port 4200):

```bash
cloudflared tunnel --url http://localhost:4200
```

This gives you a temporary public URL like `https://<random>.trycloudflare.com`. These URLs are ephemeral — you get a new one each time you restart the tunnel.

> **Tip:** add `--loglevel debug` to see every request passing through the tunnel.

### 4. Create a PR with the `local-deploy` label

The `local-deploy` workflow in `flux-host-service` triggers on PRs with the `local-deploy` label. The PR body must contain two tags that configure the target environment:

```
[audience=https://cloud.fluxzero.io]
[baseurl=https://<your-tunnel>.trycloudflare.com]
```

- **`audience`** — the OIDC audience claim. Must match what the server expects (default: `https://cloud.fluxzero.io`). This is **not** the tunnel URL.
- **`baseurl`** — the tunnel URL. Used as the `fluxzero-host` for the token exchange and as the base for the deploy endpoint.

Add the `local-deploy` label to trigger the workflow.

### 5. What the workflow does

1. Parses `audience` and `baseurl` from the PR body
2. Requests a GitHub OIDC token with the configured audience
3. Exchanges it with the Fluxzero backend at `<baseurl>/api/github/exchange-token`
4. Verifies Docker registry login with the returned credentials
5. Deploys using `fluxzero-deploy-action` at `<baseurl>/deploy-application`

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Token exchange failed (403)` with empty body | Cloudflare tunnel is down or URL changed | Restart `cloudflared`, update `[baseurl=...]` in PR body |
| `Invalid Host header` | Angular dev server rejecting the tunnel hostname | Restart `ng serve` with `--disable-host-check` |
| `Error occurred while trying to proxy` (504) | Spring Boot backend not running on port 8080 | Start the backend with `mvn -pl app spring-boot:run` |
| Docker login hits `registry-1.docker.io` | `docker-registry-public.host` property not set | Add `docker-registry-public.host=registry.fluxzero.io` to `application-local.properties` |
| OIDC token validation fails | Audience mismatch | Use `audience=https://cloud.fluxzero.io` (the server default), not the tunnel URL |
| `No team with a repo connection found for repository` | The GitHub repository is not linked to a Fluxzero team | In the Fluxzero dashboard, connect your repository to a team. The OIDC exchange requires a repo connection to determine which team to issue tokens for |
| `invalid reference format` in Docker build/push | `docker-registry-public.host` includes `https://` | The property must be a bare hostname (e.g. `registry.fluxzero.io`), not a URL |
| `No Fluxzero installation found for GitHub account` after server restart | Local database was reset — all GitHub connections are lost | Re-run the GitHub App connection flow in the dashboard and re-link your repository to a team |

---

## Security notes

- All secrets and tokens are masked in workflow logs.
- OIDC mode is recommended as it eliminates the need for stored API key secrets.
- Use short validity where possible (default 5 minutes).
- For maximum supply-chain safety, pin this action to a specific commit SHA:
  ```yaml
  uses: fluxzero-io/fluxzero-jwt-action@<commit-sha>
  ```