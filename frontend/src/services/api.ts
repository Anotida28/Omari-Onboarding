export interface HealthResponse {
  status: string;
  message: string;
}

export interface User {
  id: number;
  name: string;
  role: string;
  email: string;
}

export interface DocumentRequirementItem {
  code: string;
  label: string;
  description: string | null;
  allowedExtensions: string[];
  maxFiles: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface DocumentRequirementResponse {
  applicationType: string;
  entityType: string | null;
  availableEntityTypes: string[];
  requirements: DocumentRequirementItem[];
}

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

export interface UploadedApplicationDocument {
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

export interface DocumentChecklistSummaryItem {
  requirementCode: string;
  label: string;
  isRequired: boolean;
  status: string;
  uploadedCount: number;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
}

export interface DocumentReviewSummary {
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

export interface ApplicationSectionSummary {
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

export interface ApplicationStatusHistoryItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
}

export interface ReviewTaskItem {
  id: string;
  taskType: string;
  status: string;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

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
  uploadedDocuments: UploadedApplicationDocument[];
  documentChecklist: DocumentChecklistSummaryItem[];
  documentReviewSummary: DocumentReviewSummary;
  statusHistory: ApplicationStatusHistoryItem[];
  reviewTasks: ReviewTaskItem[];
}

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorPayload = (await response.json()) as { message?: string };

      if (typeof errorPayload.message === "string" && errorPayload.message) {
        message = errorPayload.message;
      }
    } catch {
      // Ignore payload parsing issues and fall back to the status message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const getHealth = async (): Promise<HealthResponse> => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse<HealthResponse>(response);
};

export const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE_URL}/users`);
  return handleResponse<User[]>(response);
};

export const testEndpoint = async (path: string): Promise<unknown> => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`);
  return handleResponse<unknown>(response);
};

export const getDocumentRequirements = async (
  applicationType: string,
  entityType?: string
): Promise<DocumentRequirementResponse> => {
  const params = new URLSearchParams({
    applicationType
  });

  if (entityType) {
    params.set("entityType", entityType);
  }

  const response = await fetch(
    `${API_BASE_URL}/document-requirements?${params.toString()}`
  );

  return handleResponse<DocumentRequirementResponse>(response);
};

export const saveMerchantDraft = async (
  payload: MerchantDraftPayload
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(`${API_BASE_URL}/applications/merchant-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return handleResponse<ApplicationDetailResponse>(response);
};

export const getApplication = async (
  applicationId: string
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`);
  return handleResponse<ApplicationDetailResponse>(response);
};

export const uploadApplicationDocuments = async (
  applicationId: string,
  requirementCode: string,
  files: File[]
): Promise<ApplicationDetailResponse> => {
  const formData = new FormData();
  formData.append("requirementCode", requirementCode);

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationId}/documents`,
    {
      method: "POST",
      body: formData
    }
  );

  return handleResponse<ApplicationDetailResponse>(response);
};

export const saveMerchantContacts = async (
  applicationId: string,
  payload: MerchantContactsPayload
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationId}/merchant-contacts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return handleResponse<ApplicationDetailResponse>(response);
};

export const saveMerchantBanking = async (
  applicationId: string,
  payload: MerchantBankingPayload
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationId}/merchant-banking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return handleResponse<ApplicationDetailResponse>(response);
};

export const submitMerchantApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/applications/${applicationId}/merchant-submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return handleResponse<ApplicationDetailResponse>(response);
};

export const getReviewQueue = async (
  scope = "pending"
): Promise<ReviewQueueResponse> => {
  const params = new URLSearchParams({
    scope
  });
  const response = await fetch(`${API_BASE_URL}/review/applications?${params.toString()}`);
  return handleResponse<ReviewQueueResponse>(response);
};

const postReviewAction = async (
  applicationId: string,
  action: "request-info" | "approve" | "reject",
  note: string
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/review/applications/${applicationId}/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        note
      })
    }
  );

  return handleResponse<ApplicationDetailResponse>(response);
};

export const requestApplicationInfo = async (
  applicationId: string,
  note: string
): Promise<ApplicationDetailResponse> =>
  postReviewAction(applicationId, "request-info", note);

export const approveReviewApplication = async (
  applicationId: string,
  note: string
): Promise<ApplicationDetailResponse> =>
  postReviewAction(applicationId, "approve", note);

export const rejectReviewApplication = async (
  applicationId: string,
  note: string
): Promise<ApplicationDetailResponse> =>
  postReviewAction(applicationId, "reject", note);

export const reviewApplicationDocument = async (
  documentId: string,
  payload: {
    status: "pending" | "accepted" | "rejected";
    note: string;
  }
): Promise<ApplicationDetailResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/review/documents/${documentId}/review`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  return handleResponse<ApplicationDetailResponse>(response);
};
