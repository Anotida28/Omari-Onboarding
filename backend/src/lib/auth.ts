import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import type { CookieOptions } from "express";
import { promisify } from "util";
import {
  AUTH_COOKIE_NAME,
  PASSWORD_MIN_LENGTH,
  SESSION_DURATION_MS
} from "../constants/auth";

const scrypt = promisify(scryptCallback);

const SCRYPT_KEY_LENGTH = 64;
const PASSWORD_HASH_PREFIX = "scrypt";

export const normalizeEmailAddress = (value: string): string =>
  value.trim().toLowerCase();

export const normalizeMobileNumber = (value: string): string => {
  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/[^\d]/g, "");

  if (!digitsOnly) {
    return "";
  }

  return trimmed.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
};

export const validatePasswordStrength = (value: string): void => {
  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
    );
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  validatePasswordStrength(password);

  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(
    password,
    salt,
    SCRYPT_KEY_LENGTH
  )) as Buffer;

  return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString("hex")}`;
};

export const verifyPassword = async (
  password: string,
  storedHash: string
): Promise<boolean> => {
  const [prefix, salt, derivedKeyHex] = storedHash.split(":");

  if (!prefix || !salt || !derivedKeyHex || prefix !== PASSWORD_HASH_PREFIX) {
    return false;
  }

  const expectedDerivedKey = Buffer.from(derivedKeyHex, "hex");
  const computedDerivedKey = (await scrypt(
    password,
    salt,
    expectedDerivedKey.length
  )) as Buffer;

  if (expectedDerivedKey.length !== computedDerivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedDerivedKey, computedDerivedKey);
};

export const hashOpaqueToken = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const createOpaqueSessionToken = (): {
  token: string;
  tokenHash: string;
} => {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashOpaqueToken(token)
  };
};

export const getSessionExpiry = (): Date =>
  new Date(Date.now() + SESSION_DURATION_MS);

export const parseCookieHeader = (
  cookieHeader: string | undefined
): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();

      if (!key) {
        return cookies;
      }

      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
};

export const getSessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_DURATION_MS,
  path: "/"
});

export const getSessionCookieName = (): string => AUTH_COOKIE_NAME;
