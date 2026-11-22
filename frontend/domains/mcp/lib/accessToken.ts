import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * True only when `authorization` is `Bearer <expected>`. Hashing both sides first gives
 * equal-length buffers, so the comparison takes the same time whatever the input.
 * An unset or empty `expected` never matches: the endpoint stays closed by default.
 */
export function isValidBearer(authorization: string | null, expected: string | undefined): boolean {
  if (!expected || !authorization) return false;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match) return false;
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(match[1]), digest(expected));
}
