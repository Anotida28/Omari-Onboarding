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
  mobileNumber: string;
  role: string;
  status: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  organization: AuthenticatedOrganization | null;
}
