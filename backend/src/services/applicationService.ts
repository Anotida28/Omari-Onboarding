import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import {
  ACTIVE_APPLICATION_STATUSES,
  APPLICATION_STATUSES,
  APPLICATION_TYPES
} from "../constants/application";
import { prisma } from "../lib/prisma";
import { deleteStoredFile, ensureUploadDirectory } from "../lib/uploads";

const SECTION_KEYS = {
  businessSnapshot: "business_snapshot",
  contactsTransactors: "contacts_transactors",
  bankingDetails: "banking_details",
  supportingDocuments: "supporting_documents",
  declarations: "declarations_review"
} as const;

type PrismaWriteClient = Prisma.TransactionClient | typeof prisma;

const DEFAULT_PLACEHOLDER_PASSWORD = "PENDING_ACCOUNT_SETUP";
const TRANSACTION_OPTIONS = {
  maxWait: 10000,
  timeout: 20000
} as const;

export interface MerchantDraftPayload {
  applicationId?: string;
  entityType: string;
  legalName: string;
  tradingName?: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone?: string;
  projectedTransactions?: string;
  businessAddress?: string;
  productsDescription?: string;
}

interface UploadedDocumentSummary {
  id: string;
  requirementCode: string | null;
  label: string;
  originalFileName: string;
  status: string;
  uploadedAt: string;
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

export interface MerchantBankingPayload {
  accountName: string;
  bankName: string;
  branchName?: string;
  branchCode?: string;
  accountNumber: string;
  accountType?: string;
  currency?: string;
}

export interface MerchantDeclarationPayload {
  signerName: string;
  signerTitle?: string;
  acceptedTerms: boolean;
  certifiedInformation: boolean;
  authorizedToAct: boolean;
}

export interface ApplicationDetailResponse {
  applicationId: string;
  applicationType: string;
  status: string;
  currentStep: string | null;
  submittedAt: string | null;
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
  businessSnapshot: MerchantDraftPayload | null;
  merchantContacts: MerchantContactsPayload | null;
  merchantBanking: MerchantBankingPayload | null;
  merchantDeclaration: MerchantDeclarationPayload | null;
  uploadedDocuments: UploadedDocumentSummary[];
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

const mapApplicationDetail = (
  application: Prisma.ApplicationGetPayload<{
    include: {
      organization: true;
      sections: true;
      authorizedTransactors: true;
      directorsSignatories: true;
      bankAccounts: {
        orderBy: {
          createdAt: "asc";
        };
      };
      documents: {
        orderBy: {
          createdAt: "desc";
        };
      };
    };
  }>
): ApplicationDetailResponse => {
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
  const primaryBankAccount =
    application.bankAccounts.find((bankAccount) => bankAccount.isPrimary) ||
    application.bankAccounts[0];

  return {
    applicationId: application.id,
    applicationType: application.applicationType,
    status: application.status,
    currentStep: application.currentStep,
    submittedAt: application.submittedAt
      ? application.submittedAt.toISOString()
      : null,
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
    businessSnapshot: parseSectionData<MerchantDraftPayload>(
      businessSnapshotSection?.dataJson || null
    ),
    merchantContacts: contactsSection
      ? {
          primaryContact: contactSectionData?.primaryContact || {
            fullName: "",
            email: "",
            phoneNumber: ""
          },
          authorizedTransactors: application.authorizedTransactors
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((transactor) => ({
              fullName: transactor.fullName,
              designation: transactor.designation || undefined,
              email: transactor.email || undefined,
              phoneNumber: transactor.phoneNumber || undefined,
              nationalIdNumber: transactor.nationalIdNumber || undefined,
              residentialAddress: transactor.residentialAddress || undefined
            })),
          signatories: application.directorsSignatories
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((signatory) => ({
              fullName: signatory.fullName,
              designation: signatory.designation || undefined,
              email: signatory.email || undefined,
              phoneNumber: signatory.phoneNumber || undefined,
              nationalIdNumber: signatory.nationalIdNumber || undefined,
              residentialAddress: signatory.residentialAddress || undefined,
              isPrimarySignatory: signatory.isPrimarySignatory
            }))
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
    uploadedDocuments: application.documents.map((document) => ({
      id: document.id,
      requirementCode: document.requirementCode,
      label: document.label,
      originalFileName: document.originalFileName,
      status: document.status,
      uploadedAt: document.createdAt.toISOString()
    }))
  };
};

const ensureDefaultSections = async (
  client: PrismaWriteClient,
  applicationId: string
): Promise<void> => {
  await client.applicationSection.upsert({
    where: {
      applicationId_sectionKey: {
        applicationId,
        sectionKey: SECTION_KEYS.businessSnapshot
      }
    },
    create: {
      applicationId,
      sectionKey: SECTION_KEYS.businessSnapshot,
      title: "Business Snapshot",
      status: "in_progress",
      sortOrder: 1
    },
    update: {
      title: "Business Snapshot",
      sortOrder: 1
    }
  });

  await client.applicationSection.upsert({
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
      status: "not_started",
      sortOrder: 2
    },
    update: {
      title: "Contacts & Authorized Transactors",
      sortOrder: 2
    }
  });

  await client.applicationSection.upsert({
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
      status: "not_started",
      sortOrder: 3
    },
    update: {
      title: "Banking Details",
      sortOrder: 3
    }
  });

  await client.applicationSection.upsert({
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
      status: "not_started",
      sortOrder: 4
    },
    update: {
      title: "Supporting Documents",
      sortOrder: 4
    }
  });

