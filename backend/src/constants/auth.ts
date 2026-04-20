export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "omari_session";

export const SESSION_DURATION_DAYS = Math.max(
  1,
  Number(process.env.SESSION_DURATION_DAYS || 7)
);

export const SESSION_DURATION_MS =
  SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

export const PASSWORD_MIN_LENGTH = 8;
