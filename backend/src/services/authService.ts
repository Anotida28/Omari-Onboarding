import { Prisma } from "@prisma/client";
import { USER_ROLES } from "../constants/application";
import {
  createOpaqueSessionToken,
  getSessionExpiry,
  hashOpaqueToken,
  hashPassword,
  normalizeEmailAddress,
  normalizeMobileNumber,
  verifyPassword
} from "../lib/auth";
import {
  resolveInternalAccessGatewayBaseUrl,
  resolveInternalAuthGatewayUrl
} from "../lib/internalGateway";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";

type PrismaWriteClient = Prisma.TransactionClient | typeof prisma;

interface AuthContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface RegisterApplicantPayload {
  fullName: string;
  organizationName: string;
  mobileNumber: string;
  email?: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface InternalLoginPayload {
  username: string;
  password: string;
}

export interface CreateAdminPayload {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  username?: string;
  authSource?: string;
}

export interface PrepareInternalAdminPayload {
  email?: string;
  userId?: string;
  username: string;
  authSource?: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  organizationName?: string;
  tradingName?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

interface AuthResponse {
  user: AuthenticatedUser;
  sessionToken: string;
}

interface MappedUserShape {
  id: string;
  fullName: string;
  email: string | null;
  mobileNumber: string;
  passwordHash: string;
  role: string;
  status: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  preferredOtpChannel: string | null;
  organizationOwner?: {
    id: string;
    legalName: string;
    tradingName: string | null;
    entityType: string;
  } | null;
  internalIdentity?: {
    username: string;
    authSource: string;
    displayName: string | null;
    workEmail: string | null;
    workMobileNumber: string | null;
    accessProfile: string | null;
  } | null;
}

interface GatewayHttpResponse {
  response: Response;
  payload: unknown;
}

interface InternalGatewayProfile {
  fullName: string | null;
  email: string | null;
  mobileNumber: string | null;
  accessProfile: string | null;
  externalReference: string | null;
  authPayload: unknown;
  accessPayload: unknown;
}

const INTERNAL_AUTH_SOURCE_GATEWAY = "gateway";
const INTERNAL_AUTH_SOURCE_BREAK_GLASS = "break_glass";
const EXTERNAL_AUTH_ONLY_PASSWORD_HASH = "external-auth-only";
const DEFAULT_INTERNAL_AUTH_TIMEOUT_MS = 10000;
const DEFAULT_INTERNAL_ACCESS_TIMEOUT_MS = 10000;

const normalizeRequiredString = (value: string, fieldLabel: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
};

const normalizeOptionalString = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
};

const normalizeOptionalEmail = (value?: string | null): string | null => {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalizeEmailAddress(normalized) : null;
};

const normalizeOptionalGatewayMobile = (value?: string | null): string | null => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  const digitCount = normalized.replace(/\D/g, "").length;
  return digitCount > 0 ? normalized : null;
};

const normalizeRequiredMobile = (value: string): string => {
  const normalized = normalizeMobileNumber(value);

  if (normalized.length < 8) {
    throw new Error("A valid mobile number is required.");
  }

  return normalized;
};

const normalizeRequiredUsername = (value: string): string =>
  normalizeRequiredString(value, "Username").toLowerCase();

const getSyntheticInternalMobileNumber = (username: string): string =>
  `internal:${username}`.slice(0, 50);

const isSyntheticInternalMobileNumber = (value: string): boolean =>
  value.startsWith("internal:");

const getUserInclude = () => ({
  organizationOwner: true,
  internalIdentity: true
});

