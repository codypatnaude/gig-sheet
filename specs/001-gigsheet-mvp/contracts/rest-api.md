# REST API Contracts: GigSheet MVP

**Branch**: `001-gigsheet-mvp` | **Date**: 2026-04-20

GigSheet's primary API is WebSocket-based (see `websocket-events.md`). The REST API is
minimal — it exists only for health checking and initial page load, not for data operations.
All data mutations go through Socket.IO events.

---

## Endpoints

### `GET /health`

Returns server health status. Used for monitoring and uptime checking.

**Request**: No parameters, no body.

**Response** (200 OK):
```json
{
  "status": "ok",
  "uptime_seconds": 12345,
  "song_count": 3
}
```

**Error response** (500):
```json
{
  "status": "error",
  "message": "Database unavailable"
}
```

---

### `GET /` (and all non-API routes)

Serves the React SPA `index.html`. Express is configured to serve all non-`/api/*` and
non-`/socket.io/*` routes from the Vite build output directory.

This enables client-side routing (React Router, if used, or internal state navigation)
to work on direct URL access or page reload.

---

## Notes

- There are no REST endpoints for song CRUD. All song operations go through Socket.IO.
- There is no authentication endpoint. GigSheet has no auth in MVP.
- The server URL displayed in the UI is derived from `window.location` on the client, not
  served via an API call.
