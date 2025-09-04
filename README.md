# Fluxzero JWT Action

[![GitHub release](https://img.shields.io/github/v/release/fluxzero-io/fluxzero-jwt-action?display_name=tag&sort=semver)](https://github.com/fluxzero-io/fluxzero-jwt-action/releases)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Use%20this%20Action-2ea44f)](https://github.com/marketplace/actions/fluxzero-jwt)

This action generates a short-lived JWT for authenticating against the **Fluxzero System API**.

---

## Usage

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Fluxzero JWT
        id: jwt
        uses: fluxzero-io/fluxzero-jwt-action@v1
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
| Name               | Required | Default | Description                  |
|--------------------|:--------:|:-------:|------------------------------|
| `api-key`          |   yes    |    -    | Fluxzero System API key |
| `validity-seconds` |    no    |  `300`  | Token validity in seconds    |

---

## Outputs

| Name     | Description               |
|----------|---------------------------|
| `token`  | The generated JWT         |
| `userId` | The userId of the API key |

---

## Security notes

- The secret part of the `api-key` input is masked in workflow logs.
- Use short validity where possible (default 5 minutes).
- For maximum supply-chain safety, pin this action to a specific commit SHA:  
  ```yaml
  uses: fluxzero-io/fluxzero-jwt-action@<commit-sha>
  ```