const mapAuthenticatedUser = (user: MappedUserShape): AuthenticatedUser => {
  const isInternalUser = Boolean(user.internalIdentity) || user.role === USER_ROLES.admin;
  const authSource = user.internalIdentity?.authSource
    ? user.internalIdentity.authSource
    : user.role === USER_ROLES.applicant
      ? "applicant_local"
      : "local_admin";
  const resolvedEmail = user.internalIdentity?.workEmail || user.email;
  const resolvedMobileNumber = user.internalIdentity?.workMobileNumber
    ? normalizeOptionalString(user.internalIdentity.workMobileNumber)
    : isSyntheticInternalMobileNumber(user.mobileNumber)
      ? null
      : user.mobileNumber;
  const canUseLocalProfileControls = user.role === USER_ROLES.applicant;

  return {
    id: user.id,
    fullName:
      user.internalIdentity?.displayName ||
      user.fullName,
    email: resolvedEmail,
    mobileNumber: resolvedMobileNumber,
    username: user.internalIdentity?.username || null,
    role: user.role,
    status: user.status,
    mobileVerified: user.mobileVerified,
    emailVerified: user.emailVerified,
    isInternalUser,
    authSource,
    canChangePassword: canUseLocalProfileControls,
    canEditProfile: canUseLocalProfileControls,
    organization: user.organizationOwner
      ? {
          id: user.organizationOwner.id,
          legalName: user.organizationOwner.legalName,
          tradingName: user.organizationOwner.tradingName,
          entityType: user.organizationOwner.entityType
        }
      : null
  };
};

const ensureEmailNotTaken = async (
  client: PrismaWriteClient,
  email: string,
  excludeUserId?: string
): Promise<void> => {
  const existingUser = await client.user.findFirst({
    where: {
      email,
      ...(excludeUserId
        ? {
            id: {
              not: excludeUserId
            }
          }
        : {})
    }
  });

  if (existingUser) {
    throw new Error("That email address is already in use.");
  }
};

const ensureInternalUsernameNotTaken = async (
  client: PrismaWriteClient,
  username: string,
  excludeUserId?: string
): Promise<void> => {
  const existingIdentity = await client.internalUserIdentity.findUnique({
    where: {
      username
    }
  });

  if (existingIdentity && existingIdentity.userId !== excludeUserId) {
    throw new Error("That internal username is already in use.");
  }
};

const createSessionForUser = async (
  client: PrismaWriteClient,
  userId: string,
  context: AuthContext
): Promise<string> => {
  const { token, tokenHash } = createOpaqueSessionToken();

  await client.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt: getSessionExpiry(),
      ipAddress: context.ipAddress?.slice(0, 100) || null,
      userAgent: context.userAgent?.slice(0, 255) || null
    }
  });

  return token;
};

const getUserWithOrganization = async (
  client: PrismaWriteClient,
  userId: string
) =>
  client.user.findUnique({
    where: {
      id: userId
    },
    include: getUserInclude()
  });

const writeAuthAuditLog = async (
  client: PrismaWriteClient,
  payload: {
    actorUserId?: string | null;
    entityId: string;
    action: string;
    summary: string;
    details?: Record<string, unknown>;
  }
): Promise<void> => {
  await client.auditLog.create({
    data: {
      actorUserId: payload.actorUserId || null,
      entityType: "auth",
      entityId: payload.entityId,
      action: payload.action,
      summary: payload.summary,
      detailsJson: payload.details ? JSON.stringify(payload.details) : null
    }
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getNonEmptyRecordString = (
  record: Record<string, unknown>,
  keys: string[]
): string | null => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const collectCandidateRecords = (value: unknown, depth = 0): Record<string, unknown>[] => {
  if (depth > 3 || value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectCandidateRecords(item, depth + 1));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nestedKeys = [
    "data",
    "user",
    "users",
    "result",
    "results",
    "items",
    "members",
    "records",
    "profile"
  ];

  return [
    value,
    ...nestedKeys.flatMap((key) => collectCandidateRecords(value[key], depth + 1))
  ];
};

const getGatewayResponsePayload = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      raw: text
    };
  }
};

const parseTimeoutValue = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value || "", 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const postJsonWithTimeout = async (
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number
): Promise<GatewayHttpResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    return {
      response,
      payload: await getGatewayResponsePayload(response)
    };
  } finally {
    clearTimeout(timeout);
  }
};

const isSuccessfulGatewayAuthentication = (payload: unknown): boolean => {
  for (const record of collectCandidateRecords(payload)) {
    if (
      record.success === true ||
      record.authenticated === true ||
      record.ok === true
    ) {
      return true;
    }

    const status = getNonEmptyRecordString(record, ["status", "code"]);

    if (
      status &&
      ["success", "ok", "authenticated"].includes(status.toLowerCase())
    ) {
      return true;
    }
  }

  return false;
};

