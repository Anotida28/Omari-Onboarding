export const APPLICATION_TYPES = {
  merchant: "merchant",
  agent: "agent",
  payer: "payer"
} as const;

export const APPLICATION_STATUSES = {
  draft: "draft",
  submitted: "submitted",
  initialReview: "initial_review",
  documentCheck: "document_check",
  complianceReview: "compliance_review",
  needsMoreInformation: "needs_more_information",
  approved: "approved",
  rejected: "rejected",
  activated: "activated",
  archived: "archived"
} as const;

export const ACTIVE_APPLICATION_STATUSES = new Set<string>([
  APPLICATION_STATUSES.draft,
  APPLICATION_STATUSES.submitted,
  APPLICATION_STATUSES.initialReview,
  APPLICATION_STATUSES.documentCheck,
  APPLICATION_STATUSES.complianceReview,
  APPLICATION_STATUSES.needsMoreInformation
]);

export const USER_ROLES = {
  applicant: "applicant",
  admin: "admin"
} as const;
