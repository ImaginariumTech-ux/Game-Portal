# Game Tracking & Auto-Generated Developer Docs — Build Spec

## Context

The portal currently has a working integration pipeline (session init + match/complete) for one game, "The Gap." The admin dashboard already shows Game ID (UUID), slug, and webhook secret on the Game Details page (see current screenshot reference). This spec adds two things on top of that existing pipeline:

1. Operational tracking fields so the admin can see integration health per game at a glance, without manually checking logs or asking developers.
2. An auto-generated, per-game developer integration document, so onboarding a new game doesn't require manually copy-pasting IDs into a template each time.

Do not change the existing init/match-complete contract itself — this spec only adds tracking and documentation generation around it.

---

## 1. Schema additions

```sql
-- Add to existing `games` table
alter table games add column integration_status text not null default 'pending';
  -- allowed values: 'pending' | 'dev_integrating' | 'testing' | 'live'
alter table games add column last_event_received_at timestamptz;
alter table games add column total_sessions_completed int not null default 0;

-- New table: log every call to either endpoint, for every game
create table integration_logs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id),
  endpoint text not null,          -- 'init' | 'match_complete'
  status_code int not null,
  signature_valid boolean,         -- null for 'init' calls, true/false for 'match_complete'
  payload jsonb,
  error_message text,
  created_at timestamptz default now()
);

create index on integration_logs (game_id, created_at desc);
```

## 2. Behavior changes to existing endpoints

### `GET /api/game/init`
- On every call (success or failure), insert a row into `integration_logs` with `endpoint = 'init'`.
- On success, update `games.last_event_received_at = now()` for that `game_id`.

### `POST /api/game/match/complete`
- On every call (success or failure), insert a row into `integration_logs` with `endpoint = 'match_complete'`, including whether the signature was valid.
- On success, update `games.last_event_received_at = now()`.
- **Only on the first successful completion for a given session** (i.e. the non-idempotent path — the session was `in_progress`, not already `completed`), increment `games.total_sessions_completed` by 1. Do NOT increment this on the idempotent/duplicate-request path.
- **Auto-promotion rule:** if the game's current `integration_status` is `'testing'` and this is a valid, correctly-signed completion (regardless of first-time or duplicate), automatically update `integration_status` to `'live'`. This is the only automatic status transition — all other transitions (`pending` → `dev_integrating` → `testing`) are manually set by the admin in the dashboard.

## 3. Admin dashboard changes

### Game Details page (the page shown with Game ID/slug/webhook secret)
Add a new stats section alongside the existing Total Plays / Avg Session / Rating cards:
- **Integration Status** — a colored badge (e.g. gray = pending, amber = dev_integrating, blue = testing, green = live), with a dropdown/selector for the admin to manually change it (except `live`, which should show as read-only once auto-promoted, with a manual override available if the admin needs to revert it, e.g. for re-testing after a developer pushes a breaking change).
- **Last Event Received** — relative timestamp (e.g. "3 minutes ago" / "4 days ago"). Flag this visually (e.g. amber/red text) if it's been longer than some threshold (suggest 48 hours) since the game is marked `live` — this is the "has this game gone quiet" signal.
- **Total Sessions Completed** — plain running count.
- Add a **"View Logs"** link/tab that opens a filtered view of `integration_logs` for this specific `game_id`, sorted newest first, showing endpoint, status code, signature validity, and timestamp — with the ability to expand a row to see the full payload and error message for debugging.

### Install New Game page
No functional changes needed here — `integration_status` defaults to `'pending'` automatically on creation, no new field needs to be added to this form.

## 4. Auto-generated developer integration document

### Trigger
Add a **"Generate Developer Doc"** button on the Game Details page, next to the existing Copy buttons for Game ID and Webhook Secret.

### Behavior
On click, generate a document by taking the existing template (`developer-integration-template.md`) and substituting its placeholders with this specific game's real values:

| Placeholder in template | Replaced with |
|---|---|
| `[[ GAME_TITLE ]]` | `games.title` |
| `[[ GAME_SLUG ]]` | `games.slug` |
| `[[ WEBHOOK_SECRET ]]` | `games.webhook_secret` |
| Base API URL references | The portal's fixed, unchanging base API URL (this is the same for every game — do not treat it as per-game data, just interpolate the constant) |

### Output format
Offer this as a downloadable file (PDF preferred for a clean "send this to the developer" experience, markdown as a fallback/alternate option) rather than only an in-browser view — the admin needs to be able to attach it to an email or share it directly.

### Versioning consideration
Store a `template_version` reference (even just a simple integer or date string) so that if the base template is later updated (e.g. a new endpoint is added, or a field changes), previously-generated docs can be identified as stale, and the admin knows to regenerate and resend if a developer is working off an outdated copy. This does not need to be complex — a single "Integration Spec Version: 1.0" line stamped into the generated doc is sufficient for now.

---

## Acceptance criteria

1. Every call to `init` or `match/complete`, successful or not, produces exactly one row in `integration_logs`.
2. `last_event_received_at` updates on every successful call to either endpoint.
3. `total_sessions_completed` increments exactly once per unique session, never on duplicate/idempotent completions.
4. A game manually set to `testing` automatically flips to `live` the moment a valid signed completion is received — no manual step required at that point.
5. The Game Details page clearly surfaces integration status, last event time, and session count without needing to query the database directly.
6. Clicking "Generate Developer Doc" produces a complete, correctly-filled document for that specific game, with no leftover placeholder text, ready to send to a developer with no further manual editing.
