# Magic Games API Integration Guide

This guide explains how to integrate **Magic Games** into your platform using our secure Game Distribution API.

## Authenticating

All API requests must include your unique **API Key** in the header.

**Header Name:** `x-api-key`
**Value:** `mk_live_...` (Your secure key)

> **Note:** Keep your API Key secure. Do not share it publicly.

---

## 1. Get Games List

Retrieve a list of games available to your account.

**Endpoint:** `GET https://your-domain.com/api/v1/games`

### Example Request (cURL)

```bash
curl -X GET https://your-domain.com/api/v1/games \
  -H "x-api-key: mk_live_a1b2c3d4e5f6..."
```

### Example Request (Javascript / Fetch)

```javascript
const response = await fetch('https://your-domain.com/api/v1/games', {
    method: 'GET',
    headers: {
        'x-api-key': 'mk_live_a1b2c3d4e5f6...'
    }
});

const data = await response.json();
console.log(data);
```

---

## Response Structure

The API returns a JSON object containing the `owner` name and an array of `games`.

```json
{
  "owner": "Ludo Portal Inc",
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Cosmic Ludo",
      "description": "A classic board game with a space twist.",
      "thumbnail_url": "https://.../ludo-thumb.jpg",
      "game_url": "https://ludo-game.vercel.app/",
      "slug": "cosmic-ludo",
      "version": "1.0.2",
      "created_at": "2023-10-27T10:00:00Z"
    }
  ]
}
```

---

## 2. Displaying the Game

Since `iframe` embedding can carry security risks (like clickjacking) and mobile responsiveness issues, we recommend the following secure integration methods:

### Method 1: Direct Link (New Tab) - **Recommended**

The simplest and most secure way is to open the game in a new browser tab. This ensures the game runs in its own isolated environment with full performance.

```html
<a href="https://ludo-game.vercel.app/" target="_blank" rel="noopener noreferrer">
    <button>Play Cosmic Ludo</button>
</a>
```

> **Security Note:** Always use `rel="noopener noreferrer"` when opening external links to prevent the new page from accessing your window object.

### Method 2: Dedicated Popup Window

For a more immersive experience that feels like an "app" within your site, use a Javascript popup. this keeps the user focused but maintains security isolation.

```javascript
function playGame(gameUrl) {
    const width = 1280;
    const height = 720;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    window.open(
        gameUrl,
        'MagicGameWindow',
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
    );
}

// Usage
// <button onclick="playGame('https://ludo-game.vercel.app/')">Play Now</button>
```

---

## Errors

| Status Code | Description |
| :--- | :--- |
| `200` | Success |
| `401` | Missing API Key |
| `403` | Invalid or Inactive API Key |
| `500` | Server Error |
