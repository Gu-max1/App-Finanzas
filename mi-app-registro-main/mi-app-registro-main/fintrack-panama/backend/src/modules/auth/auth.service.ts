import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { AppError } from '@middleware/errorHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
} from '@utils/jwt';
import { BCRYPT_SALT_ROUNDS } from '@config/constants';
import type { RegisterInput, LoginInput } from './auth.schema';

const prisma = new PrismaClient();

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function registerUser(input: RegisterInput): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const tokens = await createTokenPair(user.id);
  return { user, tokens };
}

export async function loginUser(input: LoginInput): Promise<{ user: UserPublic; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, firstName: true, lastName: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const tokens = await createTokenPair(user.id);
  const { passwordHash: _, ...userPublic } = user;
  return { user: userPublic, tokens };
}

export async function refreshTokens(token: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(token);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Rotate token: revoke old, create new
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  return createTokenPair(payload.userId);
}

export async function logoutUser(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

export async function getProfile(userId: string): Promise<UserPublic> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
}

async function createTokenPair(userId: string): Promise<AuthTokens> {
  // Create refresh token record
  const tokenRecord = await prisma.refreshToken.create({
    data: {
      userId,
      token: '', // placeholder
      expiresAt: getRefreshTokenExpiryDate(),
    },
  });

  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId, tokenRecord.id);

  // Update with actual token value
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { token: refreshToken },
  });

  return { accessToken, refreshToken };
}