const payloadIncludesUsername = (value: unknown, username: string, depth = 0): boolean => {
  if (depth > 4 || value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === username;
  }

  if (Array.isArray(value)) {
    return value.some((item) => payloadIncludesUsername(item, username, depth + 1));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(([key, entryValue]) => {
    if (
      [
        "username",
        "userName",
        "login",
        "samAccountName",
        "email",
        "stuff_id",
        "staff_id",
        "employeeId",
        "employeeID"
      ].includes(key) &&
      typeof entryValue === "string"
    ) {
      return entryValue.trim().toLowerCase() === username;
    }

    return payloadIncludesUsername(entryValue, username, depth + 1);
  });
};

const hasInternalPortalAccess = (payload: unknown, username: string): boolean => {
  for (const record of collectCandidateRecords(payload)) {
    for (const key of ["allowed", "authorized", "hasAccess", "isAuthorized"]) {
      const value = record[key];

      if (typeof value === "boolean") {
        return value;
      }
    }
  }

  if (payloadIncludesUsername(payload, username)) {
    return true;
  }

  for (const record of collectCandidateRecords(payload)) {
    const status = getNonEmptyRecordString(record, ["status"]);
    const message = getNonEmptyRecordString(record, ["message", "detail"]);

    if (
      status?.toLowerCase() === "success" &&
      message &&
      /(authorized|allowed|access granted)/i.test(message)
    ) {
      return true;
    }
  }

  return false;
};

const extractInternalGatewayProfile = (
  payload: unknown
): Omit<InternalGatewayProfile, "authPayload" | "accessPayload"> => {
  const records = collectCandidateRecords(payload);
  let fullName: string | null = null;
  let email: string | null = null;
  let mobileNumber: string | null = null;
  let accessProfile: string | null = null;
  let externalReference: string | null = null;

  for (const record of records) {
    fullName =
      fullName ||
      getNonEmptyRecordString(record, [
        "fullName",
        "fullname",
        "displayName",
        "name",
        "userFullName"
      ]);
    email =
      email ||
      normalizeOptionalEmail(
        getNonEmptyRecordString(record, ["email", "mail", "userEmail"])
      );
    mobileNumber =
      mobileNumber ||
      normalizeOptionalGatewayMobile(
        getNonEmptyRecordString(record, [
          "mobileNumber",
          "mobile",
          "phoneNumber",
          "telephone",
          "phone"
        ])
      );
    accessProfile =
      accessProfile ||
      getNonEmptyRecordString(record, [
        "accessProfile",
        "profile",
        "accessLevel",
        "role"
      ]);
    externalReference =
      externalReference ||
      getNonEmptyRecordString(record, [
        "externalReference",
        "employeeNumber",
        "employeeId",
        "employeeID",
        "stuff_id",
        "staff_id",
        "userId"
      ]);
  }

  return {
    fullName,
    email,
    mobileNumber,
    accessProfile,
    externalReference
  };
};

const mergeGatewayProfiles = (
  authProfile: Omit<InternalGatewayProfile, "authPayload" | "accessPayload">,
  accessProfile: Omit<InternalGatewayProfile, "authPayload" | "accessPayload">,
  authPayload: unknown,
  accessPayload: unknown
): InternalGatewayProfile => ({
  fullName: authProfile.fullName || accessProfile.fullName,
  email: authProfile.email || accessProfile.email,
  mobileNumber: authProfile.mobileNumber || accessProfile.mobileNumber,
  accessProfile: accessProfile.accessProfile || authProfile.accessProfile,
  externalReference: authProfile.externalReference || accessProfile.externalReference,
  authPayload,
  accessPayload
});

const authenticateAgainstInternalGateway = async (
  username: string,
  password: string
): Promise<{
  payload: unknown;
  profile: Omit<InternalGatewayProfile, "authPayload" | "accessPayload">;
}> => {
  const authUrl = resolveInternalAuthGatewayUrl();

  if (!authUrl) {
    throw new Error(
      "Internal authentication gateway is not configured. Set INTERNAL_AUTH_API_URL."
    );
  }

  let gatewayResponse: GatewayHttpResponse;

  try {
    gatewayResponse = await postJsonWithTimeout(
      authUrl,
      {
        data: {
          username,
          password
        }
      },
      parseTimeoutValue(
        process.env.INTERNAL_AUTH_TIMEOUT_MS,
        DEFAULT_INTERNAL_AUTH_TIMEOUT_MS
      )
    );
  } catch {
    throw new Error("Internal authentication gateway is currently unavailable.");
  }

  if (
    gatewayResponse.response.status === 401 ||
    gatewayResponse.response.status === 403
  ) {
    throw new Error("Invalid internal login credentials.");
  }

  if (!gatewayResponse.response.ok) {
    throw new Error("Internal authentication gateway is currently unavailable.");
  }

  if (!isSuccessfulGatewayAuthentication(gatewayResponse.payload)) {
    throw new Error("Invalid internal login credentials.");
  }

  return {
    payload: gatewayResponse.payload,
    profile: extractInternalGatewayProfile(gatewayResponse.payload)
  };
};

const validateInternalPortalAccess = async (
  username: string
): Promise<{
  payload: unknown;
  profile: Omit<InternalGatewayProfile, "authPayload" | "accessPayload">;
}> => {
  const accessBaseUrl = resolveInternalAccessGatewayBaseUrl();

  if (!accessBaseUrl) {
    throw new Error(
      "Internal access gateway is not configured. Set INTERNAL_ACCESS_API_BASE_URL."
    );
  }

  const normalizedBaseUrl = accessBaseUrl.replace(/\/+$/, "");
  const accessUrl = `${normalizedBaseUrl}/${encodeURIComponent(username)}`;
  let gatewayResponse: GatewayHttpResponse;

  try {
    gatewayResponse = await postJsonWithTimeout(
      accessUrl,
      {
        username
      },
      parseTimeoutValue(
        process.env.INTERNAL_ACCESS_TIMEOUT_MS,
        DEFAULT_INTERNAL_ACCESS_TIMEOUT_MS
      )
    );
  } catch {
    throw new Error("Internal access gateway is currently unavailable.");
  }

  if (
    gatewayResponse.response.status === 401 ||
    gatewayResponse.response.status === 403 ||
    gatewayResponse.response.status === 404
  ) {
    throw new Error("You do not have access to the Omari internal portal.");
  }

  if (!gatewayResponse.response.ok) {
    throw new Error("Internal access gateway is currently unavailable.");
  }

  if (!hasInternalPortalAccess(gatewayResponse.payload, username)) {
    throw new Error("You do not have access to the Omari internal portal.");
  }

  return {
    payload: gatewayResponse.payload,
    profile: extractInternalGatewayProfile(gatewayResponse.payload)
  };
};

const upsertInternalGatewayUser = async (
  client: PrismaWriteClient,
  username: string,
  profile: InternalGatewayProfile
): Promise<string> => {
  const now = new Date();
  const serializedGatewayPayload = JSON.stringify({
    auth: profile.authPayload,
    access: profile.accessPayload
  });
  const resolvedFullName = profile.fullName || username;
  const resolvedEmail = profile.email || null;

  const existingIdentity = await client.internalUserIdentity.findUnique({
    where: {
      username
    },
    include: {
      user: true
    }
  });

  if (existingIdentity) {
    await client.user.update({
      where: {
        id: existingIdentity.userId
      },
      data: {
        fullName: resolvedFullName,
        email: resolvedEmail || existingIdentity.user.email,
        role: USER_ROLES.admin,
        status: "active",
        lastLoginAt: now,
        emailVerified: resolvedEmail ? true : existingIdentity.user.emailVerified,
        preferredOtpChannel: resolvedEmail
          ? "email"
          : existingIdentity.user.preferredOtpChannel
      }
    });

    await client.internalUserIdentity.update({
      where: {
        id: existingIdentity.id
      },
      data: {
        authSource: INTERNAL_AUTH_SOURCE_GATEWAY,
        externalReference: profile.externalReference,
        displayName: resolvedFullName,
        workEmail: resolvedEmail,
        workMobileNumber: profile.mobileNumber,
        accessProfile: profile.accessProfile,
        gatewayPayloadJson: serializedGatewayPayload,
        lastAuthenticatedAt: now,
        lastAccessCheckedAt: now
      }
    });

    return existingIdentity.userId;
  }

  const linkableUser =
    resolvedEmail
      ? await client.user.findFirst({
          where: {
            email: resolvedEmail,
            role: USER_ROLES.admin,
            internalIdentity: {
              is: null
            }
          }
        })
      : null;

  if (linkableUser) {
    await client.user.update({
      where: {
        id: linkableUser.id
      },
      data: {
        fullName: resolvedFullName,
        email: resolvedEmail,
        role: USER_ROLES.admin,
        status: "active",
        lastLoginAt: now,
        emailVerified: resolvedEmail ? true : linkableUser.emailVerified,
        preferredOtpChannel: resolvedEmail
          ? "email"
          : linkableUser.preferredOtpChannel
      }
    });

    await client.internalUserIdentity.create({
      data: {
        userId: linkableUser.id,
        username,
        authSource: INTERNAL_AUTH_SOURCE_GATEWAY,
        externalReference: profile.externalReference,
        displayName: resolvedFullName,
        workEmail: resolvedEmail,
        workMobileNumber: profile.mobileNumber,
        accessProfile: profile.accessProfile,
        gatewayPayloadJson: serializedGatewayPayload,
        lastAuthenticatedAt: now,
        lastAccessCheckedAt: now
      }
    });

    return linkableUser.id;
  }

  const createdUser = await client.user.create({
    data: {
      fullName: resolvedFullName,
      email: resolvedEmail,
      mobileNumber: getSyntheticInternalMobileNumber(username),
      passwordHash: EXTERNAL_AUTH_ONLY_PASSWORD_HASH,
      role: USER_ROLES.admin,
      status: "active",
      emailVerified: Boolean(resolvedEmail),
      mobileVerified: false,
      preferredOtpChannel: resolvedEmail ? "email" : null,
      lastLoginAt: now
    }
  });

  await client.internalUserIdentity.create({
    data: {
      userId: createdUser.id,
      username,
      authSource: INTERNAL_AUTH_SOURCE_GATEWAY,
      externalReference: profile.externalReference,
      displayName: resolvedFullName,
      workEmail: resolvedEmail,
      workMobileNumber: profile.mobileNumber,
      accessProfile: profile.accessProfile,
      gatewayPayloadJson: serializedGatewayPayload,
      lastAuthenticatedAt: now,
      lastAccessCheckedAt: now
    }
  });

  return createdUser.id;
};

export const getCurrentUserFromSessionToken = async (
  sessionToken: string
): Promise<AuthenticatedUser | null> => {
  const session = await prisma.authSession.findFirst({
    where: {
      tokenHash: hashOpaqueToken(sessionToken),
      revokedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: {
        include: getUserInclude()
      }
    }
  });

  if (!session || session.user.status !== "active") {
    return null;
  }

  return mapAuthenticatedUser(session.user);
};

export const registerApplicant = async (
  payload: RegisterApplicantPayload,
  context: AuthContext
): Promise<AuthResponse> => {
  const fullName = normalizeRequiredString(payload.fullName, "Full name");
  const organizationName = normalizeRequiredString(
    payload.organizationName,
    "Organization name"
  );
  const mobileNumber = normalizeRequiredMobile(payload.mobileNumber);
  const email = normalizeOptionalEmail(payload.email);
  const password = payload.password;

  if (!password) {
    throw new Error("Password is required.");
  }

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (transaction) => {
    const existingMobileUser = await transaction.user.findUnique({
      where: {
        mobileNumber
      }
    });

    if (existingMobileUser) {
      throw new Error("That mobile number is already in use.");
    }

    if (email) {
      await ensureEmailNotTaken(transaction, email);
    }

    const user = await transaction.user.create({
      data: {
        fullName,
        mobileNumber,
        email,
        passwordHash,
        role: USER_ROLES.applicant,
        preferredOtpChannel: "sms"
      },
      include: getUserInclude()
    });

    const organization = await transaction.organization.create({
      data: {
        ownerUserId: user.id,
        legalName: organizationName,
        businessEmail: email,
        businessPhone: mobileNumber
      }
    });

    const sessionToken = await createSessionForUser(transaction, user.id, context);

    await writeAuthAuditLog(transaction, {
      actorUserId: user.id,
      entityId: user.id,
      action: "applicant_register_success",
      summary: "Applicant registration completed.",
      details: {
        role: user.role
      }
    });

    return {
      user: mapAuthenticatedUser({
        ...user,
        organizationOwner: organization
      }),
      sessionToken
    };
  });
};