  await client.applicationSection.upsert({
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
      status: "not_started",
      sortOrder: 5
    },
    update: {
      title: "Declarations and Review",
      sortOrder: 5
    }
  });
};

const getApplicationWithDetails = async (
  applicationId: string
): Promise<ApplicationDetailResponse | null> => {
  const application = await prisma.application.findUnique({
    where: {
      id: applicationId
    },
    include: {
      organization: true,
      sections: true,
      authorizedTransactors: true,
      directorsSignatories: true,
      bankAccounts: {
        orderBy: {
          createdAt: "asc"
        }
      },
      documents: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  return application ? mapApplicationDetail(application) : null;
};

export const getApplicationDetail = async (
  applicationId: string
): Promise<ApplicationDetailResponse | null> =>
  getApplicationWithDetails(applicationId);

export const saveMerchantDraft = async (
  payload: MerchantDraftPayload
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
      let user = payload.applicationId
        ? await transaction.user.findFirst({
            where: {
              createdApplications: {
                some: {
                  id: payload.applicationId
                }
              }
            }
          })
        : await transaction.user.findUnique({
            where: {
              email: businessEmail
            }
          });

      if (!user) {
        user = await transaction.user.create({
          data: {
            email: businessEmail,
            passwordHash: DEFAULT_PLACEHOLDER_PASSWORD,
            fullName: contactPerson,
            phoneNumber: businessPhone,
            role: "applicant"
          }
        });
      } else {
        user = await transaction.user.update({
          where: {
            id: user.id
          },
          data: {
            email: businessEmail,
            fullName: contactPerson,
            phoneNumber: businessPhone
          }
        });
      }

      let organization = await transaction.organization.findUnique({
        where: {
          ownerUserId: user.id
        },
        include: {
          activeApplication: true
        }
      });

      if (!organization) {
        organization = await transaction.organization.create({
          data: {
            ownerUserId: user.id,
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
      } else {
        organization = await transaction.organization.update({
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
      }

      let application =
        payload.applicationId &&
        (await transaction.application.findUnique({
          where: {
            id: payload.applicationId
          }
        }));

      if (!application && organization.activeApplication) {
        if (
          organization.activeApplication.applicationType ===
            APPLICATION_TYPES.merchant &&
          isActiveStatus(organization.activeApplication.status)
        ) {
          application = organization.activeApplication;
        } else if (!isActiveStatus(organization.activeApplication.status)) {
          await transaction.organization.update({
            where: {
              id: organization.id
            },
            data: {
              activeApplicationId: null
            }
          });
        }
      }

      if (!application) {
        application = await transaction.application.create({
          data: {
            organizationId: organization.id,
            createdByUserId: user.id,
            applicationType: APPLICATION_TYPES.merchant,
            status: APPLICATION_STATUSES.draft,
            currentStep: SECTION_KEYS.contactsTransactors
          }
        });

        await transaction.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            changedByUserId: user.id,
            fromStatus: null,
            toStatus: APPLICATION_STATUSES.draft,
            reason: "Merchant draft created."
          }
        });

        await transaction.organization.update({
          where: {
            id: organization.id
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
          include: {
            organization: true,
            sections: true,
            authorizedTransactors: true,
            directorsSignatories: true,
            bankAccounts: {
              orderBy: {
                createdAt: "asc"
              }
            },
            documents: {
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        });

      return mapApplicationDetail(detailedApplication);
    },
    TRANSACTION_OPTIONS
  );

  return response;
};

export const saveMerchantContacts = async (
  applicationId: string,
  payload: MerchantContactsPayload
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
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

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
      include: {
        organization: true,
        sections: true,
        authorizedTransactors: true,
        directorsSignatories: true,
        bankAccounts: {
          orderBy: {
            createdAt: "asc"
          }
        },
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    return mapApplicationDetail(detailedApplication);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const saveMerchantBanking = async (
  applicationId: string,
  payload: MerchantBankingPayload
): Promise<ApplicationDetailResponse> => {
  const bankingDetails = normalizeBanking(payload);
  const now = new Date();

  const response = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

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
      include: {
        organization: true,
        sections: true,
        authorizedTransactors: true,
        directorsSignatories: true,
        bankAccounts: {
          orderBy: {
            createdAt: "asc"
          }
        },
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    return mapApplicationDetail(detailedApplication);
  }, TRANSACTION_OPTIONS);

  return response;
};

export const submitMerchantApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload,
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
        acceptedByUserId: application.createdByUserId,
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
        changedByUserId: application.createdByUserId,
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
      include: {
        organization: true,
        sections: true,
        authorizedTransactors: true,
        directorsSignatories: true,
        bankAccounts: {
          orderBy: {
            createdAt: "asc"
          }
        },
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    return mapApplicationDetail(detailedApplication);
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
  files: Express.Multer.File[]
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
        uploadedByUserId: application.createdByUserId,
        sectionKey: SECTION_KEYS.supportingDocuments,
        requirementCode: normalizedRequirementCode,
        label: requirement.label,
        originalFileName: file.originalname,
        storedFileName,
        mimeType: file.mimetype || "application/octet-stream",
        fileExtension,
        sizeBytes: BigInt(file.size),
        storagePath: relativePath,
        status: "uploaded"
      }
    });
  }

  await updateDocumentSectionStatus(applicationId);

  const detailedApplication = await getApplicationWithDetails(applicationId);

  if (!detailedApplication) {
    throw new Error("Application not found after upload.");
  }

  return detailedApplication;
};
