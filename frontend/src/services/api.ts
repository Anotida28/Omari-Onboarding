export interface HealthResponse {
  status: string;
  message: string;
}

export interface User {
  id: string;
  name: string;
  fullName?: string;
  role: string;
  email: string | null;
  username?: string | null;
  status?: string;
  authSource?: string;
  lastLoginAt?: string | null;
}

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

export interface AuthResponse {
  user: AuthenticatedUser | null;
}

export interface RegisterPayload {
  fullName: string;
  organizationName: string;
  mobileNumber: string;
  email?: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface InternalLoginPayload {
  username: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  mobileNumber: string;
  email?: string | null;
  organizationName?: string;
  tradingName?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
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

export interface PayerBankingPayload extends MerchantBankingPayload {}

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

export interface ReviewCommentItem {
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

export interface ReviewQueueItem {
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
  uploadedDocuments: UploadedApplicationDocument[];
  documentChecklist: DocumentChecklistSummaryItem[];
  documentReviewSummary: DocumentReviewSummary;
  comments: ReviewCommentItem[];
  statusHistory: ApplicationStatusHistoryItem[];
  reviewTasks: ReviewTaskItem[];
}

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

export class ApiRequestError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.payload = payload;
  }
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let errorPayload: unknown;

    try {
      errorPayload = (await response.json()) as { message?: string };

      if (
        typeof (errorPayload as { message?: string }).message === "string" &&
        (errorPayload as { message?: string }).message
      ) {
        message = (errorPayload as { message?: string }).message as string;
      }
    } catch {
      // Ignore payload parsing issues and fall back to the status message.
    }

    throw new ApiRequestError(message, response.status, errorPayload);
  }

  // Support endpoints that intentionally return no JSON body.
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const buildApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => apiFetch<T>(path.startsWith("/") ? path : `/${path}`, init);

export const apiFormData = async <T>(
  path: string,
  formData: FormData,
  init?: Omit<RequestInit, "body" | "headers">
): Promise<T> =>
  apiFetch<T>(path.startsWith("/") ? path : `/${path}`, {
    method: init?.method || "POST",
    ...init,
    body: formData
  });

export const downloadApiFile = async (
  path: string,
  fileName: string,
  init?: RequestInit
): Promise<void> => {
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    ...init
  });

  if (!response.ok) {
    throw new ApiRequestError(
      `Download failed with status ${response.status}`,
      response.status
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};

const apiFetch = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => {
  const isFormDataPayload =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const headers = isFormDataPayload
    ? init?.headers
    : {
        Accept: "application/json",
        ...(init?.headers || {})
      };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers
  });

  return handleResponse<T>(response);
};

export const getHealth = async (): Promise<HealthResponse> =>
  apiFetch<HealthResponse>("/health");

export const getUsers = async (): Promise<User[]> => apiFetch<User[]>("/users");

export const testEndpoint = async (path: string): Promise<unknown> => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiFetch<unknown>(normalizedPath);
};

export const getCurrentUser = async (): Promise<AuthResponse> =>
  apiFetch<AuthResponse>("/auth/me");

export const registerUser = async (
  payload: RegisterPayload
): Promise<AuthResponse> =>
  apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const loginUser = async (
  payload: LoginPayload
): Promise<AuthResponse> =>
  apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const loginInternalUser = async (
  payload: InternalLoginPayload
): Promise<AuthResponse> =>
  apiFetch<AuthResponse>("/auth/internal/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const logoutUser = async (): Promise<{ message: string }> =>
  apiFetch<{ message: string }>("/auth/logout", {
    method: "POST"
  });

export const updateCurrentProfile = async (
  payload: UpdateProfilePayload
): Promise<AuthResponse> =>
  apiFetch<AuthResponse>("/auth/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const changeCurrentPassword = async (
  payload: ChangePasswordPayload
): Promise<{ message: string }> =>
  apiFetch<{ message: string }>("/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

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

  return apiFetch<DocumentRequirementResponse>(
    `/document-requirements?${params.toString()}`
  );
};

export const saveMerchantDraft = async (
  payload: MerchantDraftPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>("/applications/merchant-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const saveAgentDraft = async (
  payload: AgentDraftPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>("/applications/agent-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const savePayerDraft = async (
  payload: PayerDraftPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>("/applications/payer-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const getApplication = async (
  applicationId: string
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(`/applications/${applicationId}`);

export const getActiveApplication = async (): Promise<ApplicationDetailResponse | null> =>
  apiFetch<ApplicationDetailResponse | null>("/applications/active");

export const getActiveApplicationByType = async (
  applicationType: string
): Promise<ApplicationDetailResponse | null> => {
  const params = new URLSearchParams({
    applicationType
  });

  return apiFetch<ApplicationDetailResponse | null>(
    `/applications/active?${params.toString()}`
  );
};

export const createApplicationComment = async (
  applicationId: string,
  payload: {
    message: string;
    sectionKey?: string;
    visibility?: "applicant" | "internal";
    commentType?: string;
  }
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(`/applications/${applicationId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

export const updateApplicationCommentResolution = async (
  commentId: string,
  isResolved: boolean
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(`/applications/comments/${commentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      isResolved
    })
  });

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

  return apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/documents`,
    {
      method: "POST",
      body: formData
    }
  );
};

export const saveMerchantContacts = async (
  applicationId: string,
  payload: MerchantContactsPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/merchant-contacts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const saveMerchantBanking = async (
  applicationId: string,
  payload: MerchantBankingPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/merchant-banking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const saveAgentContacts = async (
  applicationId: string,
  payload: AgentContactsPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/agent-contacts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const saveAgentBanking = async (
  applicationId: string,
  payload: AgentBankingPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/agent-banking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const saveAgentOperations = async (
  applicationId: string,
  payload: AgentOperationsStepPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/agent-operations`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const savePayerContacts = async (
  applicationId: string,
  payload: PayerContactsPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/payer-contacts`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const savePayerBanking = async (
  applicationId: string,
  payload: PayerBankingPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/payer-banking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const savePayerSettlement = async (
  applicationId: string,
  payload: PayerSettlementStepPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/payer-settlement`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const submitMerchantApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/merchant-submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const submitAgentApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/agent-submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const submitPayerApplication = async (
  applicationId: string,
  payload: MerchantDeclarationPayload
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/applications/${applicationId}/payer-submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

export const getReviewQueue = async (
  scope = "pending"
): Promise<ReviewQueueResponse> => {
  const params = new URLSearchParams({
    scope
  });

  return apiFetch<ReviewQueueResponse>(`/review/applications?${params.toString()}`);
};

const postReviewAction = async (
  applicationId: string,
  action: "request-info" | "approve" | "reject",
  note: string
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(
    `/review/applications/${applicationId}/${action}`,
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
): Promise<ApplicationDetailResponse> =>
  apiFetch<ApplicationDetailResponse>(`/review/documents/${documentId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