export const loginUser = async (
  payload: LoginPayload,
  context: AuthContext
): Promise<AuthResponse> => {
  const identifier = normalizeRequiredString(payload.identifier, "Identifier");
  const password = payload.password;

  if (!password) {
    throw new Error("Password is required.");
  }

  const normalizedEmail = identifier.includes("@")
    ? normalizeEmailAddress(identifier)
    : null;
  const normalizedMobile = normalizedEmail ? null : normalizeRequiredMobile(identifier);

  const user = await prisma.user.findFirst({
    where: normalizedEmail
      ? {
          email: normalizedEmail
        }
      : {
          mobileNumber: normalizedMobile || ""
        },
    include: getUserInclude()
  });

  if (!user) {
    throw new Error("Invalid login credentials.");
  }

  if (user.role !== USER_ROLES.applicant) {
    throw new Error("Use the internal sign in page.");
  }

  if (user.status !== "active") {
    throw new Error("This account is not active.");
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    await writeAuthAuditLog(prisma, {
      actorUserId: user.id,
      entityId: user.id,
      action: "applicant_login_failed",
      summary: "Applicant login failed.",
      details: {
        identifier,
        ipAddress: context.ipAddress || null
      }
    });
    throw new Error("Invalid login credentials.");
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: {
        id: user.id
      },
      data: {
        lastLoginAt: new Date()
      }
    });

    const sessionToken = await createSessionForUser(transaction, user.id, context);

    await writeAuthAuditLog(transaction, {
      actorUserId: user.id,
      entityId: user.id,
      action: "applicant_login_success",
      summary: "Applicant login successful.",
      details: {
        identifier,
        ipAddress: context.ipAddress || null
      }
    });

    return {
      user: mapAuthenticatedUser(user),
      sessionToken
    };
  });
};

