import dotenv from "dotenv";
import { prisma } from "../lib/prisma";
import { createAdminUser } from "../services/authService";

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

const fullName = args.name || process.env.ADMIN_FULL_NAME;
const email = args.email || process.env.ADMIN_EMAIL;
const mobileNumber = args.mobile || process.env.ADMIN_MOBILE_NUMBER;
const password = args.password || process.env.ADMIN_PASSWORD;
const username = args.username || process.env.ADMIN_USERNAME;
const authSource = args["auth-source"] || process.env.ADMIN_AUTH_SOURCE;

const printUsage = (): void => {
  console.log(
    "Usage: npm run admin:create -- --name=\"Admin Name\" --email=\"admin@example.com\" --mobile=\"+263771234567\" --password=\"StrongPassword123\" [--username=\"internal.user\"] [--auth-source=\"gateway\"]"
  );
};

const main = async (): Promise<void> => {
  if (!fullName || !email || !mobileNumber || !password) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const user = await createAdminUser({
    fullName,
    email,
    mobileNumber,
    password,
    username,
    authSource
  });

  const usernameLabel = user.username ? ` username=${user.username}` : "";
  console.log(`Admin user created: ${user.fullName} <${user.email}>${usernameLabel}`);
};

void main()
  .catch((error) => {
    console.error("Failed to create admin user.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
