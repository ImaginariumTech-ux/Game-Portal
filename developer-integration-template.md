# Game Portal Integration Specification
## Developer Integration Template

This integration document outlines the client-side and backend communication contract required to connect third-party HTML5 games with the MagicGames Portal. The portal maintains absolute ownership over all user identities, scoring histories, session states, and leaderboard rankings. Third-party games function strictly as execution runtimes; they must read current session parameters from the portal on startup, execute gameplay in either Practice or Tournament mode, and securely report final scores to the portal at session completion without managing player progress, logins, or leaderboard displays locally.

---

## 1. Session Init

When a user launches a game, the portal loads the game's URL inside an `iframe`, appending the unique session identifier as a query parameter (e.g., `?sessionId=SESSION_ID`). 

As soon as the game loads, it must call the portal's initialization endpoint to retrieve the session context and player profile details.

### Request
* **Endpoint:** `GET /api/game/init`
* **Query Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sessionId` | UUID | Yes | The session ID extracted from the browser's URL query string parameters (e.g. `?sessionId=...`). |

> [!IMPORTANT]
> The game must **never** generate its own player IDs, session tokens, or session identifiers. It must always read the `sessionId` query parameter and pass it directly to the `/init` endpoint.

### Response

The endpoint returns a JSON payload detailing the current gameplay mode and the active player's metadata.

* **Response Format (200 OK):**

| Field | Type | Description |
| :--- | :--- | :--- |
| `success` | boolean | Indicates if the session initialization was successful. |
| `session.id` | UUID | The verified session identifier. |
| `session.mode` | string | The gameplay mode: `'practice'` (no leaderboard) or `'tournament'` (high-score tracked). |
| `session.status` | string | The current session status (e.g., `'live'`). |
| `session.game_title` | string | The title of the game. |
| `session.game_slug` | string | The URL slug of the game. |
| `player.id` | UUID | The player's unique identifier. |
| `player.name` | string | The player's full display name. |
| `player.username` | string | The player's username handle. |
| `player.avatar` | string (URL) | The URL pointing to the player's profile avatar. |

```json
{
  "success": true,
  "session": {
    "id": "4a71efc5-e51c-4df0-948f-3df1383bc123",
    "mode": "tournament",
    "status": "live",
    "game_title": "[[ GAME_TITLE ]]",
    "game_slug": "[[ GAME_SLUG ]]"
  },
  "player": {
    "id": "e6741ab0-8800-47b8-b805-4ea583a45678",
    "name": "Jane Doe",
    "username": "janedoe",
    "avatar": "https://example.com/avatars/jane.png"
  }
}
```

---

## 2. Submit Score

When a gameplay session ends, the game's backend must securely transmit the player's final score to the portal. This call must be made server-to-server to prevent client-side score spoofing.

### Request
* **Endpoint:** `POST /api/game/match/complete`
* **Headers:**

| Header | Value | Description |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | Required request format. |
| `X-Portal-Signature` | `string (Hex)` | HMAC-SHA256 signature of the raw request body, signed using your game's private `webhook_secret`. |

* **Request Body Payload:**

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `sessionId` | UUID | Yes | The session ID (the same value extracted as `sessionId` from the URL parameters). |
| `score` | integer | Yes | The player's final score achieved during the session. Negative values are not permitted. |

```json
{
  "sessionId": "4a71efc5-e51c-4df0-948f-3df1383bc123",
  "score": 10500
}
```

### Signature Computation
To prevent tampering, the portal validates the payload using the `X-Portal-Signature` header. You must generate this signature using the HMAC-SHA256 algorithm with your private `webhook_secret` key.

#### Signature Code Example (Node.js)
```javascript
const crypto = require('crypto');

const secret = "[[ WEBHOOK_SECRET ]]"; 
const body = JSON.stringify({
  sessionId: "4a71efc5-e51c-4df0-948f-3df1383bc123",
  score: 10500
});

const signature = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

// Set headers['X-Portal-Signature'] = signature;
```

#### Signature Code Example (Python)
```python
import hmac
import hashlib
import json

secret = b"[[ WEBHOOK_SECRET ]]"
payload = {
    "sessionId": "4a71efc5-e51c-4df0-948f-3df1383bc123",
    "score": 10500
}
body = json.dumps(payload, separators=(',', ':')).encode('utf-8')

