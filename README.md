# IEEE TAMU Lounge

Web app for the IEEE TAMU officer lounge. It is the web equivalent of the
Discord bot's lounge music commands: it calls the same `lounge-music` HTTP agent
on `ieee-tamu-5B`, but exposes a browser UI with portal login.

## Architecture

- **Portal OIDC**: `lounge.ieeetamu.org` is an OIDC client of
  `portal.ieeetamu.org`. The portal reuses the member's existing portal session,
  then returns an authorization code. The app validates the ID token, reads the
  member's portal role, and stores a signed HTTP-only session cookie.
- **Music agent**: all player requests are proxied through Next.js server routes.
  The browser never receives the agent URL or bearer token.
- **Access**: any confirmed portal member can log in and view now-playing and the
  queue. Only portal `officer` or `admin` members can control playback.
- **Live state**: the UI polls the agent's `/status` endpoint every 3 seconds.

## Local development

Prerequisites:

- Nix with flakes enabled
- A running portal at `http://localhost:4000`
- The lounge music agent reachable at `MUSIC_AGENT_URL` (or a mock)

```sh
cp .env.example .env.local
# edit .env.local if needed
nix develop --command npm install
nix develop --command npm run dev
```

The portal dev config registers a `lounge-dev` OIDC client with redirect URI
`http://localhost:3000/api/auth/callback`. The matching values are in
`.env.example`.

## Environment

| Variable                    | Required | Description                                         |
| --------------------------- | -------- | --------------------------------------------------- |
| `APP_BASE_URL`              | yes      | Public base URL, e.g. `https://lounge.ieeetamu.org` |
| `PORTAL_OIDC_ISSUER`        | yes      | Portal issuer, e.g. `https://portal.ieeetamu.org`   |
| `PORTAL_OIDC_CLIENT_ID`     | yes      | OIDC client ID registered in the portal             |
| `PORTAL_OIDC_CLIENT_SECRET` | yes      | OIDC client secret registered in the portal         |
| `SESSION_SECRET`            | yes      | HMAC secret for the lounge session cookie           |
| `MUSIC_AGENT_URL`           | yes      | Lounge music agent base URL                         |
| `MUSIC_AGENT_TOKEN`         | no       | Bearer token if the agent has `tokenFile` enabled   |
| `PLAYER_COOLDOWN_SECONDS`   | no       | Per-user action cooldown, default `3`               |
| `SESSION_MAX_AGE_SECONDS`   | no       | Session lifetime, default `28800` (8 hours)         |

## Portal OIDC client

The portal provider is configured with:

```text
LOUNGE_OIDC_CLIENT_ID=ieee-tamu-lounge
LOUNGE_OIDC_CLIENT_SECRET=<secret>
LOUNGE_OIDC_REDIRECT_URIS=https://lounge.ieeetamu.org/api/auth/callback,http://localhost:3000/api/auth/callback
PORTAL_OIDC_ISSUER=https://portal.ieeetamu.org
```

The provider exposes:

- `/.well-known/openid-configuration`
- `/oauth/jwks`
- `/oauth/authorize`
- `/oauth/token`
- `/oauth/userinfo`

It supports the authorization code flow with PKCE (S256) and RS256 ID tokens.
The `role` claim is the portal role (`member`, `officer`, or `admin`).

## Checks

```sh
nix develop --command npm run lint
nix develop --command npm run typecheck
nix develop --command npm test
```

## Deployment

The Nix flake builds a standalone Next.js server and a Docker image:

```sh
nix build .#packages.x86_64-linux.docker
docker load < result
```

Pushes to `master` and `v*` tags publish `ghcr.io/ieee-tamu/lounge` through the
shared `nix-docker-publish.yaml` workflow. The Kubernetes manifests live in
`IEEE-TAMU/cluster-infra` under `apps/lounge`.
