import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";
import { Prisma, type Application as PrismaApplication } from "@prisma/client";
import {
  ACTIVE_APPLICATION_STATUSES,
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  USER_ROLES
} from "../constants/application";
import { prisma } from "../lib/prisma";
import type { AuthenticatedUser } from "../types/auth";
import {
  deleteStoredFile,
  ensureStoredFileExists,
  ensureUploadDirectory,
  resolveStoredFilePath
} from "../lib/uploads";

const SECTION_KEYS = {
  businessSnapshot: "business_snapshot",
  contactsTransactors: "contacts_transactors",
  bankingDetails: "banking_details",
  operations: "operations_configuration",
  supportingDocuments: "supporting_documents",
  declarations: "declarations_review"
} as const;

const SECTION_BLUEPRINTS: Record<
  string,
  Array<{
    key: string;
    title: string;
    sortOrder: number;
    status: string;
  }>
> = {
  [APPLICATION_TYPES.merchant]: [
    {
      key: SECTION_KEYS.businessSnapshot,
      title: "Business Snapshot",
      sortOrder: 1,
      status: "in_progress"
    },
    {
      key: SECTION_KEYS.contactsTransactors,
      title: "Contacts & Authorized Transactors",
      sortOrder: 2,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.bankingDetails,
      title: "Banking Details",
      sortOrder: 3,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.supportingDocuments,
      title: "Supporting Documents",
      sortOrder: 4,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.declarations,
      title: "Declarations and Review",
      sortOrder: 5,
      status: "not_started"
    }
  ],
  [APPLICATION_TYPES.agent]: [
    {
      key: SECTION_KEYS.businessSnapshot,
      title: "Business Snapshot",
      sortOrder: 1,
      status: "in_progress"
    },
    {
      key: SECTION_KEYS.contactsTransactors,
      title: "Directors & Authorized Transactors",
      sortOrder: 2,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.bankingDetails,
      title: "Banking Details",
      sortOrder: 3,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.operations,
      title: "Outlets & Operations",
      sortOrder: 4,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.supportingDocuments,
      title: "Supporting Documents",
      sortOrder: 5,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.declarations,
      title: "Declarations and Review",
      sortOrder: 6,
      status: "not_started"
    }
  ],
  [APPLICATION_TYPES.payer]: [
    {
      key: SECTION_KEYS.businessSnapshot,
      title: "Business Snapshot",
      sortOrder: 1,
      status: "in_progress"
    },
    {
      key: SECTION_KEYS.contactsTransactors,
      title: "Billing Contacts & Signatories",
      sortOrder: 2,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.bankingDetails,
      title: "Banking Details",
      sortOrder: 3,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.operations,
      title: "Settlement Configuration",
      sortOrder: 4,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.supportingDocuments,
      title: "Supporting Documents",
      sortOrder: 5,
      status: "not_started"
    },
    {
      key: SECTION_KEYS.declarations,
      title: "Declarations and Review",
      sortOrder: 6,
      status: "not_started"
    }
  ]
};

type PrismaWriteClient = Prisma.TransactionClient | typeof prisma;
type ApplicationActor = Pick<
  AuthenticatedUser,
  "id" | "role" | "organization"
>;

const TRANSACTION_OPTIONS = {
  maxWait: 15000,
  timeout: 60000
} as const;

export interface BusinessSnapshotPayload {
  applicationId?: string;
  entityType: string;
  legalName: string;
  tradingName?: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone?: string;
  businessAddress?: string;
  projectedTransactions?: string;
  productsDescription?: string;
  registrationNumber?: string;
  taxNumber?: string;
  yearsInOperation?: string;
  serviceCoverage?: string;
  outletCountEstimate?: string;
  complianceContact?: string;
}

export interface MerchantDraftPayload extends BusinessSnapshotPayload {}

export interface AgentDraftPayload extends BusinessSnapshotPayload {}

export interface PayerDraftPayload extends BusinessSnapshotPayload {}

interface UploadedDocumentSummary {
  id: string;
  requirementCode: string | null;
  label: string;
  originalFileName: string;
  status: string;
  isRequired: boolean;
  reviewNotes: string | null;
  downloadUrl: string;
  uploadedAt: string;
  reviewedAt: string | null;
}

interface ApplicationSectionSummary {
  key: string;
  title: string;
  status: string;
  sortOrder: number;
  lastEditedAt: string | null;
}

export interface MerchantContactPersonPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  designation?: string;
  residentialAddress?: string;
}

export interface MerchantTransactorPayload {
  fullName: string;
  designation?: string;
  email?: string;
  phoneNumber?: string;
  nationalIdNumber?: string;
  residentialAddress?: string;
}

export interface MerchantSignatoryPayload extends MerchantTransactorPayload {
  isPrimarySignatory?: boolean;
}

export interface MerchantContactsPayload {
  primaryContact: MerchantContactPersonPayload;
  authorizedTransactors: MerchantTransactorPayload[];
  signatories: MerchantSignatoryPayload[];
}

export interface AgentDirectorPayload extends MerchantSignatoryPayload {
  isPrimaryDirector?: boolean;
}

export interface AgentContactsPayload {
  primaryContact: MerchantContactPersonPayload;
  authorizedTransactors: MerchantTransactorPayload[];
  directors: AgentDirectorPayload[];
}

export interface PayerContactsPayload {
  primaryContact: MerchantContactPersonPayload;
  operationsContacts: MerchantTransactorPayload[];
  signatories: MerchantSignatoryPayload[];
}

export interface MerchantBankingPayload {
  accountName: string;
  bankName: string;
  branchName?: string;
  branchCode?: string;
  accountNumber: string;
  accountType?: string;
  currency?: string;
}

export interface AgentOutletPayload {
  name: string;
  location?: string;
  contactPerson?: string;
  code?: string;
  phoneNumber?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  country?: string;
}

export interface AgentBankingPayload extends MerchantBankingPayload {}

export interface AgentOperationsStepPayload {
  outlets: AgentOutletPayload[];
  complianceContact?: string;
  operationalDetails?: string;
}

export interface AgentOperationsPayload extends MerchantBankingPayload, AgentOperationsStepPayload {
}

export interface PayerBankingPayload extends MerchantBankingPayload {
}

export interface PayerSettlementStepPayload {
  settlementMethod?: string;
  reconciliationEmail?: string;
  integrationNotes?: string;
}

export interface PayerSettlementPayload
  extends MerchantBankingPayload,
    PayerSettlementStepPayload {}

export interface MerchantDeclarationPayload {
  signerName: string;
  signerTitle?: string;
  acceptedTerms: boolean;
  certifiedInformation: boolean;
  authorizedToAct: boolean;
}

