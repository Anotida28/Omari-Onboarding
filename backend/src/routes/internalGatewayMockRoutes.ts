import { Router } from "express";
import {
  findInternalGatewayMockUser,
  getInternalGatewayMockUsers,
  mapInternalGatewayMockUserProfile
} from "../lib/internalGateway";

const router = Router();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeUsername = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const getCredentials = (
  payload: unknown
): {
  username: string | null;
  password: string | null;
} => {
  const nestedData =
    isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

  if (!isRecord(nestedData)) {
    return {
      username: null,
      password: null
    };
  }

  return {
    username: normalizeUsername(nestedData.username),
    password: typeof nestedData.password === "string" ? nestedData.password : null
  };
};

router.get("/users", (_req, res) => {
  res.status(200).json({
    users: getInternalGatewayMockUsers().map((user) =>
      mapInternalGatewayMockUserProfile(user)
    )
  });
});

router.post("/authenticate", (req, res) => {
  const { username, password } = getCredentials(req.body);

  if (!username || !password) {
    res.status(400).json({
      success: false,
      message: "username and password are required."
    });
    return;
  }

  const user = findInternalGatewayMockUser(username);

  if (!user || user.password !== password) {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: "Invalid internal login credentials."
    });
    return;
  }

  res.status(200).json({
    success: true,
    authenticated: true,
    user: mapInternalGatewayMockUserProfile(user)
  });
});

router.post("/access/:username", (req, res) => {
  const username =
    normalizeUsername(req.params.username) ||
    normalizeUsername(isRecord(req.body) ? req.body.username : null);

  if (!username) {
    res.status(400).json({
      success: false,
      message: "username is required."
    });
    return;
  }

  const user = findInternalGatewayMockUser(username);

  if (!user || !user.hasPortalAccess) {
    res.status(403).json({
      success: false,
      allowed: false,
      message: "You do not have access to the Omari internal portal."
    });
    return;
  }

  res.status(200).json({
    success: true,
    allowed: true,
    user: mapInternalGatewayMockUserProfile(user)
  });
});

export default router;
