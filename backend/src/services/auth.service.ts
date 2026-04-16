import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";

export async function createUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error("An account with this email already exists.");
    (error as Error & { status?: number }).status = StatusCodes.CONFLICT;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash
    }
  });

  return user;
}

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}
