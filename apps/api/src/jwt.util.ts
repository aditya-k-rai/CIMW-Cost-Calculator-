import * as crypto from "crypto";

export function signJwt(payload: any, secret: string, expiresInMinutes = 1440): string {
  const header = { alg: "HS256", typ: "JWT" };
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");

  const exp = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
  const body = { ...payload, exp };
  const base64Body = Buffer.from(JSON.stringify(body)).toString("base64url");

  const signatureInput = `${base64Header}.${base64Body}`;
  const signature = crypto.createHmac("sha256", secret).update(signatureInput).digest("base64url");

  return `${signatureInput}.${signature}`;
}

export function verifyJwt<T>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const signatureInput = `${header}.${body}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(signatureInput).digest("base64url");

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload as T;
  } catch {
    return null;
  }
}
