import crypto from "node:crypto";
import type { Response } from "express";
import { env, isProduction } from "../config/env.js";
import { signAccessToken, signRefreshToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";

const ACCESS_COOKIE_NAME = "accessToken";
const REFRESH_COOKIE_NAME = "refreshToken";
const CSRF_COOKIE_NAME = "csrfToken";
const REFRESH_COOKIE_PATH = "/api/auth";

type AuthUser = {
  id: string;
  email: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type CSRFTokens = {
  token: string;
  hash: string;
};

function parseExpiryToMs(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return amount * multipliers[unit];
}

/**
 * Generate CSRF token pair: token (sent to client) + hash (stored in cookie)
 * Double-submit pattern: client must send token in X-CSRF-Token header
 * Protects against CSRF when SameSite=None is required for cross-origin requests
 */
export function generateCSRFTokens(): CSRFTokens {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

/**
 * Verify CSRF token: validate submitted token against hash in cookie
 */
export function verifyCSRFToken(submittedToken: string, tokenHash: string): boolean {
  const submittedHash = crypto.createHash("sha256").update(submittedToken).digest("hex");
  // Use constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(submittedHash),
    Buffer.from(tokenHash)
  );
}

export function setCSRFCookie(response: Response, tokenHash: string) {
  // Regular (not HttpOnly) cookie so frontend can read it for the header
  response.cookie(CSRF_COOKIE_NAME, tokenHash, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
}

export function getCSRFTokenHashFromCookies(cookies: Record<string, unknown>) {
  const hash = cookies[CSRF_COOKIE_NAME];
  return typeof hash === "string" ? hash : null;
}

export function getRefreshTokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiryDate() {
  return new Date(Date.now() + parseExpiryToMs(env.REFRESH_TOKEN_EXPIRY));
}

export function setRefreshCookie(response: Response, token: string) {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: parseExpiryToMs(env.REFRESH_TOKEN_EXPIRY),
    path: REFRESH_COOKIE_PATH
  });
}

export function clearRefreshCookie(response: Response) {
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: REFRESH_COOKIE_PATH
  });
}

export function getRefreshTokenFromCookies(cookies: Record<string, unknown>) {
  const token = cookies[REFRESH_COOKIE_NAME];
  return typeof token === "string" ? token : null;
}

export function setAccessCookie(response: Response, token: string) {
  response.cookie(ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: parseExpiryToMs(env.ACCESS_TOKEN_EXPIRY),
    path: "/api"
  });
}

export function clearAccessCookie(response: Response) {
  response.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api"
  });
}

export function getAccessTokenFromCookies(cookies: Record<string, unknown>) {
  const token = cookies[ACCESS_COOKIE_NAME];
  return typeof token === "string" ? token : null;
}

export function createTokenPair(user: AuthUser): AuthTokens {
  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email }),
    refreshToken: signRefreshToken({ sub: user.id, email: user.email })
  };
}

export async function storeRefreshToken(userId: string, refreshToken: string) {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: getRefreshTokenHash(refreshToken),
      expiresAt: getRefreshTokenExpiryDate()
    }
  });
}

export async function rotateRefreshToken(user: AuthUser, currentRefreshToken: string) {
  const currentTokenHash = getRefreshTokenHash(currentRefreshToken);
  const nextTokens = createTokenPair(user);
  const nextTokenHash = getRefreshTokenHash(nextTokens.refreshToken);

  const activeToken = await prisma.refreshToken.findFirst({
    where: {
      userId: user.id,
      tokenHash: currentTokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!activeToken) {
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return null;
  }

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: activeToken.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: nextTokenHash
      }
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: nextTokenHash,
        expiresAt: getRefreshTokenExpiryDate()
      }
    })
  ]);

  return nextTokens;
}

export async function revokeRefreshToken(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash: getRefreshTokenHash(refreshToken),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}
