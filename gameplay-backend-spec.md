# Gameplay Backend — Spec for Backend Dev

Data points needed to build out: **score submission**, **progress retrieval**, and **leaderboard**.

---

## 1. Submit Score

**Purpose:** Client sends a score at the end of a play session; backend validates, updates stats, tells client if it's a new personal best.

### Request payload

| Field | Type | Required | Notes |
|---|---|---|---|
| `player_id` | string | Yes | Or derive from auth token |
| `session_token` | string | Yes | Ties submission to a valid, non-expired session |
| `score` | number | Yes | |
| `level_reached` | number | No | If levels are relevant |
| `played_at` | string (ISO 8601) | No | Client timestamp; server can also just use receipt time |

```json
{
  "player_id": "p_18234",
  "session_token": "sess_9f8a2c3e1b4d",
  "score": 1500,
  "level_reached": 4
}
```

### Response payload

| Field | Type | Notes |
|---|---|---|
| `is_personal_best` | boolean | |
| `best_score` | number | Updated all-time best |
| `daily_rank` | number | Optional |
| `weekly_rank` | number | Optional |

```json
{
  "is_personal_best": true,
  "best_score": 1500,
  "daily_rank": 4,
  "weekly_rank": 11
}
```

### Backend responsibilities
- Validate session token (reject if expired/invalid/reused)
- Update all-time, daily, and weekly aggregates
- Prevent duplicate/replay submissions for the same session

---

## 2. Get Player Progress

**Purpose:** Client fetches a player's stats (e.g. on profile screen or app open).

### Request

| Field | Type | Notes |
|---|---|---|
| `player_id` | string | Or derived from auth |

### Response payload

| Field | Type | Description |
|---|---|---|
| `best_score` | number | All-time high score |
| `best_level` | number | Highest level reached |
| `total_sessions` | number | Count of completed sessions |
| `total_playtime_seconds` | number | Cumulative playtime |
| `last_played_at` | string (ISO 8601) | Timestamp of last session |
| `best_score_at` | string (ISO 8601) | Timestamp best score was set |

```json
{
  "best_score": 15420,
  "best_level": 12,
  "total_sessions": 87,
  "total_playtime_seconds": 152340,
  "last_played_at": "2026-07-05T18:42:11Z",
  "best_score_at": "2026-06-28T09:15:03Z"
}
```

---

## 3. Leaderboard

**Purpose:** Ranked list of top players, optionally scoped by time window.

### Request (query params)

| Field | Type | Required | Notes |
|---|---|---|---|
| `scope` | string | No | `all_time` \| `daily` \| `weekly` (default: `all_time`) |
| `limit` | number | No | Default e.g. 50, max e.g. 100 |
| `offset` | number | No | For pagination |
| `around_player` | boolean | No | If true, also return the requesting player's rank even if outside top N |

### Response payload

```json
{
  "scope": "weekly",
  "entries": [
    { "rank": 1, "player_id": "p_00231", "display_name": "Kilimanjaro", "score": 22890 },
    { "rank": 2, "player_id": "p_00457", "display_name": "Nova", "score": 21100 }
  ],
  "player_rank": {
    "rank": 47,
    "player_id": "p_18234",
    "score": 1500
  }
}
```

### Backend responsibilities
- Efficient ranking queries (indexed by score per scope/time window)
- Daily/weekly windows need a reset or rolling-window strategy — decide which
- Tie-breaking rule (e.g. earliest timestamp wins ties)

---

## Open decisions to align on with the backend dev

1. **Auth model** — how is `player_id` established? Token-based? Device ID?
2. **Session tokens** — how are they issued (a "start session" endpoint?) and how long do they live?
3. **Anti-cheat** — any validation beyond token check (e.g. score plausibility limits, rate limiting)?
4. **Daily/weekly reset timing** — UTC midnight? Per-timezone?
5. **Display names** — pulled from a player profile table, or passed in at submission time?
