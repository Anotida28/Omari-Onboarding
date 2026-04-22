const DEFAULT_LOCAL_BACKEND_PORT = 5000;
const DEFAULT_MOCK_PASSWORD = "Omari123!";

export interface InternalGatewayMockUser {
  username: string;
  password: string;
  fullName: string;
  email: string | null;
  mobileNumber: string | null;
  accessProfile: string | null;
  externalReference: string | null;
  hasPortalAccess: boolean;
}

const DEFAULT_INTERNAL_GATEWAY_MOCK_USERS: InternalGatewayMockUser[] = [
  {
    username: "gateway.reviewer",
    password: DEFAULT_MOCK_PASSWORD,
    fullName: "Internal Reviewer",
    email: "gateway.reviewer@omari.local",
    mobileNumber: "+263771000101",
    accessProfile: "review_ops",
    externalReference: "EMP-1001",
    hasPortalAccess: true
  },
  {
    username: "gateway.intake",
    password: DEFAULT_MOCK_PASSWORD,
    fullName: "Internal Intake Analyst",
    email: "gateway.intake@omari.local",
    mobileNumber: "+263771000102",
    accessProfile: "intake_ops",
    externalReference: "EMP-1002",
    hasPortalAccess: true
  },
  {
    username: "gateway.opslead",
    password: DEFAULT_MOCK_PASSWORD,
    fullName: "Operations Lead",
    email: "gateway.opslead@omari.local",
    mobileNumber: "+263771000103",
    accessProfile: "operations_lead",
    externalReference: "EMP-1003",
    hasPortalAccess: true
  }
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeOptionalString = (value: string | undefined | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
};

const normalizeUsername = (value: string | undefined | null): string | null => {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
};

const parseExplicitBoolean = (value: string | undefined): boolean | null => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
};

const getLocalGatewayOrigin = (): string => {
  const parsedPort = Number.parseInt(process.env.PORT || "", 10);
  const port =
    Number.isNaN(parsedPort) || parsedPort <= 0
      ? DEFAULT_LOCAL_BACKEND_PORT
      : parsedPort;

  return `http://127.0.0.1:${port}`;
};

const toInternalGatewayMockUser = (
  value: unknown
): InternalGatewayMockUser | null => {
  if (!isRecord(value)) {
    return null;
  }

  const username = normalizeUsername(
    typeof value.username === "string" ? value.username : undefined
  );
  const password = normalizeOptionalString(
    typeof value.password === "string" ? value.password : undefined
  );
  const fullName = normalizeOptionalString(
    typeof value.fullName === "string" ? value.fullName : undefined
  );

  if (!username || !password || !fullName) {
    return null;
  }

  const hasPortalAccess =
    typeof value.hasPortalAccess === "boolean"
      ? value.hasPortalAccess
      : typeof value.allowed === "boolean"
        ? value.allowed
        : true;

  return {
    username,
    password,
    fullName,
    email: normalizeOptionalString(
      typeof value.email === "string" ? value.email : undefined
    ),
    mobileNumber: normalizeOptionalString(
      typeof value.mobileNumber === "string" ? value.mobileNumber : undefined
    ),
    accessProfile: normalizeOptionalString(
      typeof value.accessProfile === "string" ? value.accessProfile : undefined
    ),
    externalReference: normalizeOptionalString(
      typeof value.externalReference === "string"
        ? value.externalReference
        : undefined
    ),
    hasPortalAccess
  };
};

const getConfiguredInternalGatewayMockUsers = (): InternalGatewayMockUser[] | null => {
  const rawConfig = normalizeOptionalString(
    process.env.INTERNAL_GATEWAY_MOCK_USERS_JSON
  );

  if (!rawConfig) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawConfig) as unknown;

    if (!Array.isArray(parsed)) {
      console.warn(
        "INTERNAL_GATEWAY_MOCK_USERS_JSON must be a JSON array. Falling back to default mock users."
      );
      return null;
    }

    const users = parsed
      .map((item) => toInternalGatewayMockUser(item))
      .filter((item): item is InternalGatewayMockUser => Boolean(item));

    if (users.length === 0) {
      console.warn(
        "INTERNAL_GATEWAY_MOCK_USERS_JSON did not contain any valid users. Falling back to default mock users."
      );
      return null;
    }

    return users;
  } catch (error) {
    console.warn(
      "Failed to parse INTERNAL_GATEWAY_MOCK_USERS_JSON. Falling back to default mock users.",
      error
    );
    return null;
  }
};

export const shouldEnableInternalGatewayMock = (): boolean => {
  const explicitValue = parseExplicitBoolean(
    process.env.INTERNAL_GATEWAY_MOCK_ENABLED
  );

  if (explicitValue !== null) {
    return explicitValue;
  }

  return false;
};

export const resolveInternalAuthGatewayUrl = (): string | null => {
  const configuredUrl = normalizeOptionalString(process.env.INTERNAL_AUTH_API_URL);

  if (configuredUrl) {
    return configuredUrl;
  }

  if (!shouldEnableInternalGatewayMock()) {
    return null;
  }

  return `${getLocalGatewayOrigin()}/api/dev/internal-gateway/authenticate`;
};

export const resolveInternalAccessGatewayBaseUrl = (): string | null => {
  const configuredBaseUrl = normalizeOptionalString(
    process.env.INTERNAL_ACCESS_API_BASE_URL
  );

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (!shouldEnableInternalGatewayMock()) {
    return null;
  }

  return `${getLocalGatewayOrigin()}/api/dev/internal-gateway/access`;
};

export const getInternalGatewayMockUsers = (): InternalGatewayMockUser[] =>
  getConfiguredInternalGatewayMockUsers() || DEFAULT_INTERNAL_GATEWAY_MOCK_USERS;

export const findInternalGatewayMockUser = (
  username: string
): InternalGatewayMockUser | null => {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  return (
    getInternalGatewayMockUsers().find(
      (candidate) => candidate.username === normalizedUsername
    ) || null
  );
};

export const mapInternalGatewayMockUserProfile = (
  user: InternalGatewayMockUser
): Record<string, string | boolean | null> => ({
  username: user.username,
  fullName: user.fullName,
  displayName: user.fullName,
  email: user.email,
  mobileNumber: user.mobileNumber,
  accessProfile: user.accessProfile,
  externalReference: user.externalReference,
  employeeId: user.externalReference,
  allowed: user.hasPortalAccess
});