export const loginInternalUser = async (
  payload: InternalLoginPayload,
  context: AuthContext
): Promise<AuthResponse> => {
  const username = normalizeRequiredUsername(payload.username);
  const password = normalizeRequiredString(payload.password, "Password");
  let authGatewayResponse: {
    payload: unknown;
    profile: Omit<InternalGatewayProfile, "authPayload" | "accessPayload">;
  };
  let accessGatewayResponse: {
    payload: unknown;
    profile: Omit<InternalGatewayProfile, "authPayload" | "accessPayload">;
  };

  try {
    authGatewayResponse = await authenticateAgainstInternalGateway(username, password);
  } catch (error) {
    await writeAuthAuditLog(prisma, {
      entityId: username,
      action: "internal_login_failed",
      summary: "Internal login failed at authentication gateway.",
      details: {
        username,
        stage: "authentication_gateway",
        ipAddress: context.ipAddress || null,
        reason: error instanceof Error ? error.message : "Unknown gateway error"
      }
    });
    throw error;
  }

  try {
    accessGatewayResponse = await validateInternalPortalAccess(username);
  } catch (error) {
    await writeAuthAuditLog(prisma, {
      entityId: username,
      action: "internal_login_failed",
      summary: "Internal login failed at access gateway.",
      details: {
        username,
        stage: "access_gateway",
        ipAddress: context.ipAddress || null,
        reason: error instanceof Error ? error.message : "Unknown gateway error"
      }
    });
    throw error;
  }

  const mergedProfile = mergeGatewayProfiles(
    authGatewayResponse.profile,
    accessGatewayResponse.profile,
    authGatewayResponse.payload,
    accessGatewayResponse.payload
  );

  return prisma.$transaction(async (transaction) => {
    const userId = await upsertInternalGatewayUser(
      transaction,
      username,
      mergedProfile
    );
    const sessionToken = await createSessionForUser(transaction, userId, context);

    await writeAuthAuditLog(transaction, {
      actorUserId: userId,
      entityId: userId,
      action: "internal_login_success",
      summary: "Internal gateway login successful.",
      details: {
        username,
        stage: "gateway",
        accessProfile: mergedProfile.accessProfile,
        ipAddress: context.ipAddress || null
      }
    });

    const refreshedUser = await getUserWithOrganization(transaction, userId);

    if (!refreshedUser) {
      throw new Error("User account not found.");
    }

    return {
      user: mapAuthenticatedUser(refreshedUser),
      sessionToken
    };
  });
};

