import { PrismaClient } from "@prisma/client";

declare global {
  // Allow the Prisma client to be reused during local development reloads.
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
