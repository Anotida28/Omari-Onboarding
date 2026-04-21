export interface AuthenticatedOrganization {
  id: string;
  legalName: string;
  tradingName: string | null;
  entityType: string;
}

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string | null;
  mobileNumber: string | null;
  username: string | null;
  role: string;
  status: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  isInternalUser: boolean;
  authSource: string;
  canChangePassword: boolean;
  canEditProfile: boolean;
  organization: AuthenticatedOrganization | null;
}