export const logoutSession = async (sessionToken: string): Promise<void> => {
  await prisma.authSession.updateMany({
    where: {
      tokenHash: hashOpaqueToken(sessionToken),
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
};

export const updateProfile = async (
  userId: string,
  payload: UpdateProfilePayload
): Promise<AuthenticatedUser> => {
  const fullName = normalizeRequiredString(payload.fullName, "Full name");
  const mobileNumber = normalizeRequiredMobile(payload.mobileNumber);
  const email = normalizeOptionalEmail(payload.email || undefined);
  const organizationName = payload.organizationName?.trim();
  const tradingName = payload.tradingName?.trim() || null;

  return prisma.$transaction(async (transaction) => {
    const existingUser = await getUserWithOrganization(transaction, userId);

    if (!existingUser) {
      throw new Error("User account not found.");
    }

    if (existingUser.status !== "active") {
      throw new Error("This account is not active.");
    }

    if (
      existingUser.role === USER_ROLES.admin
    ) {
      throw new Error(
        "Internal identity details are managed through Active Directory (AD)."
      );
    }

    if (existingUser.mobileNumber !== mobileNumber) {
      const duplicateMobileUser = await transaction.user.findUnique({
        where: {
          mobileNumber
        }
      });

      if (duplicateMobileUser) {
        throw new Error("That mobile number is already in use.");
      }
    }

    if (email) {
      await ensureEmailNotTaken(transaction, email, existingUser.id);
    }

    const emailChanged = (existingUser.email || null) !== email;
    const mobileChanged = existingUser.mobileNumber !== mobileNumber;
    const preferredOtpChannel =
      existingUser.preferredOtpChannel === "email" && !email
        ? "sms"
        : existingUser.preferredOtpChannel || (email ? "email" : "sms");

    await transaction.user.update({
      where: {
        id: existingUser.id
      },
      data: {
        fullName,
        mobileNumber,
        email,
        mobileVerified: mobileChanged ? false : existingUser.mobileVerified,
        emailVerified: emailChanged ? false : existingUser.emailVerified,
        preferredOtpChannel
      }
    });

    if (existingUser.organizationOwner) {
      const legalName =
        typeof organizationName === "string" && organizationName
          ? normalizeRequiredString(organizationName, "Organization name")
          : existingUser.organizationOwner.legalName;

      await transaction.organization.update({
        where: {
          id: existingUser.organizationOwner.id
        },
        data: {
          legalName,
          tradingName
        }
      });
    }

    if (existingUser.internalIdentity) {
      await transaction.internalUserIdentity.update({
        where: {
          userId: existingUser.id
        },
        data: {
          displayName: fullName,
          workEmail: email,
          workMobileNumber: mobileNumber
        }
      });
    }

    const updatedUser = await getUserWithOrganization(transaction, existingUser.id);

    if (!updatedUser) {
      throw new Error("User account not found.");
    }

    return mapAuthenticatedUser(updatedUser);
  });
};

export const changePassword = async (
  userId: string,
  payload: ChangePasswordPayload,
  currentSessionToken?: string
): Promise<void> => {
  const currentPassword = normalizeRequiredString(
    payload.currentPassword,
    "Current password"
  );
  const newPassword = normalizeRequiredString(payload.newPassword, "New password");

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from your current password.");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      internalIdentity: true
    }
  });

  if (!existingUser) {
    throw new Error("User account not found.");
  }

  if (
    existingUser.role === USER_ROLES.admin
  ) {
    throw new Error(
      "Password changes for this internal account are managed through Active Directory (AD)."
    );
  }

  const isCurrentPasswordValid = await verifyPassword(
    currentPassword,
    existingUser.passwordHash
  );

  if (!isCurrentPasswordValid) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await hashPassword(newPassword);
  const currentSessionTokenHash = currentSessionToken
    ? hashOpaqueToken(currentSessionToken)
    : null;

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: {
        id: existingUser.id
      },
      data: {
        passwordHash
      }
    });

    await transaction.authSession.updateMany({
      where: {
        userId: existingUser.id,
        revokedAt: null,
        ...(currentSessionTokenHash
          ? {
              tokenHash: {
                not: currentSessionTokenHash
              }
            }
          : {})
      },
      data: {
        revokedAt: new Date()
      }
    });
  });
};

