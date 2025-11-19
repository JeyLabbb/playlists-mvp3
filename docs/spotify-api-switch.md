## Switching Between Official Spotify API And Unofficial API

This project now supports a toggle so you can develop with an unofficial Spotify-like API while still keeping the official integration ready. Use the environment variables below in `.env.local` (or in Vercel) to control the behaviour.

### 1. Official Spotify API (default)

```bash
USE_UNOFFICIAL_SPOTIFY_API=false

# Standard Spotify env vars that NextAuth already uses
SPOTIFY_CLIENT_ID=your_official_client_id
SPOTIFY_CLIENT_SECRET=your_official_client_secret
# Optional override if Spotify ever changes the REST domain
# SPOTIFY_API_BASE_URL=https://api.spotify.com/v1
```

When `USE_UNOFFICIAL_SPOTIFY_API` is `false` (or unset) the app behaves exactly as before: users authenticate with the official Spotify OAuth flow, and API calls use `https://api.spotify.com/v1` with each user’s access token.

### 2. Unofficial API Mode

```bash
USE_UNOFFICIAL_SPOTIFY_API=true

# URL of the unofficial service (must include /v1 or equivalent)
UNOFFICIAL_SPOTIFY_BASE_URL=https://your-unofficial-host/v1

# Credentials / headers for the unofficial API
UNOFFICIAL_SPOTIFY_API_KEY=your_unofficial_key
# Header name + prefix are optional; default to Authorization: Bearer <key>
# UNOFFICIAL_SPOTIFY_AUTH_HEADER=X-API-Key
# UNOFFICIAL_SPOTIFY_AUTH_PREFIX=Token
# If the provider needs more headers (separated by ;)
# UNOFFICIAL_SPOTIFY_EXTRA_HEADERS=X-RapidAPI-Host=spotify23.p.rapidapi.com;App=whatever

# ID to use when creating playlists (falls back to the logged-in user id)
UNOFFICIAL_SPOTIFY_USER_ID=your_spotify_user_id
```

Set `USE_UNOFFICIAL_SPOTIFY_API=true` and provide the base URL plus the credentials your alternate service requires. The helper automatically adds the correct header to every request. If your service needs a custom header name or prefix, set `UNOFFICIAL_SPOTIFY_AUTH_HEADER` and/or `UNOFFICIAL_SPOTIFY_AUTH_PREFIX`.

If your unofficial API still needs users to sign in, keep the regular Spotify OAuth credentials in place so NextAuth can obtain a session. If it does **not** require Spotify OAuth, you can sign in any way you prefer; the factory will fall back to `UNOFFICIAL_SPOTIFY_USER_ID` when the session does not expose a `user.id`.

### 3. Reverting Back

Just flip the toggle:

```bash
USE_UNOFFICIAL_SPOTIFY_API=false
```

Remove the `UNOFFICIAL_*` variables or leave them in place—they are ignored when the toggle is off. No code changes are needed to go back to the official API.

### 4. Troubleshooting

- **Missing API key**: if `UNOFFICIAL_SPOTIFY_API_KEY` is not set when the toggle is on, the server logs an error and skips creating the client (calls will fail fast).
- **Missing user id**: make sure either the session still has `session.user.id` (from Spotify OAuth) or set `UNOFFICIAL_SPOTIFY_USER_ID`.
- **Base URL format**: provide the full base (e.g. `https://myapi.dev/v1`) without a trailing slash— it is normalized automatically.

Keep this file handy if you ever want to swap between modes again.

