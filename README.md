# Generate Flux Capacitor JWT

[![GitHub release](https://img.shields.io/github/v/release/flux-capacitor-io/generate-jwt-action?display_name=tag&sort=semver)](https://github.com/flux-capacitor-io/generate-jwt-action/releases)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Use%20this%20Action-2ea44f)](https://github.com/marketplace/actions/generate-flux-capacitor-jwt)

This action generates a short-lived JWT for authenticating against the **Flux Host API**.

---

## Usage

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Flux Host JWT
        id: jwt
        uses: ./.github/actions/generate-jwt
        with:
          api-key: ${{ secrets.FLUX_HOST_API_KEY }}

      - name: Log in to Flux Host Container Registry
        uses: docker/login-action@v3
        with:
          registry: registry.flux.host
          username: ${{ steps.jwt.outputs.userId }}
          password: ${{ steps.jwt.outputs.token }}
```

---

## Inputs
| Name               | Required | Default | Description              |
|--------------------|:--------:|:-------:|--------------------------|
| `api-key`          |   yes    |   —     | Flux Host API key        |
| `validity-seconds` |    no    |  `300`  | Token validity in seconds|

---

## Outputs

| Name    | Description      |
|---------|------------------|
| `token` | The generated JWT |

---

## Security notes

- The secret part of the `api-key` input is masked in workflow logs.
- Use short validity where possible (default 5 minutes).
- For maximum supply-chain safety, pin this action to a specific commit SHA:  
  ```yaml
  uses: flux-capacitor-io/generate-jwt-action@<commit-sha>
  ```