export const createAdminUser = async (
  payload: CreateAdminPayload
): Promise<AuthenticatedUser> => {
  const fullName = normalizeRequiredString(payload.fullName, "Full name");
  const email = normalizeEmailAddress(
    normalizeRequiredString(payload.email, "Email")
  );
  const mobileNumber = normalizeRequiredMobile(payload.mobileNumber);
  const password = payload.password;
  const username = payload.username
    ? normalizeRequiredUsername(payload.username)
    : null;
  const authSource = payload.authSource
    ? normalizeRequiredString(payload.authSource, "Auth source").toLowerCase()
    : INTERNAL_AUTH_SOURCE_GATEWAY;

  if (authSource !== INTERNAL_AUTH_SOURCE_GATEWAY) {
    throw new Error("Internal users must use gateway authentication.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (transaction) => {
    const existingMobileUser = await transaction.user.findUnique({
      where: {
        mobileNumber
      }
    });

    if (existingMobileUser) {
      throw new Error("That mobile number is already in use.");
    }

    await ensureEmailNotTaken(transaction, email);

    if (username) {
      await ensureInternalUsernameNotTaken(transaction, username);
    }

    const user = await transaction.user.create({
      data: {
        fullName,
        email,
        mobileNumber,
        passwordHash,
        role: USER_ROLES.admin,
        emailVerified: true,
        mobileVerified: true,
        preferredOtpChannel: "email"
      }
    });

    if (username) {
      await transaction.internalUserIdentity.create({
        data: {
          userId: user.id,
          username,
          authSource,
          displayName: fullName,
          workEmail: email,
          workMobileNumber: mobileNumber,
          lastAuthenticatedAt: new Date(),
          lastAccessCheckedAt: null
        }
      });
    }

    const createdUser = await getUserWithOrganization(transaction, user.id);

    if (!createdUser) {
      throw new Error("User account not found.");
    }

    return mapAuthenticatedUser(createdUser);
  });
};

