import { Prisma } from "@prisma/client";
import {
  APPLICATION_STATUSES,
  ACTIVE_APPLICATION_STATUSES
} from "../constants/application";
import { prisma } from "../lib/prisma";
import {
  ApplicationDetailResponse,
  getApplicationDetail
} from "./applicationService";

export interface ReviewQueueItem {
  applicationId: string;
  applicationType: string;
  status: string;
  currentStep: string | null;
  submittedAt: string | null;
  updatedAt: string;
  organization: {
    legalName: string;
    tradingName: string | null;
    entityType: string;
  };
  sectionProgress: {
    completed: number;
    total: number;
  };
  reviewTask: {
    taskType: string;
    status: string;
  } | null;
}

export interface ReviewQueueResponse {
  scope: string;
  items: ReviewQueueItem[];
}

interface ReviewDecisionPayload {
  note?: string;
}

interface DocumentReviewPayload {
  status: "pending" | "accepted" | "rejected";
  note?: string;
}

const PENDING_REVIEW_STATUSES = [
  APPLICATION_STATUSES.submitted,
  APPLICATION_STATUSES.initialReview,
  APPLICATION_STATUSES.documentCheck,
  APPLICATION_STATUSES.complianceReview,
  APPLICATION_STATUSES.needsMoreInformation
];

const CLOSED_REVIEW_STATUSES = [
  APPLICATION_STATUSES.approved,
  APPLICATION_STATUSES.rejected,
  APPLICATION_STATUSES.activated,
  APPLICATION_STATUSES.archived
];

const REVIEW_TASK_ACTIVE_STATUSES = new Set(["open", "waiting_applicant"]);
const REVIEW_TASK_OPEN_STATUS = "open";
const REVIEW_TASK_WAITING_STATUS = "waiting_applicant";
const REVIEW_TASK_COMPLETED_STATUS = "completed";

const reviewApplicationInclude = {
  organization: true,
  documents: {
    orderBy: {
      createdAt: "desc"
    }
  },
  sections: {
    orderBy: {
      sortOrder: "asc"
    }
  },
  reviewTasks: {
    orderBy: {
      createdAt: "desc"
    }
  }
} as const;

const normalizeOptionalString = (value?: string): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const requireDecisionNote = (value?: string): string => {
  const message = normalizeOptionalString(value);

  if (!message) {
    throw new Error("A note is required for this action.");
  }

  return message;
};

const getDecisionNote = (value?: string): string | null =>
  normalizeOptionalString(value);

const VALID_DOCUMENT_REVIEW_STATUSES = new Set<string>([
  "pending",
  "accepted",
  "rejected"
]);

const resolveScopeStatuses = (scope: string): string[] | undefined => {
  if (scope === "pending") {
    return PENDING_REVIEW_STATUSES;
  }

  if (scope === "closed") {
    return CLOSED_REVIEW_STATUSES;
  }

  return undefined;
};

const getReviewDetailOrThrow = async (
  applicationId: string
): Promise<ApplicationDetailResponse> => {
  const detail = await getApplicationDetail(applicationId);

  if (!detail) {
    throw new Error("Application not found.");
  }

  return detail;
};

const areRequiredDocumentsComplete = async (
  transaction: Prisma.TransactionClient,
  application: {
    applicationType: string;
    organization: { entityType: string };
    documents: Array<{
      requirementCode: string | null;
      status: string;
    }>;
  }
): Promise<boolean> => {
  const requiredRequirements = await transaction.documentRequirement.findMany({
    where: {
      applicationType: application.applicationType,
      entityType: application.organization.entityType,
      isRequired: true
    }
  });

  if (requiredRequirements.length === 0) {
    return true;
  }

  const documentsByRequirement = new Map<string, string[]>();

  for (const document of application.documents) {
    if (!document.requirementCode) {
      continue;
    }

    const bucket = documentsByRequirement.get(document.requirementCode) || [];
    bucket.push(document.status);
    documentsByRequirement.set(document.requirementCode, bucket);
  }

  return requiredRequirements.every((requirement) => {
    const requirementDocuments = documentsByRequirement.get(requirement.code) || [];

    return (
      requirementDocuments.length > 0 &&
      requirementDocuments.every((status) => status === "accepted")
    );
  });
};