interface ApplicationStatusHistorySummary {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface ReviewCommentSummary {
  id: string;
  sectionKey: string | null;
  visibility: string;
  commentType: string;
  message: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface ReviewTaskSummary {
  id: string;
  taskType: string;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface DocumentChecklistSummaryItem {
  requirementCode: string;
  label: string;
  isRequired: boolean;
  status: string;
  uploadedCount: number;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

interface DocumentReviewSummary {
  totalDocuments: number;
  acceptedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  requiredDocuments: number;
  acceptedRequiredDocuments: number;
  missingRequiredDocuments: DocumentChecklistSummaryItem[];
  rejectedRequiredDocuments: DocumentChecklistSummaryItem[];
  pendingRequiredDocuments: DocumentChecklistSummaryItem[];
}

export interface ApplicationDetailResponse {
  applicationId: string;
  applicationType: string;
  status: string;
  currentStep: string | null;
  createdAt: string;
  submittedAt: string | null;
  updatedAt: string;
  startedBy: {
    id: string;
    fullName: string;
    mobileNumber: string;
    email: string | null;
  };
  organization: {
    id: string;
    legalName: string;
    tradingName: string | null;
    entityType: string;
    businessEmail: string | null;
    businessPhone: string | null;
    businessAddress: string | null;
  };
  sections: ApplicationSectionSummary[];
  businessSnapshot: BusinessSnapshotPayload | null;
  merchantContacts: MerchantContactsPayload | null;
  merchantBanking: MerchantBankingPayload | null;
  merchantDeclaration: MerchantDeclarationPayload | null;
  agentContacts: AgentContactsPayload | null;
  agentOperations: AgentOperationsPayload | null;
  agentDeclaration: MerchantDeclarationPayload | null;
  payerContacts: PayerContactsPayload | null;
  payerSettlement: PayerSettlementPayload | null;
  payerDeclaration: MerchantDeclarationPayload | null;
  uploadedDocuments: UploadedDocumentSummary[];
  documentChecklist: DocumentChecklistSummaryItem[];
  documentReviewSummary: DocumentReviewSummary;
  comments: ReviewCommentSummary[];
  statusHistory: ApplicationStatusHistorySummary[];
  reviewTasks: ReviewTaskSummary[];
}

export interface ApplicationCommentPayload {
  message: string;
  sectionKey?: string;
  visibility?: string;
  commentType?: string;
}

const normalizeString = (value: string): string => value.trim();

const normalizeOptionalString = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const isActiveStatus = (status: string): boolean =>
  ACTIVE_APPLICATION_STATUSES.has(status);

const isAdminActor = (actor: ApplicationActor): boolean =>
  actor.role === USER_ROLES.admin;

const COMMENT_VISIBILITIES = {
  applicant: "applicant",
  internal: "internal"
} as const;

const VALID_COMMENT_VISIBILITIES = new Set<string>(
  Object.values(COMMENT_VISIBILITIES)
);

const VALID_SECTION_KEYS = new Set<string>(Object.values(SECTION_KEYS));

const assertApplicationEditable = (status: string): void => {
  if (
    status !== APPLICATION_STATUSES.draft &&
    status !== APPLICATION_STATUSES.needsMoreInformation
  ) {
    throw new Error("This application can no longer be edited.");
  }
};

const normalizeOptionalEmail = (value?: string): string | null => {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
};

const assertApplicantOwnsApplication = (
  actor: ApplicationActor,
  application: {
    createdByUserId: string;
    organization: {
      ownerUserId: string;
    };
  }
): void => {
  if (isAdminActor(actor)) {
    return;
  }

  if (
    application.createdByUserId !== actor.id &&
    application.organization.ownerUserId !== actor.id
  ) {
    throw new Error("You do not have access to this application.");
  }
};

const getOwnedOrganization = async (
  client: PrismaWriteClient,
  actor: ApplicationActor
) => {
  const organization = await client.organization.findUnique({
    where: {
      ownerUserId: actor.id
    },
    include: {
      activeApplication: true
    }
  });

  if (!organization) {
    throw new Error("No organization is linked to the current account.");
  }

  return organization;
};

const parseSectionData = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const normalizeDocumentStatus = (status: string): string =>
  status === "uploaded" ? "pending" : status;

const normalizeContactPerson = (
  contact: MerchantContactPersonPayload
): MerchantContactPersonPayload => ({
  fullName: normalizeString(contact.fullName),
  email: normalizeEmail(contact.email),
  phoneNumber: normalizeString(contact.phoneNumber),
  designation: normalizeOptionalString(contact.designation) || undefined,
  residentialAddress:
    normalizeOptionalString(contact.residentialAddress) || undefined
});

const normalizeParticipants = (
  participants: MerchantTransactorPayload[]
): MerchantTransactorPayload[] =>
  participants
    .map((participant) => ({
      fullName: normalizeOptionalString(participant.fullName) || "",
      designation: normalizeOptionalString(participant.designation) || undefined,
      email: normalizeOptionalEmail(participant.email) || undefined,
      phoneNumber: normalizeOptionalString(participant.phoneNumber) || undefined,
      nationalIdNumber:
        normalizeOptionalString(participant.nationalIdNumber) || undefined,
      residentialAddress:
        normalizeOptionalString(participant.residentialAddress) || undefined
    }))
    .filter((participant) => participant.fullName.length > 0);

const normalizeSignatories = (
  signatories: MerchantSignatoryPayload[]
): MerchantSignatoryPayload[] =>
  signatories
    .map((signatory) => ({
      ...(normalizeParticipants([signatory])[0] || {
        fullName: ""
      }),
      isPrimarySignatory: Boolean(signatory.isPrimarySignatory)
    }))
    .filter((signatory) => Boolean(signatory.fullName));

const normalizeBanking = (
  payload: MerchantBankingPayload
): MerchantBankingPayload => ({
  accountName: normalizeString(payload.accountName),
  bankName: normalizeString(payload.bankName),
  branchName: normalizeOptionalString(payload.branchName) || undefined,
  branchCode: normalizeOptionalString(payload.branchCode) || undefined,
  accountNumber: normalizeString(payload.accountNumber),
  accountType: normalizeOptionalString(payload.accountType) || undefined,
  currency:
    normalizeOptionalString(payload.currency)?.toUpperCase() || "USD"
});

const normalizeDeclaration = (
  payload: MerchantDeclarationPayload
): MerchantDeclarationPayload => ({
  signerName: normalizeString(payload.signerName),
  signerTitle: normalizeOptionalString(payload.signerTitle) || undefined,
  acceptedTerms: Boolean(payload.acceptedTerms),
  certifiedInformation: Boolean(payload.certifiedInformation),
  authorizedToAct: Boolean(payload.authorizedToAct)
});

const normalizeAgentDirectors = (
  directors: AgentDirectorPayload[]
): AgentDirectorPayload[] =>
  directors
    .map((director) => ({
      ...(normalizeParticipants([director])[0] || {
        fullName: ""
      }),
      isPrimaryDirector: Boolean(director.isPrimaryDirector)
    }))
    .filter((director) => Boolean(director.fullName));

const normalizeOutlets = (outlets: AgentOutletPayload[]): AgentOutletPayload[] =>
  outlets
    .map((outlet) => ({
      name: normalizeOptionalString(outlet.name) || "",
      location:
        normalizeOptionalString(outlet.location) ||
        normalizeOptionalString(outlet.addressLine1) ||
        undefined,
      contactPerson:
        normalizeOptionalString(outlet.contactPerson) || undefined,
      code: normalizeOptionalString(outlet.code) || undefined,
      phoneNumber: normalizeOptionalString(outlet.phoneNumber) || undefined,
      email: normalizeOptionalEmail(outlet.email) || undefined,
      addressLine1:
        normalizeOptionalString(outlet.addressLine1) ||
        normalizeOptionalString(outlet.location) ||
        undefined,
      addressLine2: normalizeOptionalString(outlet.addressLine2) || undefined,
      city: normalizeOptionalString(outlet.city) || undefined,
      province: normalizeOptionalString(outlet.province) || undefined,
      country: normalizeOptionalString(outlet.country) || "Zimbabwe"
    }))
    .filter((outlet) => Boolean(outlet.name));

const normalizePayerSettlement = (
  payload: PayerSettlementStepPayload
): PayerSettlementStepPayload => ({
  settlementMethod: normalizeOptionalString(payload.settlementMethod) || undefined,
  reconciliationEmail: normalizeOptionalEmail(payload.reconciliationEmail) || undefined,
  integrationNotes: normalizeOptionalString(payload.integrationNotes) || undefined
});

const getSectionBlueprints = (applicationType: string) =>
  SECTION_BLUEPRINTS[applicationType] || SECTION_BLUEPRINTS[APPLICATION_TYPES.merchant];

const applicationDetailInclude = Prisma.validator<Prisma.ApplicationInclude>()({
  organization: true,
  createdByUser: {
    select: {
      id: true,
      fullName: true,
      mobileNumber: true,
      email: true
    }
  },
  sections: true,
  comments: {
    orderBy: {
      createdAt: "desc"
    },
    include: {
      authorUser: {
        select: {
          id: true,
          fullName: true,
          role: true
        }
      }
    }
  },
  authorizedTransactors: true,
  directorsSignatories: true,
  bankAccounts: {
    orderBy: {
      createdAt: "asc"
    }
  },
  outlets: {
    orderBy: {
      createdAt: "asc"
    }
  },
  documents: {
    orderBy: {
      createdAt: "desc"
    }
  },
  statusHistory: {
    orderBy: {
      createdAt: "desc"
    }
  },
  reviewTasks: {
    orderBy: {
      createdAt: "desc"
    }
  }
});

type ApplicationDetailRecord = Prisma.ApplicationGetPayload<{
  include: typeof applicationDetailInclude;
}>;

const getDocumentRequirementsForApplication = async (
  applicationType: string,
  entityType: string
) => {
  const requirements = await prisma.documentRequirement.findMany({
    where: {
      applicationType,
      entityType: {
        in: [entityType, "any"]
      }
    }
  });

  const orderedRequirements = requirements
    .slice()
    .sort((left, right) => {
      const leftSpecificity = left.entityType === entityType ? 0 : 1;
      const rightSpecificity = right.entityType === entityType ? 0 : 1;

      if (leftSpecificity !== rightSpecificity) {
        return leftSpecificity - rightSpecificity;
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.label.localeCompare(right.label);
    });

  const requirementByCode = new Map<string, (typeof orderedRequirements)[number]>();

  for (const requirement of orderedRequirements) {
    if (!requirementByCode.has(requirement.code)) {
      requirementByCode.set(requirement.code, requirement);
    }
  }

  return [...requirementByCode.values()];
};

const mapApplicationDetail = async (
  application: ApplicationDetailRecord,
  viewerRole: string = USER_ROLES.admin
): Promise<ApplicationDetailResponse> => {
  const businessSnapshotSection = application.sections.find(
    (section) => section.sectionKey === SECTION_KEYS.businessSnapshot
  );
  const contactsSection = application.sections.find(
    (section) => section.sectionKey === SECTION_KEYS.contactsTransactors
  );
  const contactSectionData =
    parseSectionData<{
      primaryContact: MerchantContactPersonPayload | null;
    }>(contactsSection?.dataJson || null);
  const declarationSection = application.sections.find(
    (section) => section.sectionKey === SECTION_KEYS.declarations
  );
  const declarationSectionData = parseSectionData<MerchantDeclarationPayload>(
    declarationSection?.dataJson || null
  );
  const operationsSection = application.sections.find(
    (section) => section.sectionKey === SECTION_KEYS.operations
  );
  const operationsSectionData = parseSectionData<{
    outlets?: AgentOutletPayload[];
    complianceContact?: string;
    operationalDetails?: string;
    settlementMethod?: string;
    reconciliationEmail?: string;
    integrationNotes?: string;
  }>(operationsSection?.dataJson || null);
  const primaryBankAccount =
    application.bankAccounts.find((bankAccount) => bankAccount.isPrimary) ||
    application.bankAccounts[0];
  const documentRequirements = await getDocumentRequirementsForApplication(
    application.applicationType,
    application.organization.entityType
  );
  const requirementByCode = new Map(
    documentRequirements.map((requirement) => [requirement.code, requirement])
  );
  const uploadedDocuments = application.documents.map((document) => {
    const normalizedStatus = normalizeDocumentStatus(document.status);
    const requirement = document.requirementCode
      ? requirementByCode.get(document.requirementCode)
      : null;

    return {
      id: document.id,
      requirementCode: document.requirementCode,
      label: document.label,
      originalFileName: document.originalFileName,
      status: normalizedStatus,
      isRequired: requirement?.isRequired || false,
      reviewNotes: document.reviewNotes,
      downloadUrl: `/applications/documents/${document.id}/download`,
      uploadedAt: document.createdAt.toISOString(),
      reviewedAt:
        normalizedStatus === "accepted" || normalizedStatus === "rejected"
          ? document.updatedAt.toISOString()
          : null
    };
  });
  const documentsByRequirement = new Map<
    string,
    Array<(typeof uploadedDocuments)[number]>
  >();

  for (const document of uploadedDocuments) {
    if (!document.requirementCode) {
      continue;
    }

    const bucket = documentsByRequirement.get(document.requirementCode) || [];
    bucket.push(document);
    documentsByRequirement.set(document.requirementCode, bucket);
  }

  const documentChecklist = documentRequirements.map((requirement) => {
    const requirementDocuments = documentsByRequirement.get(requirement.code) || [];
    const acceptedCount = requirementDocuments.filter(
      (document) => document.status === "accepted"
    ).length;
    const rejectedCount = requirementDocuments.filter(
      (document) => document.status === "rejected"
    ).length;
    const pendingCount = requirementDocuments.filter(
      (document) => document.status === "pending"
    ).length;

    let status = "missing";

    if (requirementDocuments.length > 0) {
      if (rejectedCount > 0) {
        status = "rejected";
      } else if (pendingCount > 0) {
        status = "pending";
      } else {
        status = "accepted";
      }
    }

    return {
      requirementCode: requirement.code,
      label: requirement.label,
      isRequired: requirement.isRequired,
      status,
      uploadedCount: requirementDocuments.length,
      acceptedCount,
      pendingCount,
      rejectedCount
    };
  });
  const acceptedDocuments = uploadedDocuments.filter(
    (document) => document.status === "accepted"
  ).length;
  const rejectedDocuments = uploadedDocuments.filter(
    (document) => document.status === "rejected"
  ).length;
  const pendingDocuments = uploadedDocuments.length - acceptedDocuments - rejectedDocuments;
  const requiredChecklist = documentChecklist.filter((item) => item.isRequired);
  const acceptedRequiredDocuments = requiredChecklist.filter(
    (item) => item.status === "accepted"
  ).length;
  const comments = application.comments
    .filter((comment) =>
      viewerRole === USER_ROLES.admin
        ? true
        : comment.visibility !== COMMENT_VISIBILITIES.internal
    )
    .map((comment) => ({
      id: comment.id,
      sectionKey: comment.sectionKey,
      visibility: comment.visibility,
      commentType: comment.commentType,
      message: comment.message,
      isResolved: comment.isResolved,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: {
        id: comment.authorUser.id,
        fullName: comment.authorUser.fullName,
        role: comment.authorUser.role
      }
    }));
  const mappedAuthorizedTransactors = application.authorizedTransactors
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((transactor) => ({
      fullName: transactor.fullName,
      designation: transactor.designation || undefined,
      email: transactor.email || undefined,
      phoneNumber: transactor.phoneNumber || undefined,
      nationalIdNumber: transactor.nationalIdNumber || undefined,
      residentialAddress: transactor.residentialAddress || undefined
    }));
  const mappedDirectorsSignatories = application.directorsSignatories
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const mappedSignatories = mappedDirectorsSignatories
    .filter((person) => person.roleTitle !== "director")
    .map((signatory) => ({
      fullName: signatory.fullName,
      designation: signatory.designation || undefined,
      email: signatory.email || undefined,
      phoneNumber: signatory.phoneNumber || undefined,
      nationalIdNumber: signatory.nationalIdNumber || undefined,
      residentialAddress: signatory.residentialAddress || undefined,
      isPrimarySignatory: signatory.isPrimarySignatory
    }));
  const mappedOutlets = application.outlets.map((outlet) => ({
    name: outlet.name,
    location: outlet.addressLine1 || undefined,
    contactPerson: undefined,
    code: outlet.code || undefined,
    phoneNumber: outlet.phoneNumber || undefined,
    email: outlet.email || undefined,
    addressLine1: outlet.addressLine1 || undefined,
    addressLine2: outlet.addressLine2 || undefined,
    city: outlet.city || undefined,
    province: outlet.province || undefined,
    country: outlet.country
  }));

  return {
    applicationId: application.id,
    applicationType: application.applicationType,
    status: application.status,
    currentStep: application.currentStep,
    createdAt: application.createdAt.toISOString(),
    submittedAt: application.submittedAt
      ? application.submittedAt.toISOString()
      : null,
    updatedAt: application.updatedAt.toISOString(),
    startedBy: {
      id: application.createdByUser.id,
      fullName: application.createdByUser.fullName,
      mobileNumber: application.createdByUser.mobileNumber,
      email: application.createdByUser.email
    },
    organization: {
      id: application.organization.id,
      legalName: application.organization.legalName,
      tradingName: application.organization.tradingName,
      entityType: application.organization.entityType,
      businessEmail: application.organization.businessEmail,
      businessPhone: application.organization.businessPhone,
      businessAddress: application.organization.physicalAddressLine1
    },
    sections: application.sections
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((section) => ({
        key: section.sectionKey,
        title: section.title,
        status: section.status,
        sortOrder: section.sortOrder,
        lastEditedAt: section.lastEditedAt
          ? section.lastEditedAt.toISOString()
          : null
      })),
    businessSnapshot: parseSectionData<BusinessSnapshotPayload>(
      businessSnapshotSection?.dataJson || null
    ),
    merchantContacts: contactsSection
      ? {
          primaryContact: contactSectionData?.primaryContact || {
            fullName: "",
            email: "",
            phoneNumber: ""
          },
          authorizedTransactors: mappedAuthorizedTransactors,
          signatories: mappedSignatories
        }
      : null,
    merchantBanking: primaryBankAccount
      ? {
          accountName: primaryBankAccount.accountName,
          bankName: primaryBankAccount.bankName,
          branchName: primaryBankAccount.branchName || undefined,
          branchCode: primaryBankAccount.branchCode || undefined,
          accountNumber: primaryBankAccount.accountNumber,
          accountType: primaryBankAccount.accountType || undefined,
          currency: primaryBankAccount.currency
        }
      : null,
    merchantDeclaration: declarationSectionData,
    agentContacts: contactsSection
      ? {
          primaryContact: contactSectionData?.primaryContact || {
            fullName: "",
            email: "",
            phoneNumber: ""
          },
          authorizedTransactors: mappedAuthorizedTransactors,
          directors: mappedDirectorsSignatories
            .filter((person) => person.roleTitle === "director")
            .map((director) => ({
              fullName: director.fullName,
              designation: director.designation || undefined,
              email: director.email || undefined,
              phoneNumber: director.phoneNumber || undefined,
              nationalIdNumber: director.nationalIdNumber || undefined,
              residentialAddress: director.residentialAddress || undefined,
              isPrimaryDirector: director.isPrimarySignatory
            }))
        }
      : null,
    agentOperations: primaryBankAccount
      ? {
          accountName: primaryBankAccount.accountName,
          bankName: primaryBankAccount.bankName,
          branchName: primaryBankAccount.branchName || undefined,
          branchCode: primaryBankAccount.branchCode || undefined,
          accountNumber: primaryBankAccount.accountNumber,
          accountType: primaryBankAccount.accountType || undefined,
          currency: primaryBankAccount.currency,
          complianceContact: operationsSectionData?.complianceContact,
          operationalDetails: operationsSectionData?.operationalDetails,
          outlets:
            operationsSectionData?.outlets && operationsSectionData.outlets.length > 0
              ? operationsSectionData.outlets
              : mappedOutlets
        }
      : mappedOutlets.length > 0
        ? {
            accountName: "",
            bankName: "",
            branchName: undefined,
            branchCode: undefined,
            accountNumber: "",
            accountType: undefined,
            currency: "USD",
            complianceContact: operationsSectionData?.complianceContact,
            operationalDetails: operationsSectionData?.operationalDetails,
            outlets: mappedOutlets
          }
        : null,
    agentDeclaration: declarationSectionData,
    payerContacts: contactsSection
      ? {
          primaryContact: contactSectionData?.primaryContact || {
            fullName: "",
            email: "",
            phoneNumber: ""
          },
          operationsContacts: mappedAuthorizedTransactors,
          signatories: mappedSignatories
        }
      : null,
    payerSettlement: primaryBankAccount
      ? {
          accountName: primaryBankAccount.accountName,
          bankName: primaryBankAccount.bankName,
          branchName: primaryBankAccount.branchName || undefined,
          branchCode: primaryBankAccount.branchCode || undefined,
          accountNumber: primaryBankAccount.accountNumber,
          accountType: primaryBankAccount.accountType || undefined,
          currency: primaryBankAccount.currency,
          settlementMethod: operationsSectionData?.settlementMethod,
          reconciliationEmail: operationsSectionData?.reconciliationEmail,
          integrationNotes: operationsSectionData?.integrationNotes
        }
      : null,
    payerDeclaration: declarationSectionData,
    uploadedDocuments,
    documentChecklist,
    documentReviewSummary: {
      totalDocuments: uploadedDocuments.length,
      acceptedDocuments,
      pendingDocuments,
      rejectedDocuments,
      requiredDocuments: requiredChecklist.length,
      acceptedRequiredDocuments,
      missingRequiredDocuments: requiredChecklist.filter(
        (item) => item.status === "missing"
      ),
      rejectedRequiredDocuments: requiredChecklist.filter(
        (item) => item.status === "rejected"
      ),
      pendingRequiredDocuments: requiredChecklist.filter(
        (item) => item.status === "pending"
      )
    },
    comments,
    statusHistory: application.statusHistory.map((item) => ({
      id: item.id,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      reason: item.reason,
      createdAt: item.createdAt.toISOString()
    })),
    reviewTasks: application.reviewTasks.map((task) => ({
      id: task.id,
      taskType: task.taskType,
      status: task.status,
      notes: task.notes,
      createdAt: task.createdAt.toISOString(),
      completedAt: task.completedAt ? task.completedAt.toISOString() : null
    }))
  };
};

const ensureDefaultSections = async (
  client: PrismaWriteClient,
  applicationId: string,
  applicationType: string = APPLICATION_TYPES.merchant
): Promise<void> => {
  const blueprints = getSectionBlueprints(applicationType);

  for (const blueprint of blueprints) {
    await client.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: blueprint.key
        }
      },
      create: {
        applicationId,
        sectionKey: blueprint.key,
        title: blueprint.title,
        status: blueprint.status,
        sortOrder: blueprint.sortOrder
      },
      update: {
        title: blueprint.title,
        sortOrder: blueprint.sortOrder
      }
    });
  }
};

const getApplicationWithDetails = async (
  applicationId: string,
  viewerRole: string = USER_ROLES.admin
): Promise<ApplicationDetailResponse | null> => {
  const application = await prisma.application.findUnique({
    where: {
      id: applicationId
    },
    include: applicationDetailInclude
  });

  return application ? await mapApplicationDetail(application, viewerRole) : null;
};

export const getApplicationDetail = async (
  applicationId: string
): Promise<ApplicationDetailResponse | null> =>
  getApplicationWithDetails(applicationId);

export const getApplicationDetailForUser = async (
  applicationId: string,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse | null> => {
  const application = await prisma.application.findUnique({
    where: {
      id: applicationId
    },
    include: {
      organization: true
    }
  });

  if (!application) {
    return null;
  }

  assertApplicantOwnsApplication(actor, application);
  return getApplicationWithDetails(applicationId, actor.role);
};

export const getActiveApplicationDetailForUser = async (
  actor: ApplicationActor,
  applicationType?: string
): Promise<ApplicationDetailResponse | null> => {
  if (isAdminActor(actor)) {
    throw new Error("Only applicant accounts have an active application.");
  }

  const organization = await getOwnedOrganization(prisma, actor);

  if (!organization.activeApplicationId || !organization.activeApplication) {
    return null;
  }

  if (
    applicationType &&
    organization.activeApplication.applicationType !== applicationType
  ) {
    return null;
  }

  if (!isActiveStatus(organization.activeApplication.status)) {
    await prisma.organization.update({
      where: {
        id: organization.id
      },
      data: {
        activeApplicationId: null
      }
    });

    return null;
  }

  return getApplicationWithDetails(organization.activeApplicationId, actor.role);
};

const resolveOwnedActiveApplication = async (
  client: PrismaWriteClient,
  organization: {
    id: string;
    activeApplicationId: string | null;
    activeApplication?: PrismaApplication | null;
  },
  expectedApplicationType: string
): Promise<PrismaApplication | null> => {
  if (!organization.activeApplication) {
    return null;
  }

  if (!isActiveStatus(organization.activeApplication.status)) {
    await client.organization.update({
      where: {
        id: organization.id
      },
      data: {
        activeApplicationId: null
      }
    });

    return null;
  }

  if (organization.activeApplication.applicationType !== expectedApplicationType) {
    throw new Error(
      `Finish or close your current ${organization.activeApplication.applicationType} application before starting a ${expectedApplicationType} application.`
    );
  }

  return organization.activeApplication;
};

const normalizeCommentVisibility = (
  value: string | undefined,
  actor: ApplicationActor
): string => {
  if (!isAdminActor(actor)) {
    return COMMENT_VISIBILITIES.applicant;
  }

  const normalized = normalizeOptionalString(value)?.toLowerCase();

  if (!normalized) {
    return COMMENT_VISIBILITIES.applicant;
  }

  if (!VALID_COMMENT_VISIBILITIES.has(normalized)) {
    throw new Error("Comment visibility must be applicant or internal.");
  }

  return normalized;
};

const normalizeCommentSectionKey = (value?: string): string | null => {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  if (!VALID_SECTION_KEYS.has(normalized)) {
    throw new Error("Comment section must match a valid application section.");
  }

  return normalized;
};

const ensureCommentsEditable = (
  actor: ApplicationActor,
  application: {
    status: string;
  },
  visibility: string
): void => {
  if (
    application.status === APPLICATION_STATUSES.approved ||
    application.status === APPLICATION_STATUSES.rejected ||
    application.status === APPLICATION_STATUSES.activated ||
    application.status === APPLICATION_STATUSES.archived
  ) {
    throw new Error("Comments are locked once the application is closed.");
  }

  if (!isAdminActor(actor)) {
    if (visibility === COMMENT_VISIBILITIES.internal) {
      throw new Error("Applicants cannot view or manage internal comments.");
    }

    if (application.status !== APPLICATION_STATUSES.needsMoreInformation) {
      throw new Error(
        "Applicants can only comment when more information has been requested."
      );
    }
  } else if (application.status === APPLICATION_STATUSES.draft) {
    throw new Error("Comments can only be added after the application is submitted.");
  }
};

export const createApplicationComment = async (
  applicationId: string,
  payload: ApplicationCommentPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const message = normalizeOptionalString(payload.message);

  if (!message) {
    throw new Error("A comment message is required.");
  }

  const visibility = normalizeCommentVisibility(payload.visibility, actor);
  const sectionKey = normalizeCommentSectionKey(payload.sectionKey);
  const commentType = normalizeOptionalString(payload.commentType)
    ? normalizeString(payload.commentType as string).toLowerCase()
    : isAdminActor(actor)
      ? "general"
      : "response";

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    ensureCommentsEditable(actor, application, visibility);

    await transaction.reviewComment.create({
      data: {
        applicationId,
        authorUserId: actor.id,
        sectionKey,
        visibility,
        commentType,
        message,
        isResolved: false
      }
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: actor.id,
        entityType: "application_comment",
        entityId: applicationId,
        action: "comment_created",
        summary: "Application comment added.",
        detailsJson: JSON.stringify({
          sectionKey,
          visibility,
          commentType
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const updateApplicationCommentResolution = async (
  commentId: string,
  isResolved: boolean,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const response = await prisma.$transaction(async (transaction) => {
    const comment = await transaction.reviewComment.findUnique({
      where: {
        id: commentId
      },
      include: {
        application: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!comment) {
      throw new Error("Comment not found.");
    }

    assertApplicantOwnsApplication(actor, comment.application);
    ensureCommentsEditable(actor, comment.application, comment.visibility);

    await transaction.reviewComment.update({
      where: {
        id: commentId
      },
      data: {
        isResolved
      }
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: actor.id,
        entityType: "application_comment",
        entityId: commentId,
        action: isResolved ? "comment_resolved" : "comment_reopened",
        summary: isResolved
          ? "Application comment marked as resolved."
          : "Application comment marked as unresolved.",
        detailsJson: JSON.stringify({
          applicationId: comment.applicationId,
          visibility: comment.visibility,
          sectionKey: comment.sectionKey
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: comment.applicationId
      },
      include: applicationDetailInclude
    });

    return mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const saveMerchantDraft = async (
  payload: MerchantDraftPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const entityType = normalizeString(payload.entityType);
  const legalName = normalizeString(payload.legalName);
  const contactPerson = normalizeString(payload.contactPerson);
  const businessEmail = normalizeEmail(payload.businessEmail);
  const tradingName = normalizeOptionalString(payload.tradingName);
  const businessPhone = normalizeOptionalString(payload.businessPhone);
  const projectedTransactions = normalizeOptionalString(
    payload.projectedTransactions
  );
  const businessAddress = normalizeOptionalString(payload.businessAddress);
  const productsDescription = normalizeOptionalString(
    payload.productsDescription
  );

  const now = new Date();

  const response = await prisma.$transaction(
    async (transaction) => {
      const organization = await getOwnedOrganization(transaction, actor);

      let application: PrismaApplication | null = null;

      if (payload.applicationId) {
        const requestedApplication = await transaction.application.findUnique({
          where: {
            id: payload.applicationId
          },
          include: {
            organization: true
          }
        });

        if (requestedApplication) {
          assertApplicantOwnsApplication(actor, requestedApplication);

          if (
            requestedApplication.applicationType !== APPLICATION_TYPES.merchant
          ) {
            throw new Error("The requested application is not a merchant application.");
          }

          application = requestedApplication;
        }
      }

      const updatedOrganization = await transaction.organization.update({
        where: {
          id: organization.id
        },
        data: {
          legalName,
          tradingName,
          entityType,
          businessEmail,
          businessPhone,
          physicalAddressLine1: businessAddress
        },
        include: {
          activeApplication: true
        }
      });

      if (!application) {
        application = await resolveOwnedActiveApplication(
          transaction,
          updatedOrganization,
          APPLICATION_TYPES.merchant
        );
      }

      if (!application) {
        application = await transaction.application.create({
          data: {
            organizationId: updatedOrganization.id,
            createdByUserId: actor.id,
            applicationType: APPLICATION_TYPES.merchant,
            status: APPLICATION_STATUSES.draft,
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });

        await transaction.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            changedByUserId: actor.id,
            fromStatus: null,
            toStatus: APPLICATION_STATUSES.draft,
            reason: "Merchant draft created."
          }
        });

        await transaction.organization.update({
          where: {
            id: updatedOrganization.id
          },
          data: {
            activeApplicationId: application.id
          }
        });
      } else {
        assertApplicationEditable(application.status);

        application = await transaction.application.update({
          where: {
            id: application.id
          },
          data: {
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });
      }

      await ensureDefaultSections(transaction, application.id);

      await transaction.applicationSection.upsert({
        where: {
          applicationId_sectionKey: {
            applicationId: application.id,
            sectionKey: SECTION_KEYS.businessSnapshot
          }
        },
        create: {
          applicationId: application.id,
          sectionKey: SECTION_KEYS.businessSnapshot,
          title: "Business Snapshot",
          status: "completed",
          sortOrder: 1,
          lastEditedAt: now,
          dataJson: JSON.stringify({
            applicationId: application.id,
            entityType,
            legalName,
            tradingName,
            contactPerson,
            businessEmail,
            businessPhone,
            projectedTransactions,
            businessAddress,
            productsDescription
          })
        },
        update: {
          status: "completed",
          lastEditedAt: now,
          dataJson: JSON.stringify({
            applicationId: application.id,
            entityType,
            legalName,
            tradingName,
            contactPerson,
            businessEmail,
            businessPhone,
            projectedTransactions,
            businessAddress,
            productsDescription
          })
        }
      });

      const detailedApplication =
        await transaction.application.findUniqueOrThrow({
          where: {
            id: application.id
          },
          include: applicationDetailInclude
        });

      return await mapApplicationDetail(detailedApplication, actor.role);
    },
    TRANSACTION_OPTIONS
  );

  return response;
};

export const saveMerchantContacts = async (
  applicationId: string,
  payload: MerchantContactsPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const primaryContact = normalizeContactPerson(payload.primaryContact);
  const authorizedTransactors = normalizeParticipants(
    payload.authorizedTransactors || []
  );
  const signatories = normalizeSignatories(payload.signatories || []);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);
    await ensureDefaultSections(transaction, applicationId);

    await transaction.authorizedTransactor.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.directorSignatory.deleteMany({
      where: {
        applicationId
      }
    });

    if (authorizedTransactors.length > 0) {
      await transaction.authorizedTransactor.createMany({
        data: authorizedTransactors.map((transactor, index) => ({
          applicationId,
          fullName: transactor.fullName,
          designation: transactor.designation || null,
          email: transactor.email || null,
          phoneNumber: transactor.phoneNumber || null,
          nationalIdNumber: transactor.nationalIdNumber || null,
          residentialAddress: transactor.residentialAddress || null,
          sortOrder: index + 1
        }))
      });
    }

    if (signatories.length > 0) {
      await transaction.directorSignatory.createMany({
        data: signatories.map((signatory, index) => ({
          applicationId,
          fullName: signatory.fullName,
          roleTitle: "signatory",
          designation: signatory.designation || null,
          email: signatory.email || null,
          phoneNumber: signatory.phoneNumber || null,
          nationalIdNumber: signatory.nationalIdNumber || null,
          residentialAddress: signatory.residentialAddress || null,
          isPrimarySignatory: Boolean(signatory.isPrimarySignatory),
          sortOrder: index + 1
        }))
      });
    }

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.bankingDetails
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.contactsTransactors
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.contactsTransactors,
        title: "Contacts & Authorized Transactors",
        status: "completed",
        sortOrder: 2,
        lastEditedAt: now,
        dataJson: JSON.stringify({
          primaryContact
        })
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify({
          primaryContact
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const saveMerchantBanking = async (
  applicationId: string,
  payload: MerchantBankingPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const bankingDetails = normalizeBanking(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);
    await ensureDefaultSections(transaction, applicationId);

    await transaction.bankAccount.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.bankAccount.create({
      data: {
        applicationId,
        accountName: bankingDetails.accountName,
        bankName: bankingDetails.bankName,
        branchName: bankingDetails.branchName || null,
        branchCode: bankingDetails.branchCode || null,
        accountNumber: bankingDetails.accountNumber,
        accountType: bankingDetails.accountType || null,
        currency: bankingDetails.currency || "USD",
        isPrimary: true
      }
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.supportingDocuments
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.bankingDetails
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.bankingDetails,
        title: "Banking Details",
        status: "completed",
        sortOrder: 3,
        lastEditedAt: now,
        dataJson: JSON.stringify(bankingDetails)
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify(bankingDetails)
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const submitMerchantApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload,
  actor: ApplicationActor,
  acceptanceIp?: string
): Promise<ApplicationDetailResponse> => {
  const declaration = normalizeDeclaration(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true,
        sections: true,
        documents: true,
        bankAccounts: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    if (
      application.status !== APPLICATION_STATUSES.draft &&
      application.status !== APPLICATION_STATUSES.needsMoreInformation
    ) {
      throw new Error(
        "Only draft or returned applications can be submitted."
      );
    }

    if (
      !declaration.acceptedTerms ||
      !declaration.certifiedInformation ||
      !declaration.authorizedToAct
    ) {
      throw new Error(
        "All declaration confirmations must be accepted before submission."
      );
    }

    await ensureDefaultSections(transaction, applicationId);

    const sectionStatusByKey = new Map(
      application.sections.map((section) => [section.sectionKey, section.status])
    );

    const missingSections = [
      SECTION_KEYS.businessSnapshot,
      SECTION_KEYS.contactsTransactors,
      SECTION_KEYS.bankingDetails
    ].filter((sectionKey) => sectionStatusByKey.get(sectionKey) !== "completed");

    if (missingSections.length > 0) {
      throw new Error(
        "Complete the business, contacts, and banking steps before submitting."
      );
    }

    if (
      !application.bankAccounts.length ||
      sectionStatusByKey.get(SECTION_KEYS.supportingDocuments) !== "completed"
    ) {
      throw new Error(
        "All required supporting documents must be uploaded before submission."
      );
    }

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.declarations
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.declarations,
        title: "Declarations and Review",
        status: "completed",
        sortOrder: 5,
        lastEditedAt: now,
        dataJson: JSON.stringify(declaration)
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify(declaration)
      }
    });

    await transaction.applicationAgreement.deleteMany({
      where: {
        applicationId,
        agreementType: "merchant_terms_v1"
      }
    });

    await transaction.applicationAgreement.create({
      data: {
        applicationId,
        agreementType: "merchant_terms_v1",
        versionLabel: "v1",
        title: "Omari Merchant Terms and Declarations",
        acceptedByUserId: actor.id,
        acceptanceIp: normalizeOptionalString(acceptanceIp) || null,
        snapshotText: JSON.stringify(declaration),
        acceptedAt: now
      }
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        status: APPLICATION_STATUSES.submitted,
        currentStep: SECTION_KEYS.declarations,
        submittedAt: now
      }
    });

    await transaction.applicationStatusHistory.create({
      data: {
        applicationId,
        changedByUserId: actor.id,
        fromStatus: application.status,
        toStatus: APPLICATION_STATUSES.submitted,
        reason: "Merchant application submitted by applicant."
      }
    });

    const existingOpenReviewTask = await transaction.reviewTask.findFirst({
      where: {
        applicationId,
        taskType: "initial_review",
        status: "open"
      }
    });

    if (!existingOpenReviewTask) {
      await transaction.reviewTask.create({
        data: {
          applicationId,
          taskType: "initial_review",
          status: "open",
          notes: "New merchant application awaiting internal review."
        }
      });
    }

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const saveAgentDraft = async (
  payload: AgentDraftPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const entityType = normalizeString(payload.entityType);
  const legalName = normalizeString(payload.legalName);
  const tradingName = normalizeOptionalString(payload.tradingName);
  const contactPerson = normalizeString(payload.contactPerson);
  const businessEmail = normalizeEmail(payload.businessEmail);
  const businessPhone = normalizeOptionalString(payload.businessPhone);
  const businessAddress = normalizeOptionalString(payload.businessAddress);
  const registrationNumber = normalizeOptionalString(payload.registrationNumber);
  const taxNumber = normalizeOptionalString(payload.taxNumber);
  const yearsInOperation = normalizeOptionalString(payload.yearsInOperation);
  const serviceCoverage = normalizeOptionalString(payload.serviceCoverage);
  const outletCountEstimate = normalizeOptionalString(payload.outletCountEstimate);
  const complianceContact = normalizeOptionalString(payload.complianceContact);
  const now = new Date();

  const response = await prisma.$transaction(
    async (transaction) => {
      const organization = await getOwnedOrganization(transaction, actor);

      let application: PrismaApplication | null = null;

      if (payload.applicationId) {
        const requestedApplication = await transaction.application.findUnique({
          where: {
            id: payload.applicationId
          },
          include: {
            organization: true
          }
        });

        if (requestedApplication) {
          assertApplicantOwnsApplication(actor, requestedApplication);

          if (requestedApplication.applicationType !== APPLICATION_TYPES.agent) {
            throw new Error("The requested application is not an agent application.");
          }

          application = requestedApplication;
        }
      }

      const updatedOrganization = await transaction.organization.update({
        where: {
          id: organization.id
        },
        data: {
          legalName,
          tradingName,
          entityType,
          registrationNumber,
          taxNumber,
          businessEmail,
          businessPhone,
          physicalAddressLine1: businessAddress
        },
        include: {
          activeApplication: true
        }
      });

      if (!application) {
        application = await resolveOwnedActiveApplication(
          transaction,
          updatedOrganization,
          APPLICATION_TYPES.agent
        );
      }

      if (!application) {
        application = await transaction.application.create({
          data: {
            organizationId: updatedOrganization.id,
            createdByUserId: actor.id,
            applicationType: APPLICATION_TYPES.agent,
            status: APPLICATION_STATUSES.draft,
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });

        await transaction.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            changedByUserId: actor.id,
            fromStatus: null,
            toStatus: APPLICATION_STATUSES.draft,
            reason: "Agent draft created."
          }
        });

        await transaction.organization.update({
          where: {
            id: updatedOrganization.id
          },
          data: {
            activeApplicationId: application.id
          }
        });
      } else {
        assertApplicationEditable(application.status);

        application = await transaction.application.update({
          where: {
            id: application.id
          },
          data: {
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });
      }

      await ensureDefaultSections(transaction, application.id, APPLICATION_TYPES.agent);

      await transaction.applicationSection.upsert({
        where: {
          applicationId_sectionKey: {
            applicationId: application.id,
            sectionKey: SECTION_KEYS.businessSnapshot
          }
        },
        create: {
          applicationId: application.id,
          sectionKey: SECTION_KEYS.businessSnapshot,
          title: "Business Snapshot",
          status: "completed",
          sortOrder: 1,
          lastEditedAt: now,
          dataJson: JSON.stringify({
            applicationId: application.id,
            entityType,
            legalName,
            tradingName,
            contactPerson,
            businessEmail,
            businessPhone,
            businessAddress,
            registrationNumber,
            taxNumber,
            yearsInOperation,
            serviceCoverage,
            outletCountEstimate,
            complianceContact
          })
        },
        update: {
          status: "completed",
          lastEditedAt: now,
          dataJson: JSON.stringify({
            applicationId: application.id,
            entityType,
            legalName,
            tradingName,
            contactPerson,
            businessEmail,
            businessPhone,
            businessAddress,
            registrationNumber,
            taxNumber,
            yearsInOperation,
            serviceCoverage,
            outletCountEstimate,
            complianceContact
          })
        }
      });

      const detailedApplication =
        await transaction.application.findUniqueOrThrow({
          where: {
            id: application.id
          },
          include: applicationDetailInclude
        });

      return await mapApplicationDetail(detailedApplication, actor.role);
    },
    TRANSACTION_OPTIONS
  );

  return response;
};

export const saveAgentContacts = async (
  applicationId: string,
  payload: AgentContactsPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const primaryContact = normalizeContactPerson(payload.primaryContact);
  const authorizedTransactors = normalizeParticipants(
    payload.authorizedTransactors || []
  );
  const directors = normalizeAgentDirectors(payload.directors || []);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);

    if (application.applicationType !== APPLICATION_TYPES.agent) {
      throw new Error("The requested application is not an agent application.");
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.agent);

    await transaction.authorizedTransactor.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.directorSignatory.deleteMany({
      where: {
        applicationId
      }
    });

    if (authorizedTransactors.length > 0) {
      await transaction.authorizedTransactor.createMany({
        data: authorizedTransactors.map((transactor, index) => ({
          applicationId,
          fullName: transactor.fullName,
          designation: transactor.designation || null,
          email: transactor.email || null,
          phoneNumber: transactor.phoneNumber || null,
          nationalIdNumber: transactor.nationalIdNumber || null,
          residentialAddress: transactor.residentialAddress || null,
          sortOrder: index + 1
        }))
      });
    }

    if (directors.length > 0) {
      await transaction.directorSignatory.createMany({
        data: directors.map((director, index) => ({
          applicationId,
          fullName: director.fullName,
          roleTitle: "director",
          designation: director.designation || null,
          email: director.email || null,
          phoneNumber: director.phoneNumber || null,
          nationalIdNumber: director.nationalIdNumber || null,
          residentialAddress: director.residentialAddress || null,
          isPrimarySignatory: Boolean(director.isPrimaryDirector),
          sortOrder: index + 1
        }))
      });
    }

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.bankingDetails
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.contactsTransactors
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.contactsTransactors,
        title: "Directors & Authorized Transactors",
        status: "completed",
        sortOrder: 2,
        lastEditedAt: now,
        dataJson: JSON.stringify({
          primaryContact
        })
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify({
          primaryContact
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const saveAgentOperations = async (
  applicationId: string,
  payload: AgentOperationsStepPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const outlets = normalizeOutlets(payload.outlets || []);
  const complianceContact =
    normalizeOptionalString(payload.complianceContact) || undefined;
  const operationalDetails =
    normalizeOptionalString(payload.operationalDetails) || undefined;
  const now = new Date();

  if (outlets.length === 0) {
    throw new Error("At least one outlet is required for an agent application.");
  }

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);

    if (application.applicationType !== APPLICATION_TYPES.agent) {
      throw new Error("The requested application is not an agent application.");
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.agent);

    const primaryBankAccount = await transaction.bankAccount.findFirst({
      where: {
        applicationId,
        isPrimary: true
      }
    });

    if (!primaryBankAccount) {
      throw new Error("Save banking details before completing operations.");
    }

    await transaction.outlet.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.outlet.createMany({
      data: outlets.map((outlet) => ({
        applicationId,
        name: outlet.name,
        code: outlet.code || null,
        phoneNumber: outlet.phoneNumber || null,
        email: outlet.email || null,
        addressLine1: outlet.addressLine1 || null,
        addressLine2: outlet.addressLine2 || null,
        city: outlet.city || null,
        province: outlet.province || null,
        country: outlet.country || "Zimbabwe",
        status: "active"
      }))
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.supportingDocuments
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.operations
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.operations,
        title: "Outlets & Operations",
        status: "completed",
        sortOrder: 4,
        lastEditedAt: now,
        dataJson: JSON.stringify({
          outlets,
          complianceContact,
          operationalDetails
        })
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify({
          outlets,
          complianceContact,
          operationalDetails
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const saveAgentBanking = async (
  applicationId: string,
  payload: AgentBankingPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const bankingDetails = normalizeBanking(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);

    if (application.applicationType !== APPLICATION_TYPES.agent) {
      throw new Error("The requested application is not an agent application.");
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.agent);

    await transaction.bankAccount.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.bankAccount.create({
      data: {
        applicationId,
        accountName: bankingDetails.accountName,
        bankName: bankingDetails.bankName,
        branchName: bankingDetails.branchName || null,
        branchCode: bankingDetails.branchCode || null,
        accountNumber: bankingDetails.accountNumber,
        accountType: bankingDetails.accountType || null,
        currency: bankingDetails.currency || "USD",
        isPrimary: true
      }
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.operations
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.bankingDetails
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.bankingDetails,
        title: "Banking Details",
        status: "completed",
        sortOrder: 3,
        lastEditedAt: now,
        dataJson: JSON.stringify(bankingDetails)
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify(bankingDetails)
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const submitAgentApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload,
  actor: ApplicationActor,
  acceptanceIp?: string
): Promise<ApplicationDetailResponse> => {
  const declaration = normalizeDeclaration(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true,
        sections: true,
        documents: true,
        bankAccounts: true,
        outlets: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);

    if (application.applicationType !== APPLICATION_TYPES.agent) {
      throw new Error("The requested application is not an agent application.");
    }

    if (
      application.status !== APPLICATION_STATUSES.draft &&
      application.status !== APPLICATION_STATUSES.needsMoreInformation
    ) {
      throw new Error("Only draft or returned applications can be submitted.");
    }

    if (
      !declaration.acceptedTerms ||
      !declaration.certifiedInformation ||
      !declaration.authorizedToAct
    ) {
      throw new Error(
        "All declaration confirmations must be accepted before submission."
      );
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.agent);

    const sectionStatusByKey = new Map(
      application.sections.map((section) => [section.sectionKey, section.status])
    );

    const missingSections = [
      SECTION_KEYS.businessSnapshot,
      SECTION_KEYS.contactsTransactors,
      SECTION_KEYS.bankingDetails,
      SECTION_KEYS.operations
    ].filter((sectionKey) => sectionStatusByKey.get(sectionKey) !== "completed");

    if (missingSections.length > 0) {
      throw new Error(
        "Complete the business, directors, banking, and operations sections before submitting."
      );
    }

    if (
      !application.bankAccounts.length ||
      !application.outlets.length ||
      sectionStatusByKey.get(SECTION_KEYS.supportingDocuments) !== "completed"
    ) {
      throw new Error(
        "All required supporting documents, outlets, and banking details must be completed before submission."
      );
    }

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.declarations
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.declarations,
        title: "Declarations and Review",
        status: "completed",
        sortOrder: 5,
        lastEditedAt: now,
        dataJson: JSON.stringify(declaration)
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify(declaration)
      }
    });

    await transaction.applicationAgreement.deleteMany({
      where: {
        applicationId,
        agreementType: "agent_terms_v1"
      }
    });

    await transaction.applicationAgreement.create({
      data: {
        applicationId,
        agreementType: "agent_terms_v1",
        versionLabel: "v1",
        title: "Omari Agent Terms and Declarations",
        acceptedByUserId: actor.id,
        acceptanceIp: normalizeOptionalString(acceptanceIp) || null,
        snapshotText: JSON.stringify(declaration),
        acceptedAt: now
      }
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        status: APPLICATION_STATUSES.submitted,
        currentStep: SECTION_KEYS.declarations,
        submittedAt: now
      }
    });

    await transaction.applicationStatusHistory.create({
      data: {
        applicationId,
        changedByUserId: actor.id,
        fromStatus: application.status,
        toStatus: APPLICATION_STATUSES.submitted,
        reason: "Agent application submitted by applicant."
      }
    });

    const existingOpenReviewTask = await transaction.reviewTask.findFirst({
      where: {
        applicationId,
        taskType: "initial_review",
        status: "open"
      }
    });

    if (!existingOpenReviewTask) {
      await transaction.reviewTask.create({
        data: {
          applicationId,
          taskType: "initial_review",
          status: "open",
          notes: "New agent application awaiting internal review."
        }
      });
    }

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const savePayerDraft = async (
  payload: PayerDraftPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const entityType = normalizeString(payload.entityType);
  const legalName = normalizeString(payload.legalName);
  const tradingName = normalizeOptionalString(payload.tradingName);
  const contactPerson = normalizeString(payload.contactPerson);
  const businessEmail = normalizeEmail(payload.businessEmail);
  const businessPhone = normalizeOptionalString(payload.businessPhone);
  const businessAddress = normalizeOptionalString(payload.businessAddress);
  const projectedTransactions = normalizeOptionalString(
    payload.projectedTransactions
  );
  const productsDescription = normalizeOptionalString(
    payload.productsDescription
  );
  const registrationNumber = normalizeOptionalString(payload.registrationNumber);
  const taxNumber = normalizeOptionalString(payload.taxNumber);
  const serviceCoverage = normalizeOptionalString(payload.serviceCoverage);
  const now = new Date();

  const response = await prisma.$transaction(
    async (transaction) => {
      const organization = await getOwnedOrganization(transaction, actor);

      let application: PrismaApplication | null = null;

      if (payload.applicationId) {
        const requestedApplication = await transaction.application.findUnique({
          where: {
            id: payload.applicationId
          },
          include: {
            organization: true
          }
        });

        if (requestedApplication) {
          assertApplicantOwnsApplication(actor, requestedApplication);

          if (requestedApplication.applicationType !== APPLICATION_TYPES.payer) {
            throw new Error("The requested application is not a payer application.");
          }

          application = requestedApplication;
        }
      }

      const updatedOrganization = await transaction.organization.update({
        where: {
          id: organization.id
        },
        data: {
          legalName,
          tradingName,
          entityType,
          registrationNumber,
          taxNumber,
          businessEmail,
          businessPhone,
          physicalAddressLine1: businessAddress
        },
        include: {
          activeApplication: true
        }
      });

      if (!application) {
        application = await resolveOwnedActiveApplication(
          transaction,
          updatedOrganization,
          APPLICATION_TYPES.payer
        );
      }

      if (!application) {
        application = await transaction.application.create({
          data: {
            organizationId: updatedOrganization.id,
            createdByUserId: actor.id,
            applicationType: APPLICATION_TYPES.payer,
            status: APPLICATION_STATUSES.draft,
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });

        await transaction.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            changedByUserId: actor.id,
            fromStatus: null,
            toStatus: APPLICATION_STATUSES.draft,
            reason: "Payer application draft created."
          }
        });

        await transaction.organization.update({
          where: {
            id: updatedOrganization.id
          },
          data: {
            activeApplicationId: application.id
          }
        });
      } else {
        assertApplicationEditable(application.status);

        application = await transaction.application.update({
          where: {
            id: application.id
          },
          data: {
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });
      }

      await ensureDefaultSections(transaction, application.id, APPLICATION_TYPES.payer);

      await transaction.applicationSection.upsert({
        where: {
          applicationId_sectionKey: {
            applicationId: application.id,
            sectionKey: SECTION_KEYS.businessSnapshot
          }
        },
        create: {
          applicationId: application.id,
          sectionKey: SECTION_KEYS.businessSnapshot,
          title: "Business Snapshot",
          status: "completed",
          sortOrder: 1,
          lastEditedAt: now,
          dataJson: JSON.stringify({
            applicationId: application.id,
            entityType,
            legalName,
            tradingName,
            contactPerson,
            businessEmail,
            businessPhone,
            businessAddress,
            projectedTransactions,
            productsDescription,
            registrationNumber,
            taxNumber,
            serviceCoverage
          })
        },
        update: {
          status: "completed",
          lastEditedAt: now,
          dataJson: JSON.stringify({
            applicationId: application.id,
            entityType,
            legalName,
            tradingName,
            contactPerson,
            businessEmail,
            businessPhone,
            businessAddress,
            projectedTransactions,
            productsDescription,
            registrationNumber,
            taxNumber,
            serviceCoverage
          })
        }
      });

      const detailedApplication =
        await transaction.application.findUniqueOrThrow({
          where: {
            id: application.id
          },
          include: applicationDetailInclude
        });

      return await mapApplicationDetail(detailedApplication, actor.role);
    },
    TRANSACTION_OPTIONS
  );

  return response;
};

export const savePayerContacts = async (
  applicationId: string,
  payload: PayerContactsPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const primaryContact = normalizeContactPerson(payload.primaryContact);
  const operationsContacts = normalizeParticipants(
    payload.operationsContacts || []
  );
  const signatories = normalizeSignatories(payload.signatories || []);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);

    if (application.applicationType !== APPLICATION_TYPES.payer) {
      throw new Error("The requested application is not a payer application.");
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.payer);

    await transaction.authorizedTransactor.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.directorSignatory.deleteMany({
      where: {
        applicationId
      }
    });

    if (operationsContacts.length > 0) {
      await transaction.authorizedTransactor.createMany({
        data: operationsContacts.map((contact, index) => ({
          applicationId,
          fullName: contact.fullName,
          designation: contact.designation || null,
          email: contact.email || null,
          phoneNumber: contact.phoneNumber || null,
          nationalIdNumber: contact.nationalIdNumber || null,
          residentialAddress: contact.residentialAddress || null,
          sortOrder: index + 1
        }))
      });
    }

    if (signatories.length > 0) {
      await transaction.directorSignatory.createMany({
        data: signatories.map((signatory, index) => ({
          applicationId,
          fullName: signatory.fullName,
          roleTitle: "signatory",
          designation: signatory.designation || null,
          email: signatory.email || null,
          phoneNumber: signatory.phoneNumber || null,
          nationalIdNumber: signatory.nationalIdNumber || null,
          residentialAddress: signatory.residentialAddress || null,
          isPrimarySignatory: Boolean(signatory.isPrimarySignatory),
          sortOrder: index + 1
        }))
      });
    }

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.bankingDetails
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.contactsTransactors
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.contactsTransactors,
        title: "Billing Contacts & Signatories",
        status: "completed",
        sortOrder: 2,
        lastEditedAt: now,
        dataJson: JSON.stringify({
          primaryContact
        })
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify({
          primaryContact
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const savePayerSettlement = async (
  applicationId: string,
  payload: PayerSettlementStepPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const settlementDetails = normalizePayerSettlement(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);

    if (application.applicationType !== APPLICATION_TYPES.payer) {
      throw new Error("The requested application is not a payer application.");
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.payer);

    const primaryBankAccount = await transaction.bankAccount.findFirst({
      where: {
        applicationId,
        isPrimary: true
      }
    });

    if (!primaryBankAccount) {
      throw new Error("Save banking details before completing settlement configuration.");
    }

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.supportingDocuments
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.operations
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.operations,
        title: "Settlement Configuration",
        status: "completed",
        sortOrder: 4,
        lastEditedAt: now,
        dataJson: JSON.stringify({
          settlementMethod: settlementDetails.settlementMethod,
          reconciliationEmail: settlementDetails.reconciliationEmail,
          integrationNotes: settlementDetails.integrationNotes
        })
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify({
          settlementMethod: settlementDetails.settlementMethod,
          reconciliationEmail: settlementDetails.reconciliationEmail,
          integrationNotes: settlementDetails.integrationNotes
        })
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const savePayerBanking = async (
  applicationId: string,
  payload: PayerBankingPayload,
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const bankingDetails = normalizeBanking(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);
    assertApplicationEditable(application.status);

    if (application.applicationType !== APPLICATION_TYPES.payer) {
      throw new Error("The requested application is not a payer application.");
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.payer);

    await transaction.bankAccount.deleteMany({
      where: {
        applicationId
      }
    });

    await transaction.bankAccount.create({
      data: {
        applicationId,
        accountName: bankingDetails.accountName,
        bankName: bankingDetails.bankName,
        branchName: bankingDetails.branchName || null,
        branchCode: bankingDetails.branchCode || null,
        accountNumber: bankingDetails.accountNumber,
        accountType: bankingDetails.accountType || null,
        currency: bankingDetails.currency || "USD",
        isPrimary: true
      }
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        currentStep: SECTION_KEYS.operations
      }
    });

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.bankingDetails
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.bankingDetails,
        title: "Banking Details",
        status: "completed",
        sortOrder: 3,
        lastEditedAt: now,
        dataJson: JSON.stringify(bankingDetails)
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify(bankingDetails)
      }
    });

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const submitPayerApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload,
  actor: ApplicationActor,
  acceptanceIp?: string
): Promise<ApplicationDetailResponse> => {
  const declaration = normalizeDeclaration(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: {
        organization: true,
        sections: true,
        documents: true,
        bankAccounts: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    assertApplicantOwnsApplication(actor, application);

    if (application.applicationType !== APPLICATION_TYPES.payer) {
      throw new Error("The requested application is not a payer application.");
    }

    if (
      application.status !== APPLICATION_STATUSES.draft &&
      application.status !== APPLICATION_STATUSES.needsMoreInformation
    ) {
      throw new Error("Only draft or returned applications can be submitted.");
    }

    if (
      !declaration.acceptedTerms ||
      !declaration.certifiedInformation ||
      !declaration.authorizedToAct
    ) {
      throw new Error(
        "All declaration confirmations must be accepted before submission."
      );
    }

    await ensureDefaultSections(transaction, applicationId, APPLICATION_TYPES.payer);

    const sectionStatusByKey = new Map(
      application.sections.map((section) => [section.sectionKey, section.status])
    );

    const missingSections = [
      SECTION_KEYS.businessSnapshot,
      SECTION_KEYS.contactsTransactors,
      SECTION_KEYS.bankingDetails,
      SECTION_KEYS.operations
    ].filter((sectionKey) => sectionStatusByKey.get(sectionKey) !== "completed");

    if (missingSections.length > 0) {
      throw new Error(
        "Complete the business, billing contacts, banking, and settlement sections before submitting."
      );
    }

    if (
      !application.bankAccounts.length ||
      sectionStatusByKey.get(SECTION_KEYS.supportingDocuments) !== "completed"
    ) {
      throw new Error(
        "All required supporting documents and settlement details must be completed before submission."
      );
    }

    await transaction.applicationSection.upsert({
      where: {
        applicationId_sectionKey: {
          applicationId,
          sectionKey: SECTION_KEYS.declarations
        }
      },
      create: {
        applicationId,
        sectionKey: SECTION_KEYS.declarations,
        title: "Declarations and Review",
        status: "completed",
        sortOrder: 5,
        lastEditedAt: now,
        dataJson: JSON.stringify(declaration)
      },
      update: {
        status: "completed",
        lastEditedAt: now,
        dataJson: JSON.stringify(declaration)
      }
    });

    await transaction.applicationAgreement.deleteMany({
      where: {
        applicationId,
        agreementType: "payer_terms_v1"
      }
    });

    await transaction.applicationAgreement.create({
      data: {
        applicationId,
        agreementType: "payer_terms_v1",
        versionLabel: "v1",
        title: "Omari Payments Agreement Terms and Declarations",
        acceptedByUserId: actor.id,
        acceptanceIp: normalizeOptionalString(acceptanceIp) || null,
        snapshotText: JSON.stringify(declaration),
        acceptedAt: now
      }
    });

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        status: APPLICATION_STATUSES.submitted,
        currentStep: SECTION_KEYS.declarations,
        submittedAt: now
      }
    });

    await transaction.applicationStatusHistory.create({
      data: {
        applicationId,
        changedByUserId: actor.id,
        fromStatus: application.status,
        toStatus: APPLICATION_STATUSES.submitted,
        reason: "Payer application submitted by applicant."
      }
    });

    const existingOpenReviewTask = await transaction.reviewTask.findFirst({
      where: {
        applicationId,
        taskType: "initial_review",
        status: "open"
      }
    });

    if (!existingOpenReviewTask) {
      await transaction.reviewTask.create({
        data: {
          applicationId,
          taskType: "initial_review",
          status: "open",
          notes: "New payer application awaiting internal review."
        }
      });
    }

    const detailedApplication = await transaction.application.findUniqueOrThrow({
      where: {
        id: applicationId
      },
      include: applicationDetailInclude
    });

    return await mapApplicationDetail(detailedApplication, actor.role);
  }, TRANSACTION_OPTIONS);

  return response;
};

const updateDocumentSectionStatus = async (
  applicationId: string
): Promise<void> => {
  const application = await prisma.application.findUnique({
    where: {
      id: applicationId
    },
    include: {
      organization: true,
      documents: true
    }
  });

  if (!application) {
    return;
  }

  const requiredRequirements = await prisma.documentRequirement.findMany({
    where: {
      applicationType: application.applicationType,
      entityType: application.organization.entityType,
      isRequired: true
    }
  });

  const uploadedRequirementCodes = new Set(
    application.documents
      .map((document) => document.requirementCode)
      .filter((requirementCode): requirementCode is string => Boolean(requirementCode))
  );

  const allRequiredUploaded =
    requiredRequirements.length > 0 &&
    requiredRequirements.every((requirement) =>
      uploadedRequirementCodes.has(requirement.code)
    );

  await prisma.applicationSection.upsert({
    where: {
      applicationId_sectionKey: {
        applicationId,
        sectionKey: SECTION_KEYS.supportingDocuments
      }
    },
    create: {
      applicationId,
      sectionKey: SECTION_KEYS.supportingDocuments,
      title: "Supporting Documents",
      status: allRequiredUploaded ? "completed" : "in_progress",
      sortOrder: 4,
      lastEditedAt: new Date()
    },
    update: {
      status: allRequiredUploaded ? "completed" : "in_progress",
      lastEditedAt: new Date()
    }
  });
};

export const replaceApplicationDocuments = async (
  applicationId: string,
  requirementCode: string,
  files: Express.Multer.File[],
  actor: ApplicationActor
): Promise<ApplicationDetailResponse> => {
  const normalizedRequirementCode = normalizeString(requirementCode);

  const application = await prisma.application.findUnique({
    where: {
      id: applicationId
    },
    include: {
      organization: true
    }
  });

  if (!application) {
    throw new Error("Application not found.");
  }

  assertApplicantOwnsApplication(actor, application);
  assertApplicationEditable(application.status);
  await prisma.application.update({
    where: {
      id: applicationId
    },
    data: {
      currentStep: SECTION_KEYS.supportingDocuments
    }
  });

  const requirement = await prisma.documentRequirement.findFirst({
    where: {
      applicationType: application.applicationType,
      entityType: application.organization.entityType,
      code: normalizedRequirementCode
    }
  });

  if (!requirement) {
    throw new Error("Document requirement not found for this application.");
  }

  if (files.length > requirement.maxFiles) {
    throw new Error(
      `A maximum of ${requirement.maxFiles} file(s) is allowed for this requirement.`
    );
  }

  const existingDocuments = await prisma.document.findMany({
    where: {
      applicationId,
      requirementCode: normalizedRequirementCode
    }
  });

  for (const document of existingDocuments) {
    await deleteStoredFile(document.storagePath);
  }

  await prisma.document.deleteMany({
    where: {
      applicationId,
      requirementCode: normalizedRequirementCode
    }
  });

  const applicationDirectory = await ensureUploadDirectory(
    "applications",
    applicationId
  );

  for (const file of files) {
    const originalExtension = path.extname(file.originalname).toLowerCase();
    const fileExtension = originalExtension.replace(".", "");
    const safeBaseName = path
      .basename(file.originalname, originalExtension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    const storedFileName = `${normalizedRequirementCode}-${safeBaseName}-${randomUUID()}${originalExtension}`;
    const relativePath = path
      .join("applications", applicationId, storedFileName)
      .replace(/\\/g, "/");

    await writeFile(path.join(applicationDirectory, storedFileName), file.buffer);

    await prisma.document.create({
      data: {
        applicationId,
        uploadedByUserId: actor.id,
        sectionKey: SECTION_KEYS.supportingDocuments,
        requirementCode: normalizedRequirementCode,
        label: requirement.label,
        originalFileName: file.originalname,
        storedFileName,
        mimeType: file.mimetype || "application/octet-stream",
        fileExtension,
        sizeBytes: BigInt(file.size),
        storagePath: relativePath,
        status: "pending",
        reviewNotes: null,
        reviewedByUserId: null
      }
    });
  }

  await updateDocumentSectionStatus(applicationId);

  const detailedApplication = await getApplicationWithDetails(
    applicationId,
    actor.role
  );

  if (!detailedApplication) {
    throw new Error("Application not found after upload.");
  }

  return detailedApplication;
};

export const getApplicationDocumentDownload = async (
  documentId: string,
  actor: ApplicationActor
): Promise<{
  absolutePath: string;
  mimeType: string;
  originalFileName: string;
}> => {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId
    },
    include: {
      application: {
        include: {
          organization: true
        }
      }
    }
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  assertApplicantOwnsApplication(actor, document.application);

  const absolutePath = resolveStoredFilePath(document.storagePath);
  await ensureStoredFileExists(absolutePath);

  return {
    absolutePath,
    mimeType: document.mimeType || "application/octet-stream",
    originalFileName: document.originalFileName
  };
};
