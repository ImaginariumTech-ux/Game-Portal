import crypto from "crypto";

const JWT_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret-for-signing-tokens-12345";

export function signSessionToken(payload: {
    user_id: string;
    game_id: string;
    session_id: string;
}): string {
    const header = { alg: "HS256", typ: "JWT" };
    // Set expiration to 1 hour from now (3600 seconds)
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const fullPayload = { ...payload, exp };

    const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
    const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

    const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${base64Header}.${base64Payload}`)
        .digest("base64url");

    return `${base64Header}.${base64Payload}.${signature}`;
}

export function verifySessionToken(token: string): {
    user_id: string;
    game_id: string;
    session_id: string;
    exp: number;
} | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const [base64Header, base64Payload, signature] = parts;
        const expectedSignature = crypto
            .createHmac("sha256", JWT_SECRET)
            .update(`${base64Header}.${base64Payload}`)
            .digest("base64url");

        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"));
        
        // Verify expiry
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            return null;
        }

        return payload;
    } catch (e) {
        return null;
    }
}