const updateReviewTaskState = async (
  transaction: Prisma.TransactionClient,
  applicationId: string,
  toStatus: string,
  note: string | null,
  now: Date
): Promise<void> => {
  const activeTasks = await transaction.reviewTask.findMany({
    where: {
      applicationId,
      status: {
        in: Array.from(REVIEW_TASK_ACTIVE_STATUSES)
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const nextTaskStatus =
    toStatus === APPLICATION_STATUSES.needsMoreInformation
      ? REVIEW_TASK_WAITING_STATUS
      : REVIEW_TASK_COMPLETED_STATUS;

  if (activeTasks.length === 0) {
    await transaction.reviewTask.create({
      data: {
        applicationId,
        taskType: "initial_review",
        status: nextTaskStatus,
        notes: note,
        completedAt: nextTaskStatus === REVIEW_TASK_WAITING_STATUS ? null : now
      }
    });

    return;
  }

  const [currentTask, ...supersededTasks] = activeTasks;

  await transaction.reviewTask.update({
    where: {
      id: currentTask.id
    },
    data: {
      status: nextTaskStatus,
      notes: note ?? currentTask.notes,
      completedAt: nextTaskStatus === REVIEW_TASK_WAITING_STATUS ? null : now
    }
  });

  for (const task of supersededTasks) {
    await transaction.reviewTask.update({
      where: {
        id: task.id
      },
      data: {
        status: REVIEW_TASK_COMPLETED_STATUS,
        completedAt: now,
        notes: task.notes ?? note
      }
    });
  }
};

const ensureReviewableStatus = (status: string): void => {
  if (
    !ACTIVE_APPLICATION_STATUSES.has(status) ||
    status === APPLICATION_STATUSES.draft
  ) {
    throw new Error("This application is not available for review actions.");
  }
};

export const listReviewApplications = async (
  scope = "pending"
): Promise<ReviewQueueResponse> => {
  const normalizedScope = scope.trim().toLowerCase() || "pending";
  const statuses = resolveScopeStatuses(normalizedScope);

  const applications = await prisma.application.findMany({
    where:
      statuses && statuses.length > 0
        ? {
            status: {
              in: statuses
            }
          }
        : {
            status: {
              not: APPLICATION_STATUSES.draft
            }
          },
    include: {
      organization: true,
      sections: true,
      reviewTasks: {
        orderBy: {
          createdAt: "desc"
        }
      }
    },
    orderBy: [
      {
        submittedAt: "desc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });

  return {
    scope: normalizedScope,
    items: applications.map((application) => {
      const completedSections = application.sections.filter(
        (section) => section.status === "completed"
      ).length;
      const latestTask = application.reviewTasks[0];

      return {
        applicationId: application.id,
        applicationType: application.applicationType,
        status: application.status,
        currentStep: application.currentStep,
        submittedAt: application.submittedAt
          ? application.submittedAt.toISOString()
          : null,
        updatedAt: application.updatedAt.toISOString(),
        organization: {
          legalName: application.organization.legalName,
          tradingName: application.organization.tradingName,
          entityType: application.organization.entityType
        },
        sectionProgress: {
          completed: completedSections,
          total: application.sections.length
        },
        reviewTask: latestTask
          ? {
              taskType: latestTask.taskType,
              status: latestTask.status
            }
          : null
      };
    })
  };
};

const transitionReviewStatus = async (
  applicationId: string,
  toStatus: string,
  note?: string
): Promise<ApplicationDetailResponse> => {
  const message = normalizeOptionalString(note);
  const now = new Date();

  const updatedApplicationId = await prisma.$transaction(async (transaction) => {
    const application = await transaction.application.findUnique({
      where: {
        id: applicationId
      },
      include: reviewApplicationInclude
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    ensureReviewableStatus(application.status);

    if (application.status === toStatus) {
      throw new Error("This application is already in that status.");
    }

    if (toStatus === APPLICATION_STATUSES.approved) {
      const documentsComplete = await areRequiredDocumentsComplete(
        transaction,
        application
      );

      if (!documentsComplete) {
        throw new Error("All required documents must be accepted before approval.");
      }
    }

    await transaction.application.update({
      where: {
        id: applicationId
      },
      data: {
        status: toStatus,
        closedAt:
          toStatus === APPLICATION_STATUSES.approved ||
          toStatus === APPLICATION_STATUSES.rejected
            ? now
            : null
      }
    });

    await transaction.applicationStatusHistory.create({
      data: {
        applicationId,
        changedByUserId: null,
        fromStatus: application.status,
        toStatus,
        reason: message
      }
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: null,
        entityType: "application",
        entityId: applicationId,
        action: toStatus,
        summary: `Application moved to ${toStatus}.`,
        detailsJson: JSON.stringify({
          note: message,
          requiredDocumentsComplete:
            toStatus === APPLICATION_STATUSES.approved
        })
      }
    });

    await updateReviewTaskState(transaction, applicationId, toStatus, message, now);

    if (
      toStatus === APPLICATION_STATUSES.approved ||
      toStatus === APPLICATION_STATUSES.rejected
    ) {
      await transaction.organization.update({
        where: {
          id: application.organizationId
        },
        data: {
          activeApplicationId: null
        }
      });
    }

    return application.id;
  }, {
    maxWait: 15000,
    timeout: 60000
  });

  return getReviewDetailOrThrow(updatedApplicationId);
};

export const requestApplicationInformation = async (
  applicationId: string,
  payload: ReviewDecisionPayload
): Promise<ApplicationDetailResponse> =>
  transitionReviewStatus(
    applicationId,
    APPLICATION_STATUSES.needsMoreInformation,
    requireDecisionNote(payload.note)
  );

export const approveApplication = async (
  applicationId: string,
  payload: ReviewDecisionPayload
): Promise<ApplicationDetailResponse> =>
  transitionReviewStatus(
    applicationId,
    APPLICATION_STATUSES.approved,
    getDecisionNote(payload.note) || undefined
  );

export const rejectApplication = async (
  applicationId: string,
  payload: ReviewDecisionPayload
): Promise<ApplicationDetailResponse> =>
  transitionReviewStatus(
    applicationId,
    APPLICATION_STATUSES.rejected,
    requireDecisionNote(payload.note)
  );

export const reviewApplicationDocument = async (
  documentId: string,
  payload: DocumentReviewPayload
): Promise<ApplicationDetailResponse> => {
  const normalizedStatus = payload.status.trim().toLowerCase();
  const normalizedNote = normalizeOptionalString(payload.note);

  if (!VALID_DOCUMENT_REVIEW_STATUSES.has(normalizedStatus)) {
    throw new Error("Document review status must be pending, accepted, or rejected.");
  }

  const applicationId = await prisma.$transaction(async (transaction) => {
    const document = await transaction.document.findUnique({
      where: {
        id: documentId
      },
      include: {
        application: true
      }
    });

    if (!document) {
      throw new Error("Document not found.");
    }

    ensureReviewableStatus(document.application.status);

    await transaction.document.update({
      where: {
        id: documentId
      },
      data: {
        status: normalizedStatus,
        reviewNotes: normalizedNote,
        reviewedByUserId: null
      }
    });

    await transaction.auditLog.create({
      data: {
        actorUserId: null,
        entityType: "document",
        entityId: documentId,
        action: `review_${normalizedStatus}`,
        summary: `Document marked as ${normalizedStatus}.`,
        detailsJson: JSON.stringify({
          applicationId: document.applicationId,
          requirementCode: document.requirementCode,
          note: normalizedNote
        })
      }
    });

    return document.applicationId;
  }, {
    maxWait: 15000,
    timeout: 60000
  });

  return getReviewDetailOrThrow(applicationId);
};
