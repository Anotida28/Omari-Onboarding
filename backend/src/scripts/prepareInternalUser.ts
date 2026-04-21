import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { prepareInternalAdminUser } from "../services/authService";

dotenv.config();

const parseArguments = (): Record<string, string> =>
  process.argv.slice(2).reduce<Record<string, string>>((accumulator, argument) => {
    const [rawKey, ...valueParts] = argument.split("=");
    const key = rawKey.replace(/^--/, "").trim();
    const value = valueParts.join("=").trim();

    if (key && value) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});

const args = parseArguments();

const email = args.email || process.env.ADMIN_EMAIL;
const userId = args["user-id"];
const username = args.username || process.env.ADMIN_USERNAME;
const authSource = args["auth-source"] || process.env.ADMIN_AUTH_SOURCE;

const printUsage = (): void => {
  console.log(
    "Usage: npm run internal-user:prepare -- --email=\"admin@example.com\" --username=\"internal.user\" [--auth-source=\"break_glass\"]"
  );
};

const main = async (): Promise<void> => {
  if ((!email && !userId) || !username) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const user = await prepareInternalAdminUser({
    email,
    userId,
    username,
    authSource
  });

  console.log(
    `Internal auth prepared for ${user.fullName} with username=${user.username}`
  );
};

void main()
  .catch((error) => {
    console.error("Failed to prepare internal user.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
