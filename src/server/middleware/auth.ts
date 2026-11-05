/**
 * auth.ts
 *
 * Cryptographic Bearer token signing, verification, and authentication middleware
 * for Safeguard REST API endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface SessionTokenPayload {
  address: string;
  iat: number;
  exp: number;
}

const DEFAULT_SECRET = process.env.API_SECRET_KEY || process.env.SERVER_SIGNING_KEY || 'safeguard-auth-session-key-v1';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function signSessionToken(
  address: string,
  secret: string = DEFAULT_SECRET,
  expiresInSeconds: number = 86400
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionTokenPayload = {
    address,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string = DEFAULT_SECRET
): { valid: boolean; address?: string; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid cryptographic signature' };
    }

    const payload: SessionTokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: 'Token has expired' };
    }

    return { valid: true, address: payload.address };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification failed' };
  }
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  secret?: string;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  const secret = options.secret || DEFAULT_SECRET;
  const isStrict = options.requireAuth ?? (process.env.REQUIRE_AUTH === 'true');

  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string | undefined;

    // Direct API key check (for automated server-to-server integrations)
    if (apiKey && process.env.API_SECRET_KEY && apiKey === process.env.API_SECRET_KEY) {
      (req as any).authenticatedAddress = 'api_key_service';
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isStrict) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: missing or invalid Bearer Authorization header',
        });
        return;
      }
      return next();
    }

    const token = authHeader.substring(7).trim();
    const result = verifySessionToken(token, secret);

    if (!result.valid) {
      if (isStrict) {
        res.status(401).json({
          success: false,
          error: `Unauthorized: ${result.error}`,
        });
        return;
      }
      return next();
    }

    (req as any).authenticatedAddress = result.address;
    next();
  };
}
