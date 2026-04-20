import type { NextFunction, Request, Response } from "express";
import { USER_ROLES } from "../constants/application";
import {
  getSessionCookieName,
  parseCookieHeader
} from "../lib/auth";
import { getCurrentUserFromSessionToken } from "../services/authService";

const getSessionTokenFromRequest = (req: Request): string | null => {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[getSessionCookieName()] || null;
};

export const attachCurrentUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const sessionToken = getSessionTokenFromRequest(req);

  req.sessionToken = sessionToken;

  if (!sessionToken) {
    req.currentUser = null;
    next();
    return;
  }

  try {
    req.currentUser = await getCurrentUserFromSessionToken(sessionToken);
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.currentUser) {
    res.status(401).json({
      message: "Authentication is required."
    });
    return;
  }

  next();
};

export const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({
        message: "Authentication is required."
      });
      return;
    }

    if (!roles.includes(req.currentUser.role)) {
      res.status(403).json({
        message: "You do not have permission to perform this action."
      });
      return;
    }

    next();
  };

export const requireApplicant = requireRole(USER_ROLES.applicant);
export const requireAdmin = requireRole(USER_ROLES.admin);
