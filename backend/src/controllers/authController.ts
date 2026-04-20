import type { Request, Response } from "express";
import { getSessionCookieName, getSessionCookieOptions } from "../lib/auth";
import {
  changePassword,
  loginUser,
  logoutSession,
  registerApplicant,
  updateProfile
} from "../services/authService";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getAuthErrorStatusCode = (error: unknown): number => {
  if (!(error instanceof Error)) {
    return 500;
  }

  if (
    error.message.includes("already in use") ||
    error.message.includes("already exists")
  ) {
    return 409;
  }

  if (
    error.message.includes("required") ||
    error.message.includes("valid") ||
    error.message.includes("Password must") ||
    error.message.includes("incorrect") ||
    error.message.includes("different from")
  ) {
    return 400;
  }

  if (
    error.message.includes("Invalid login credentials") ||
    error.message.includes("not active")
  ) {
    return 401;
  }

  return 500;
};

const sendAuthError = (
  res: Response,
  error: unknown,
  fallbackMessage: string
): void => {
  if (error instanceof Error) {
    res.status(getAuthErrorStatusCode(error)).json({
      message: error.message
    });
    return;
  }

  res.status(500).json({
    message: fallbackMessage
  });
};

const setSessionCookie = (res: Response, sessionToken: string): void => {
  res.cookie(getSessionCookieName(), sessionToken, getSessionCookieOptions());
};

const clearSessionCookie = (res: Response): void => {
  const { maxAge: _maxAge, ...cookieOptions } = getSessionCookieOptions();
  res.clearCookie(getSessionCookieName(), cookieOptions);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const {
    fullName,
    organizationName,
    mobileNumber,
    email,
    password
  } = req.body as Record<string, unknown>;

  if (
    !isNonEmptyString(fullName) ||
    !isNonEmptyString(organizationName) ||
    !isNonEmptyString(mobileNumber) ||
    !isNonEmptyString(password)
  ) {
    res.status(400).json({
      message:
        "fullName, organizationName, mobileNumber, and password are required."
    });
    return;
  }

  try {
    const response = await registerApplicant(
      {
        fullName,
        organizationName,
        mobileNumber,
        email: isNonEmptyString(email) ? email : undefined,
        password
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined
      }
    );

    setSessionCookie(res, response.sessionToken);
    res.status(201).json({
      user: response.user
    });
  } catch (error) {
    console.error("Failed to register applicant.", error);
    sendAuthError(res, error, "Failed to register applicant.");
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { identifier, password } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(identifier) || !isNonEmptyString(password)) {
    res.status(400).json({
      message: "identifier and password are required."
    });
    return;
  }

  try {
    const response = await loginUser(
      {
        identifier,
        password
      },
      {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || undefined
      }
    );

    setSessionCookie(res, response.sessionToken);
    res.status(200).json({
      user: response.user
    });
  } catch (error) {
    console.error("Failed to log in.", error);
    sendAuthError(res, error, "Failed to log in.");
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.sessionToken) {
      await logoutSession(req.sessionToken);
    }

    clearSessionCookie(res);
    res.status(200).json({
      message: "Logged out successfully."
    });
  } catch (error) {
    console.error("Failed to log out.", error);
    sendAuthError(res, error, "Failed to log out.");
  }
};

export const me = (req: Request, res: Response): void => {
  res.status(200).json({
    user: req.currentUser || null
  });
};

export const updateCurrentProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({
      message: "Authentication is required."
    });
    return;
  }

  const {
    fullName,
    mobileNumber,
    email,
    organizationName,
    tradingName
  } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(fullName) || !isNonEmptyString(mobileNumber)) {
    res.status(400).json({
      message: "fullName and mobileNumber are required."
    });
    return;
  }

  try {
    const user = await updateProfile(req.currentUser.id, {
      fullName,
      mobileNumber,
      email: isNonEmptyString(email) ? email : null,
      organizationName: isNonEmptyString(organizationName)
        ? organizationName
        : undefined,
      tradingName: isNonEmptyString(tradingName) ? tradingName : null
    });

    res.status(200).json({
      user
    });
  } catch (error) {
    console.error("Failed to update profile.", error);
    sendAuthError(res, error, "Failed to update profile.");
  }
};

export const updateCurrentPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!req.currentUser) {
    res.status(401).json({
      message: "Authentication is required."
    });
    return;
  }

  const { currentPassword, newPassword } = req.body as Record<string, unknown>;

  if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
    res.status(400).json({
      message: "currentPassword and newPassword are required."
    });
    return;
  }

  try {
    await changePassword(
      req.currentUser.id,
      {
        currentPassword,
        newPassword
      },
      req.sessionToken || undefined
    );

    res.status(200).json({
      message: "Password changed successfully."
    });
  } catch (error) {
    console.error("Failed to change password.", error);
    sendAuthError(res, error, "Failed to change password.");
  }
};
