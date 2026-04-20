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

export interface CreateAdminPayload {
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
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

const normalizeRequiredString = (value: string, fieldLabel: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldLabel} is required.`);
  }

  return normalized;
};

const normalizeOptionalEmail = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalizeEmailAddress(normalized) : null;
};

const normalizeRequiredMobile = (value: string): string => {
  const normalized = normalizeMobileNumber(value);

  if (normalized.length < 8) {
    throw new Error("A valid mobile number is required.");
  }

  return normalized;
};

const mapAuthenticatedUser = (user: {
  id: string;
  fullName: string;
  email: string | null;
  mobileNumber: string;
  role: string;
  status: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  organizationOwner?: {
    id: string;
    legalName: string;
    tradingName: string | null;
    entityType: string;
  } | null;
}): AuthenticatedUser => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  mobileNumber: user.mobileNumber,
  role: user.role,
  status: user.status,
  mobileVerified: user.mobileVerified,
  emailVerified: user.emailVerified,
  organization: user.organizationOwner
    ? {
        id: user.organizationOwner.id,
        legalName: user.organizationOwner.legalName,
        tradingName: user.organizationOwner.tradingName,
        entityType: user.organizationOwner.entityType
      }
    : null
});

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
    include: {
      organizationOwner: true
    }
  });

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
        include: {
          organizationOwner: true
        }
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
      include: {
        organizationOwner: true
      }
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
    include: {
      organizationOwner: true
    }
  });

  if (!user) {
    throw new Error("Invalid login credentials.");
  }

  if (user.status !== "active") {
    throw new Error("This account is not active.");
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
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

    return {
      user: mapAuthenticatedUser(user),
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
    }
  });

  if (!existingUser) {
    throw new Error("User account not found.");
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

    const user = await transaction.user.create({
      data: {
        fullName,
        email,
        mobileNumber,
        passwordHash,
        role: USER_ROLES.admin,
        emailVerified: true,
        preferredOtpChannel: "email"
      },
      include: {
        organizationOwner: true
      }
    });

    return mapAuthenticatedUser(user);
  });
};
