import { createHmac, timingSafeEqual } from 'crypto';

// Paddle signs webhooks with `Paddle-Signature: ts=<unix>;h1=<hex hmac>` where
// the HMAC-SHA256 (keyed by the destination's secret) covers `${ts}:${rawBody}`.
// https://developer.paddle.com/webhooks/signature-verification

const MAX_AGE_SECONDS = 300; // reject replays older than 5 minutes

export function verifyPaddleSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader) return false;

  const parts = new Map<string, string>();
  for (const pair of signatureHeader.split(';')) {
    const eq = pair.indexOf('=');
    if (eq > 0) parts.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  const ts = parts.get('ts');
  const h1 = parts.get('h1');
  if (!ts || !h1) return false;

  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;

  const digest = createHmac('sha256', secret).update(`${ts}:`).update(rawBody).digest('hex');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(h1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
