# MagicGames Portal - Integration API v1.0

This document outlines the API endpoints used to bridge the MagicGames Portal with external game engines running in an Iframe.

## 📡 Base URL
The API is available at: `https://your-portal-domain.com/api/game`

---

## 1️⃣ Initialization (GET /init)
**Description:** Fetches player profiles, stakes, and room rules. Should be called as soon as the game loads.

### Request
`GET /api/game/init?roomId={roomId}`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomId`  | UUID | Yes      | Extracted from the URL query params |

### Response (200 OK)
```json
{
  "success": true,
  "room": {
    "id": "132a5a86-ef81-4488-9730-006ec997046a",
    "name": "Deathmatch Alpha",
    "stake_amount": 100.00,
    "payout_type": "winner_takes_all",
    "payout_config": { "1": 100 },
    "status": "live"
  },
  "players": [
    {
      "id": "user_id_1",
      "name": "John Doe",
      "username": "johnd",
      "avatar": "https://..."
    },
    {
      "id": "user_id_2",
      "name": "Jane Smith",
      "username": "janes",
      "avatar": "https://..."
    }
  ]
}
```

---

## 2️⃣ Match Completion (POST /match/complete)
**Description:** Submits the final results of the match. Triggers automatic coin distribution and resets the room to 'Lobby' mode.

### Request
`POST /api/game/match/complete`

**Body:**
```json
{
  "roomId": "UUID",
  "results": [
    {
      "userId": "UUID",
      "rank": 1,
      "score": 2500
    },
    {
      "userId": "UUID",
      "rank": 2,
      "score": 1800
    }
  ]
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Match results processed and payouts distributed",
  "data": {
    "total_pot": 200,
    "platform_fee": 10,
    "net_pot": 190,
    "status": "reset_to_open"
  }
}
```

---

## 🛠️ Developer Checklist
1. **URL Params**: Ensure the game captures the `roomId` from the browser's URL location.
2. **Rankings**: Ranks must be integers starting from `1`.
3. **Rematch**: After calling `match/complete`, the Portal UI will eventually flip back to the Lobby. The game should provide a clean exit or result screen.
