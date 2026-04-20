import type { AuthenticatedUser } from "./auth";

declare global {
  namespace Express {
    interface Request {
      currentUser?: AuthenticatedUser | null;
      sessionToken?: string | null;
    }
  }
}

export {};
