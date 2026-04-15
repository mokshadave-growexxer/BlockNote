import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { verifyRefreshToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { createUser, validateUser } from "../services/auth.service.js";
import {
  clearRefreshCookie,
  createTokenPair,
  getRefreshTokenFromCookies,
  rotateRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  storeRefreshToken
} from "../services/token.service.js";

const authSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/\d/, "Password must contain at least one number.")
});

function buildAuthResponse(user: { id: string; email: string }, accessToken: string) {
  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email
    }
  };
}

export async function register(request: Request, response: Response) {
  const payload = authSchema.parse(request.body);
  const user = await createUser(payload.email, payload.password);
  const tokens = createTokenPair(user);

  await storeRefreshToken(user.id, tokens.refreshToken);
  setRefreshCookie(response, tokens.refreshToken);
  response.status(StatusCodes.CREATED).json(buildAuthResponse(user, tokens.accessToken));
}

export async function login(request: Request, response: Response) {
  const payload = authSchema.parse(request.body);
  const user = await validateUser(payload.email, payload.password);

  if (!user) {
    response.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid email or password." });
    return;
  }

  const tokens = createTokenPair(user);
  await storeRefreshToken(user.id, tokens.refreshToken);
  setRefreshCookie(response, tokens.refreshToken);
  response.status(StatusCodes.OK).json(buildAuthResponse(user, tokens.accessToken));
}

export async function refresh(request: Request, response: Response) {
  const refreshToken = getRefreshTokenFromCookies(request.cookies);

  if (!refreshToken) {
    response.status(StatusCodes.UNAUTHORIZED).json({ message: "Refresh token missing." });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true }
    });

    if (!user) {
      clearRefreshCookie(response);
      response.status(StatusCodes.UNAUTHORIZED).json({ message: "User not found." });
      return;
    }

    const tokens = await rotateRefreshToken(user, refreshToken);
    if (!tokens) {
      clearRefreshCookie(response);
      response.status(StatusCodes.UNAUTHORIZED).json({ message: "Refresh token revoked." });
      return;
    }

    setRefreshCookie(response, tokens.refreshToken);
    response.status(StatusCodes.OK).json(buildAuthResponse(user, tokens.accessToken));
  } catch {
    clearRefreshCookie(response);
    response.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid or expired refresh token." });
  }
}

export async function logout(request: Request, response: Response) {
  const refreshToken = getRefreshTokenFromCookies(request.cookies);
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  clearRefreshCookie(response);
  response.status(StatusCodes.OK).json({ message: "Logged out." });
}

export async function me(request: Request, response: Response) {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: { id: true, email: true }
  });

  if (!user) {
    response.status(StatusCodes.NOT_FOUND).json({ message: "User not found." });
    return;
  }

  response.status(StatusCodes.OK).json({ user });
}
