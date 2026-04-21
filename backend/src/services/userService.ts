import { USER_ROLES } from "../constants/application";
import { prisma } from "../lib/prisma";

export interface ListedUser {
  id: string;
  name: string;
  fullName: string;
  role: string;
  email: string | null;
  username: string | null;
  status: string;
  authSource: string;
  lastLoginAt: string | null;
}

export const getUsers = async (): Promise<ListedUser[]> => {
  const users = await prisma.user.findMany({
    where: {
      role: USER_ROLES.admin
    },
    include: {
      internalIdentity: true
    },
    orderBy: [
      {
        fullName: "asc"
      }
    ]
  });

  return users.map((user) => ({
    id: user.id,
    name: user.fullName,
    fullName: user.fullName,
    role: user.role,
    email: user.internalIdentity?.workEmail || user.email,
    username: user.internalIdentity?.username || null,
    status: user.status,
    authSource: user.internalIdentity?.authSource || "local_admin",
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null
  }));
};