export const prepareInternalAdminUser = async (
  payload: PrepareInternalAdminPayload
): Promise<AuthenticatedUser> => {
  const username = normalizeRequiredUsername(payload.username);
  const authSource = payload.authSource
    ? normalizeRequiredString(payload.authSource, "Auth source").toLowerCase()
    : INTERNAL_AUTH_SOURCE_GATEWAY;
  const email = payload.email ? normalizeEmailAddress(payload.email) : null;
  const userId = normalizeOptionalString(payload.userId);

  if (authSource !== INTERNAL_AUTH_SOURCE_GATEWAY) {
    throw new Error("Internal users must use gateway authentication.");
  }

  if (!email && !userId) {
    throw new Error("Either email or userId is required.");
  }

  return prisma.$transaction(async (transaction) => {
    const existingAdmin = await transaction.user.findFirst({
      where: {
        role: USER_ROLES.admin,
        ...(userId
          ? {
              id: userId
            }
          : {
              email
            })
      },
      include: getUserInclude()
    });

    if (!existingAdmin) {
      throw new Error("Admin user account not found.");
    }

    await ensureInternalUsernameNotTaken(transaction, username, existingAdmin.id);

    if (existingAdmin.internalIdentity) {
      await transaction.internalUserIdentity.update({
        where: {
          userId: existingAdmin.id
        },
        data: {
          username,
          authSource,
          displayName: existingAdmin.fullName,
          workEmail: existingAdmin.email,
          workMobileNumber: isSyntheticInternalMobileNumber(existingAdmin.mobileNumber)
            ? null
            : existingAdmin.mobileNumber
        }
      });
    } else {
      await transaction.internalUserIdentity.create({
        data: {
          userId: existingAdmin.id,
          username,
          authSource,
          displayName: existingAdmin.fullName,
          workEmail: existingAdmin.email,
          workMobileNumber: isSyntheticInternalMobileNumber(existingAdmin.mobileNumber)
            ? null
            : existingAdmin.mobileNumber
        }
      });
    }

    const refreshedUser = await getUserWithOrganization(transaction, existingAdmin.id);

    if (!refreshedUser) {
      throw new Error("User account not found.");
    }

    return mapAuthenticatedUser(refreshedUser);
  });
};