signature = hmac.new(secret, body, hashlib.sha256).hexdigest()
# Pass in headers: {"X-Portal-Signature": signature}
```

### Response

The portal returns a JSON response indicating the submission status and player high score feedback.

* **Response Format (200 OK):**

| Field | Type | Description |
| :--- | :--- | :--- |
| `success` | boolean | Confirms receipt and validation of the score. |
| `message` | string | Informational status message. |
| `is_personal_best` | boolean | `true` if this score is a new high score for the user in this tournament; otherwise `false`. |
| `best_score` | integer | The player's current best score in this tournament after processing this submission. |

```json
{
  "success": true,
  "message": "Score submitted successfully",
  "is_personal_best": true,
  "best_score": 10500
}
```

> [!NOTE]
> **Idempotency Guard:** If a score has already been submitted for a session, the endpoint will ignore subsequent requests and return the success message along with the original `is_personal_best` and `best_score` values from the first submission.

---

## 3. Real-Time UI Updates (Optional but Recommended)

While the portal page automatically listens for database status updates, you can make the transition back to the game over screen instantaneous for the user by posting a message directly to the parent portal window when the match completes.

This bypasses any database latency and displays the results screen instantly.

### Implementation Example (HTML5 JavaScript)
Trigger this message immediately after successfully dispatching your score submission call to the backend:

```javascript
window.parent.postMessage({
  type: "MATCH_COMPLETE",
  score: 10500 // The final score achieved by the player
}, "*");
```

### Implementation Example (Unity C#)
In Unity WebGL, you can call this via a JavaScript plugin or directly using `Application.ExternalCall` / `jslib`:

```csharp
// In your JS library (.jslib)
mergeInto(LibraryManager.library, {
    NotifyPortalMatchComplete: function (score) {
        window.parent.postMessage(JSON.stringify({
            type: "MATCH_COMPLETE",
            score: score
        }), "*");
    }
});
```

---

## 4. What NOT to Build

To minimize duplicate work and maintain layout consistency across the platform, developers must follow these development rules:
1. **No Profile Systems:** Do not request, save, or store usernames, avatars, email addresses, or password credentials.
2. **No High Score Tables:** Do not build a local database or dashboard showing high scores. The portal maintains and displays all high scores automatically.
3. **No Leaderboard UI:** Do not design leaderboard pages, podiums, or player rank listings inside your game engine. The portal embeds a beautiful, real-time leaderboard alongside your game iframe. 
4. **No Read-Only Leaderboard API Integrations:** If your game design requires displaying leaderboard values directly in-game (e.g., a "Current Champion" display), please **request authorization** from the portal team before building custom integrations rather than assuming API access is open.

---

## 5. Per-Game Credentials Placeholder

*This section will be manually configured by the portal administrator before this document is dispatched to your team:*

* **Game Slug:** `[[ GAME_SLUG ]]`
* **Game Title:** `[[ GAME_TITLE ]]`
* **Private Webhook Secret:** `[[ WEBHOOK_SECRET ]]`

---

> [!CAUTION]
> Your `webhook_secret` is a private signing key. Keep it secure and never commit it to public code repositories or expose it client-side.

---

## 6. FAQ & Developer Reference

### Q: How does player identity work?
**A:** Player identity is managed entirely by the MagicGames Portal using Supabase Auth. The game retrieves user identities on load via `/api/game/init` and never interacts with player credentials or registration forms directly.

### Q: Do we need to build our own session/token validation system?
**A:** No. The portal handles session validation on its own server. The portal signs and issues the session ID, and the database RPC validates score submissions. You only need to verify that you are communicating the correct session ID.

### Q: How do daily or weekly high score resets work?
**A:** Resets do not occur on a standard daily or weekly timer. Instead, they are bounded by individual Tournament timelines. When a tournament ends, its leaderboard freezes, and a new tournament is created with a clean leaderboard. The game does not need to handle reset logic.

### Q: Where do player display names come from?
**A:** Display names are retrieved from the portal's user profile database. If a user changes their display name or avatar on their portal profile settings page, the changes will automatically propagate to the game's next `/init` call.
