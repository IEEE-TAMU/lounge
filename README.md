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
- **Spotify linking**: an officer can link a shared Spotify Premium account from
  the player UI. The browser is redirected to Spotify, then the callback route
  forwards the authorization code to the music agent. The agent performs the
  PKCE token exchange, persists the refresh token under `/var/lib`, and runs
  librespot. The web app never stores Spotify credentials.
- **Access**: any confirmed portal member can log in and view now-playing and the
  queue. Only portal `officer` or `admin` members can control playback or
  connect/disconnect Spotify.
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

Create an OIDC client in the portal admin UI at
`https://portal.ieeetamu.org/admin/oidc-clients` (or your local portal) with
redirect URI `http://localhost:3000/api/auth/callback` and scopes
`openid profile email role`. Put the generated client ID and secret in
`.env.local`.

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

OIDC clients are managed by portal admins at
`https://portal.ieeetamu.org/admin/oidc-clients`. Create a client with:

- Redirect URI: `https://lounge.ieeetamu.org/api/auth/callback`
- Optional local redirect: `http://localhost:3000/api/auth/callback`
- Scopes: `openid profile email role`

The generated client ID and secret go into the lounge deployment. The portal
provider exposes:

- `/.well-known/openid-configuration`
- `/oauth/jwks`
- `/oauth/authorize`
- `/oauth/token`
- `/oauth/userinfo`

It supports the authorization code flow with PKCE (S256) and RS256 ID tokens.
The `role` claim is the portal role (`member`, `officer`, or `admin`).

## Spotify linking

Spotify credentials belong to the music agent, not this web app. The app only
provides the public callback route:

- `POST /api/spotify/link` — officer-only; asks the agent for a Spotify
  authorization URL.
- `GET /api/spotify/callback` — receives Spotify's `code`/`state`, verifies the
  lounge session, and forwards the values to the agent.
- `POST /api/spotify/disconnect` — officer-only; clears the agent's credentials.

The agent must have `SPOTIFY_ENABLED=1`, a Spotify Developer app Client ID, and
the same redirect URI registered on that app. See `nix-cluster/README.md` for
the host setup. No Spotify secrets are added to the Kubernetes deployment.
For local development, run the agent with the redirect URI
`http://localhost:3000/api/spotify/callback` and register that URI on the
Spotify app.

Spotify's Web API controls the queue through librespot, so the UI marks the
Spotify queue as read-only. Use the Spotify app to reorder, remove, or clear
Spotify tracks.

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
./result | docker load
```

Pushes to `master` and `v*` tags publish `ghcr.io/ieee-tamu/lounge` through the
shared `nix-docker-publish.yaml` workflow. The Kubernetes manifests live in
`IEEE-TAMU/cluster-infra` under `apps/lounge`. Bump the image tag in
`lounge-deployment.yaml` when releasing the Spotify linking changes.
