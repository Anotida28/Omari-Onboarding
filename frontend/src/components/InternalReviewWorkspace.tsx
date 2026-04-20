import { useEffect, useMemo, useState } from "react";
import {
  API_BASE_URL,
  ApplicationDetailResponse,
  ReviewQueueItem,
  approveReviewApplication,
  createApplicationComment,
  getApplication,
  getReviewQueue,
  rejectReviewApplication,
  reviewApplicationDocument,
  updateApplicationCommentResolution,
  requestApplicationInfo
} from "../services/api";

type ReviewScope = "pending" | "all" | "closed";
type ReviewAction = "request-info" | "approve" | "reject";
type CommentVisibility = "applicant" | "internal";

const REVIEW_SCOPE_OPTIONS: Array<{ value: ReviewScope; label: string }> = [
  { value: "pending", label: "Action Required" },
  { value: "all", label: "All Applications" },
  { value: "closed", label: "Completed Decisions" }
];

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const humanize = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatDate = (value: string | null): string => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const formatValue = (value: string | null | undefined): string =>
  value && value.trim() ? value : "-";

const formatBoolean = (value: boolean | null | undefined): string =>
  value ? "Yes" : "No";

const getSectionStatusClassName = (status: string): string => {
  if (status === "completed") {
    return "status-chip status-chip--brand";
  }

  if (status === "in_progress") {
    return "status-chip status-chip--soft";
  }

  return "status-chip";
};

const getDocumentStatusClassName = (status: string): string => {
  if (status === "accepted") {
    return "status-chip status-chip--brand";
  }

  if (status === "rejected") {
    return "status-chip status-chip--danger";
  }

  if (status === "pending" || status === "missing") {
    return "status-chip status-chip--soft";
  }

  return "status-chip";
};

const getSectionHealthLabel = (status: string): string => {
  if (status === "completed") {
    return "Healthy";
  }

  if (status === "in_progress") {
    return "In progress";
  }

  return "Waiting";
};

const DECISION_ACTION_COPY: Record<
  ReviewAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    toneClassName: string;
    requiresNote: boolean;
  }
> = {
  "request-info": {
    title: "Request Corrections",
    description:
      "This sends the application back to the applicant for corrections while preserving review history.",
    confirmLabel: "Send Correction Request",
    toneClassName: "status-chip--soft",
    requiresNote: true
  },
  approve: {
    title: "Approve Application",
    description:
      "This finalizes approval, closes the active review task, and moves the application to the approved state.",
    confirmLabel: "Confirm Approval",
    toneClassName: "status-chip--brand",
    requiresNote: false
  },
  reject: {
    title: "Reject Application",
    description:
      "This records a final rejection decision and closes the active review task after the note is captured.",
    confirmLabel: "Confirm Rejection",
    toneClassName: "status-chip--danger",
    requiresNote: true
  }
};

function InternalReviewWorkspace(): JSX.Element {
  const [scope, setScope] = useState<ReviewScope>("pending");
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationDetailResponse | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({});
  const [commentMessage, setCommentMessage] = useState("");
  const [commentVisibility, setCommentVisibility] =
    useState<CommentVisibility>("applicant");
  const [commentSectionKey, setCommentSectionKey] = useState("");
  const [commentType, setCommentType] = useState("correction");
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [processingDocumentId, setProcessingDocumentId] = useState("");
  const [processingComment, setProcessingComment] = useState(false);
  const [processingCommentId, setProcessingCommentId] = useState("");
  const [pendingDecision, setPendingDecision] = useState<ReviewAction | null>(
    null
  );
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadQueue = async (
    currentScope: ReviewScope,
    preferredApplicationId?: string
  ): Promise<void> => {
    setLoadingQueue(true);

    try {
      const response = await getReviewQueue(currentScope);
      setQueue(response.items);

      setSelectedApplicationId((currentSelected) => {
        if (
          preferredApplicationId &&
          response.items.some(
            (item) => item.applicationId === preferredApplicationId
          )
        ) {
          return preferredApplicationId;
        }

        if (
          currentSelected &&
          response.items.some((item) => item.applicationId === currentSelected)
        ) {
          return currentSelected;
        }

        return response.items[0]?.applicationId || "";
      });

      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the application queue."
      );
    } finally {
      setLoadingQueue(false);
    }
  };

  const filteredQueue = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchingItems = normalizedSearch
      ? queue.filter((item) => {
          const searchTarget = [
            item.organization.legalName,
            item.organization.tradingName || "",
            item.organization.entityType,
            item.applicationType,
            item.status,
            item.currentStep || ""
          ]
            .join(" ")
            .toLowerCase();

          return searchTarget.includes(normalizedSearch);
        })
      : queue;

    const nextItems = [...matchingItems];
    nextItems.sort((left, right) => {
      const leftTime = new Date(left.submittedAt || left.updatedAt).getTime();
      const rightTime = new Date(right.submittedAt || right.updatedAt).getTime();

      return sortOrder === "newest"
        ? rightTime - leftTime
        : leftTime - rightTime;
    });

    return nextItems;
  }, [queue, searchTerm, sortOrder]);

  useEffect(() => {
    void loadQueue(scope);
  }, [scope]);

  useEffect(() => {
    if (filteredQueue.length === 0) {
      setSelectedApplicationId("");
      return;
    }

    setSelectedApplicationId((currentSelected) =>
      filteredQueue.some((item) => item.applicationId === currentSelected)
        ? currentSelected
        : filteredQueue[0].applicationId
    );
  }, [filteredQueue]);

  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedApplication(null);
      return;
    }

    const loadDetail = async (): Promise<void> => {
      setLoadingDetail(true);

      try {
        const response = await getApplication(selectedApplicationId);
        setSelectedApplication(response);
        setError("");
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load application detail."
        );
      } finally {
        setLoadingDetail(false);
      }
    };

    void loadDetail();
  }, [selectedApplicationId]);

  useEffect(() => {
    if (!selectedApplication) {
      setDocumentNotes({});
      return;
    }

    setDocumentNotes((currentNotes) => {
      const nextNotes: Record<string, string> = {};

      selectedApplication.uploadedDocuments.forEach((document) => {
        nextNotes[document.id] =
          document.reviewNotes ?? currentNotes[document.id] ?? "";
      });

      return nextNotes;
    });
  }, [selectedApplication]);

  useEffect(() => {
    setCommentMessage("");
    setCommentSectionKey("");
    setCommentVisibility("applicant");
    setCommentType("correction");
  }, [selectedApplicationId]);

  const queueSummary = useMemo(
    () => ({
      submitted: queue.filter((item) => item.status === "submitted").length,
      needsInfo: queue.filter((item) => item.status === "needs_more_information")
        .length,
      decisions: queue.filter((item) =>
        ["approved", "rejected"].includes(item.status)
      ).length
    }),
    [queue]
  );

  const isDecisionLocked = useMemo(
    () =>
      selectedApplication
        ? ["approved", "rejected", "activated", "archived"].includes(
            selectedApplication.status
          )
        : true,
    [selectedApplication]
  );

  const canApproveApplication = useMemo(
    () =>
      selectedApplication
        ? selectedApplication.documentReviewSummary.acceptedRequiredDocuments ===
          selectedApplication.documentReviewSummary.requiredDocuments
        : false,
    [selectedApplication]
  );

  const selectedApplicationSummary = useMemo(() => {
    if (!selectedApplication) {
      return null;
    }

    const completedSections = selectedApplication.sections.filter(
      (section) => section.status === "completed"
    ).length;
    const pendingSections = selectedApplication.sections.length - completedSections;
    const latestTask =
      selectedApplication.reviewTasks.find(
        (task) => task.status !== "completed" && task.status !== "cancelled"
      ) || selectedApplication.reviewTasks[0] || null;

    return {
      completedSections,
      pendingSections,
      acceptedDocuments: selectedApplication.documentReviewSummary.acceptedDocuments,
      flaggedDocuments: selectedApplication.documentReviewSummary.rejectedDocuments,
      latestTask
    };
  }, [selectedApplication]);

  const selectedApplicationView = useMemo(() => {
    if (!selectedApplication) {
      return null;
    }

    const isAgent = selectedApplication.applicationType === "agent";
    const isPayer = selectedApplication.applicationType === "payer";
    const supplementalDetails = isAgent
      ? [
          {
            label: "Registration number",
            value: selectedApplication.businessSnapshot?.registrationNumber
          },
          {
            label: "Tax number",
            value: selectedApplication.businessSnapshot?.taxNumber
          },
          {
            label: "Outlet estimate",
            value: selectedApplication.businessSnapshot?.outletCountEstimate
          }
        ]
      : isPayer
        ? [
            {
              label: "Registration number",
              value: selectedApplication.businessSnapshot?.registrationNumber
            },
            {
              label: "Tax number",
              value: selectedApplication.businessSnapshot?.taxNumber
            },
            {
              label: "Settlement scope",
              value: selectedApplication.businessSnapshot?.serviceCoverage
            }
          ]
        : [];

    return {
      isAgent,
      isPayer,
      applicationLabel: isPayer ? "payer / biller" : isAgent ? "agent" : "merchant",
      workflowLabel: isPayer
        ? "payer workflow"
        : isAgent
          ? "agent workflow"
          : "merchant workflow",
      primaryContact: isPayer
        ? selectedApplication.payerContacts?.primaryContact || null
        : isAgent
          ? selectedApplication.agentContacts?.primaryContact || null
          : selectedApplication.merchantContacts?.primaryContact || null,
      participants: isPayer
        ? selectedApplication.payerContacts?.operationsContacts || []
        : isAgent
          ? selectedApplication.agentContacts?.authorizedTransactors || []
          : selectedApplication.merchantContacts?.authorizedTransactors || [],
      participantsTitle: isPayer
        ? "Operations Contacts"
        : "Authorized Transactors",
      participantDescriptor: isPayer
        ? "operations contact"
        : "authorized transactor",
      principals: isAgent
        ? selectedApplication.agentContacts?.directors || []
        : isPayer
          ? selectedApplication.payerContacts?.signatories || []
          : selectedApplication.merchantContacts?.signatories || [],
      principalsTitle: isAgent ? "Directors" : "Signatories",
      principalDescriptor: isAgent ? "director" : "signatory",
      bankingTitle: isAgent
        ? "Outlets & Banking"
        : isPayer
          ? "Settlement & Banking"
          : "Banking",
      banking: isPayer
        ? selectedApplication.payerSettlement
        : selectedApplication.agentOperations || selectedApplication.merchantBanking,
      declaration: isPayer
        ? selectedApplication.payerDeclaration
        : selectedApplication.agentDeclaration || selectedApplication.merchantDeclaration,
      outlets: isAgent ? selectedApplication.agentOperations?.outlets || [] : [],
      businessMetricLabel: isAgent
        ? "Years in operation"
        : isPayer
          ? "Expected payment volume"
          : "Projected transactions",
      businessMetricValue: isAgent
        ? selectedApplication.businessSnapshot?.yearsInOperation
        : selectedApplication.businessSnapshot?.projectedTransactions,
      serviceLabel: isAgent
        ? "Service coverage"
        : isPayer
          ? "Billing use case"
          : "Products and services",
      serviceValue: isAgent
        ? selectedApplication.businessSnapshot?.serviceCoverage
        : selectedApplication.businessSnapshot?.productsDescription,
      supplementalDetails,
      settlementExtras: isPayer
        ? [
            {
              label: "Settlement method",
              value: selectedApplication.payerSettlement?.settlementMethod
            },
            {
              label: "Reconciliation email",
              value: selectedApplication.payerSettlement?.reconciliationEmail
            },
            {
              label: "Integration notes",
              value: selectedApplication.payerSettlement?.integrationNotes
            }
          ]
        : []
    };
  }, [selectedApplication]);

  const commentSummary = useMemo(() => {
    if (!selectedApplication) {
      return null;
    }

    return {
      total: selectedApplication.comments.length,
      unresolved: selectedApplication.comments.filter((comment) => !comment.isResolved)
        .length,
      unresolvedApplicant: selectedApplication.comments.filter(
        (comment) => !comment.isResolved && comment.visibility === "applicant"
      ).length,
      unresolvedInternal: selectedApplication.comments.filter(
        (comment) => !comment.isResolved && comment.visibility === "internal"
      ).length
    };
  }, [selectedApplication]);

  const handleRefreshQueue = async (): Promise<void> => {
    await loadQueue(scope, selectedApplicationId || undefined);
    setMessage("Application queue refreshed.");
  };

  const handleAction = async (action: ReviewAction): Promise<boolean> => {
    if (!selectedApplicationId || !selectedApplication) {
      return false;
    }

    if (
      (action === "request-info" || action === "reject") &&
      !reviewNote.trim()
    ) {
      setError("A review note is required for request info and reject actions.");
      return false;
    }

    if (action === "approve" && !canApproveApplication) {
      setError(
        "Approve is locked until every required document is accepted."
      );
      return false;
    }

    setProcessingAction(true);
    setError("");
    setMessage("");

    try {
      const response =
        action === "request-info"
          ? await requestApplicationInfo(selectedApplicationId, reviewNote)
          : action === "approve"
            ? await approveReviewApplication(selectedApplicationId, reviewNote)
            : await rejectReviewApplication(selectedApplicationId, reviewNote);

      setSelectedApplication(response);
      setMessage(
        action === "request-info"
          ? "Application returned for corrections."
          : action === "approve"
            ? "Application approved successfully."
            : "Application rejected successfully."
      );
      setReviewNote("");
      await loadQueue(scope, response.applicationId);
      return true;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to complete the review action."
      );
      return false;
    } finally {
      setProcessingAction(false);
    }
  };

  const openDecisionModal = (action: ReviewAction): void => {
    setPendingDecision(action);
  };

  const closeDecisionModal = (): void => {
    if (processingAction) {
      return;
    }

    setPendingDecision(null);
  };

  const confirmDecision = async (): Promise<void> => {
    if (!pendingDecision) {
      return;
    }

    const didComplete = await handleAction(pendingDecision);

    if (didComplete) {
      setPendingDecision(null);
    }
  };

  const handleDocumentReview = async (
    documentId: string,
    status: "pending" | "accepted" | "rejected"
  ): Promise<void> => {
    if (!selectedApplication) {
      return;
    }

    setProcessingDocumentId(documentId);
    setError("");
    setMessage("");

    try {
      const response = await reviewApplicationDocument(documentId, {
        status,
        note: documentNotes[documentId] || ""
      });

      setSelectedApplication(response);
      setMessage(`Document marked as ${humanize(status)}.`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the document review."
      );
    } finally {
      setProcessingDocumentId("");
    }
  };

  const handleCreateComment = async (): Promise<void> => {
    if (!selectedApplicationId) {
      return;
    }

    if (!commentMessage.trim()) {
      setError("Enter a comment before adding it to the review thread.");
      return;
    }

    setProcessingComment(true);
    setError("");
    setMessage("");

    try {
      const response = await createApplicationComment(selectedApplicationId, {
        message: commentMessage,
        sectionKey: commentSectionKey || undefined,
        visibility: commentVisibility,
        commentType
      });

      setSelectedApplication(response);
      setCommentMessage("");
      setCommentSectionKey("");
      setCommentType(commentVisibility === "internal" ? "general" : "correction");
      setMessage("Comment added to the application thread.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the review comment."
      );
    } finally {
      setProcessingComment(false);
    }
  };

  const handleToggleCommentResolution = async (
    commentId: string,
    isResolved: boolean
  ): Promise<void> => {
    setProcessingCommentId(commentId);
    setError("");
    setMessage("");

    try {
      const response = await updateApplicationCommentResolution(
        commentId,
        isResolved
      );

      setSelectedApplication(response);
      setMessage(
        isResolved
          ? "Comment marked as resolved."
          : "Comment reopened for follow-up."
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update the comment state."
      );
    } finally {
      setProcessingCommentId("");
    }
  };

  return (
    <section className="review-workspace">
      <div className="review-summary">
        <article className="review-summary__card">
          <span>Total in view</span>
          <strong>{filteredQueue.length}</strong>
        </article>
        <article className="review-summary__card">
          <span>Submitted</span>
          <strong>{queueSummary.submitted}</strong>
        </article>
        <article className="review-summary__card">
          <span>Needs corrections</span>
          <strong>{queueSummary.needsInfo}</strong>
        </article>
        <article className="review-summary__card">
          <span>Decisioned</span>
          <strong>{queueSummary.decisions}</strong>
        </article>
      </div>

      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      <div className="review-layout">
        <aside className="review-queue">
          <div className="review-queue__header">
            <div>
              <p className="panel-header__eyebrow">Application Queue</p>
              <h3>Applications</h3>
            </div>
            <div className="review-queue__tools">
              <label className="field review-search">
                <span>Search Applications</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, status, type, or step"
                />
              </label>

              <div className="review-scope">
                {REVIEW_SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`review-scope__button${
                      scope === option.value ? " review-scope__button--active" : ""
                    }`}
                    onClick={() => setScope(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="review-sort">
                <label className="field review-sort__field">
                  <span>Sort</span>
                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value as "newest" | "oldest")
                    }
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void handleRefreshQueue()}
                >
                  Refresh Queue
                </button>
              </div>
            </div>
          </div>

          {loadingQueue ? (
            <div className="empty-state">
              <strong>Loading application queue...</strong>
              <span>Submitted applications are being loaded.</span>
            </div>
          ) : null}

          {!loadingQueue && queue.length === 0 ? (
            <div className="empty-state">
              <strong>No applications in this view</strong>
              <span>Try a different filter or submit an application first.</span>
            </div>
          ) : null}

          {!loadingQueue && queue.length > 0 && filteredQueue.length === 0 ? (
            <div className="empty-state">
              <strong>No matches found</strong>
              <span>Try a different search term or queue filter.</span>
            </div>
          ) : null}

          {!loadingQueue && filteredQueue.length > 0 ? (
            <div className="review-queue__list">
              {filteredQueue.map((item) => (
                <button
                  key={item.applicationId}
                  type="button"
                  className={`review-queue__item${
                    selectedApplicationId === item.applicationId
                      ? " review-queue__item--active"
                      : ""
                  }`}
                  onClick={() => setSelectedApplicationId(item.applicationId)}
                >
                  <div className="review-queue__item-top">
                    <strong>{item.organization.legalName}</strong>
                    <span className="status-chip">{humanize(item.status)}</span>
                  </div>
                  <p>
                    {item.organization.tradingName || humanize(item.applicationType)}
                  </p>
                  <div className="review-queue__meta">
                    <span>{humanize(item.organization.entityType)}</span>
                    <span>
                      {item.sectionProgress.completed}/{item.sectionProgress.total} sections
                    </span>
                  </div>
                  <div className="review-queue__meta">
                    <span>Submitted: {formatDate(item.submittedAt)}</span>
                    <span>Updated: {formatDate(item.updatedAt)}</span>
                  </div>
                  <div className="review-queue__meta">
                    <span>Current step: {humanize(item.currentStep || "not_started")}</span>
                    <span>
                      Task:{" "}
                      {item.reviewTask
                        ? `${humanize(item.reviewTask.taskType)}`
                        : "None"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </aside>

        <div className="review-detail">
          {!selectedApplicationId ? (
            <div className="empty-state">
              <strong>Select an application</strong>
              <span>The review detail will appear here once an item is selected.</span>
            </div>
          ) : loadingDetail ? (
            <div className="empty-state">
              <strong>Loading application detail...</strong>
              <span>The selected application is being prepared for review.</span>
            </div>
          ) : selectedApplication ? (
            <>
              <div className="panel-header">
                <div>
                  <p className="panel-header__eyebrow">Internal Review</p>
                  <h2>{selectedApplication.organization.legalName}</h2>
                  <p className="panel-header__copy">
                    {selectedApplication.organization.tradingName ||
                      "No trading name"}{" "}
                    | {humanize(selectedApplication.organization.entityType)}
                  </p>
                </div>

                <div className="panel-header__summary">
                  <span className="status-chip status-chip--brand">
                    {humanize(selectedApplication.status)}
                  </span>
                  <strong>{selectedApplication.sections.length}</strong>
                  <span>Workflow sections</span>
                  <span className="panel-header__meta">
                    Submitted: {formatDate(selectedApplication.submittedAt)}
                  </span>
                </div>
              </div>

              <section className="form-section">
                <div className="form-section__header">
                  <div>
                    <h3>Application Overview</h3>
                    <p>
                      This page brings together the application submission,
                      uploaded evidence, and workflow state for one review pass.
                    </p>
                  </div>
                  <span className="status-chip status-chip--soft">
                    Step: {humanize(selectedApplication.currentStep || "not_started")}
                  </span>
                </div>

                <div className="review-overview-grid">
                  <article className="review-overview-card">
                    <span className="review-overview-card__label">
                      Application Type
                    </span>
                    <strong>{humanize(selectedApplication.applicationType)}</strong>
                    <p>
                      {selectedApplicationSummary?.completedSections || 0}/
                      {selectedApplication.sections.length} sections complete
                    </p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">
                      Document Set
                    </span>
                    <strong>{selectedApplication.uploadedDocuments.length} files</strong>
                    <p>
                      {selectedApplicationSummary?.acceptedDocuments || 0} accepted,{" "}
                      {selectedApplicationSummary?.flaggedDocuments || 0} rejected
                    </p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">
                      Current Workflow
                    </span>
                    <strong>
                      {humanize(
                        selectedApplicationSummary?.latestTask?.taskType ||
                          selectedApplication.currentStep ||
                          "awaiting_review"
                      )}
                    </strong>
                    <p>
                      {selectedApplicationSummary?.latestTask
                        ? `Task status: ${humanize(
                            selectedApplicationSummary.latestTask.status
                          )}`
                        : "No active task recorded yet."}
                    </p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">Business Contact</span>
                    <strong>
                      {formatValue(
                        selectedApplicationView?.primaryContact?.fullName ||
                          selectedApplication.businessSnapshot?.contactPerson ||
                          null
                      )}
                    </strong>
                    <p>
                      {formatValue(
                        selectedApplicationView?.primaryContact?.email ||
                          selectedApplication.organization.businessEmail
                      )}
                    </p>
                  </article>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section__header">
                  <div>
                    <h3>Section Tracker</h3>
                    <p>
                      Check completion across the current workflow before taking
                      a final action.
                    </p>
                  </div>
                  <span className="status-chip">
                    {selectedApplicationSummary?.pendingSections || 0} section(s) pending
                  </span>
                </div>

                <div className="section-tracker">
                  {selectedApplication.sections.map((section) => (
                    <article className="section-tracker__item" key={section.key}>
                      <div className="section-tracker__item-top">
                        <div>
                          <strong>{section.title}</strong>
                          <p>{humanize(section.key)}</p>
                        </div>
                        <span className={getSectionStatusClassName(section.status)}>
                          {humanize(section.status)}
                        </span>
                      </div>
                      <span className="section-tracker__health">
                        {getSectionHealthLabel(section.status)}
                      </span>
                      <span className="section-tracker__timestamp">
                        Last edited: {formatDate(section.lastEditedAt)}
                      </span>
                    </article>
                  ))}
                </div>
              </section>

              <div className="review-grid review-grid--detail">
                <article className="review-card">
                  <h4>Business Snapshot</h4>
                  <dl className="detail-list">
                    <div>
                      <dt>Legal name</dt>
                      <dd>{formatValue(selectedApplication.businessSnapshot?.legalName)}</dd>
                    </div>
                    <div>
                      <dt>Trading name</dt>
                      <dd>
                        {formatValue(selectedApplication.businessSnapshot?.tradingName)}
                      </dd>
                    </div>
                    <div>
                      <dt>Entity type</dt>
                      <dd>{humanize(selectedApplication.organization.entityType)}</dd>
                    </div>
                    <div>
                      <dt>Contact person</dt>
                      <dd>
                        {formatValue(selectedApplication.businessSnapshot?.contactPerson)}
                      </dd>
                    </div>
                    <div>
                      <dt>Business email</dt>
                      <dd>
                        {formatValue(
                          selectedApplication.businessSnapshot?.businessEmail ||
                            selectedApplication.organization.businessEmail
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Business phone</dt>
                      <dd>
                        {formatValue(
                          selectedApplication.businessSnapshot?.businessPhone ||
                            selectedApplication.organization.businessPhone
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Business address</dt>
                      <dd>
                        {formatValue(
                          selectedApplication.businessSnapshot?.businessAddress ||
                            selectedApplication.organization.businessAddress
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {selectedApplicationView?.businessMetricLabel ||
                          "Projected transactions"}
                      </dt>
                      <dd>{formatValue(selectedApplicationView?.businessMetricValue)}</dd>
                    </div>
                    <div>
                      <dt>{selectedApplicationView?.serviceLabel || "Products and services"}</dt>
                      <dd>{formatValue(selectedApplicationView?.serviceValue)}</dd>
                    </div>
                    {selectedApplicationView?.supplementalDetails.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{formatValue(detail.value)}</dd>
                      </div>
                    ))}
                  </dl>
                </article>

                <article className="review-card">
                  <h4>Primary Contact</h4>
                  <dl className="detail-list">
                    <div>
                      <dt>Primary contact</dt>
                      <dd>
                        {formatValue(
                          selectedApplicationView?.primaryContact?.fullName
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Contact email</dt>
                      <dd>
                        {formatValue(
                          selectedApplicationView?.primaryContact?.email
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        {formatValue(
                          selectedApplicationView?.primaryContact?.phoneNumber
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Designation</dt>
                      <dd>
                        {formatValue(
                          selectedApplicationView?.primaryContact?.designation
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Residential address</dt>
                      <dd>
                        {formatValue(
                          selectedApplicationView?.primaryContact?.residentialAddress
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {selectedApplicationView?.participantsTitle ||
                          "Authorized transactors"}
                      </dt>
                      <dd>
                        {selectedApplicationView?.participants.length || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>{selectedApplicationView?.principalsTitle || "Signatories"}</dt>
                      <dd>{selectedApplicationView?.principals.length || 0}</dd>
                    </div>
                  </dl>
                </article>

                <article className="review-card">
                  <h4>{selectedApplicationView?.bankingTitle || "Banking"}</h4>
                  <dl className="detail-list">
                    <div>
                      <dt>Account name</dt>
                      <dd>{selectedApplicationView?.banking?.accountName || "-"}</dd>
                    </div>
                    <div>
                      <dt>Bank</dt>
                      <dd>{formatValue(selectedApplicationView?.banking?.bankName)}</dd>
                    </div>
                    <div>
                      <dt>Branch name</dt>
                      <dd>{formatValue(selectedApplicationView?.banking?.branchName)}</dd>
                    </div>
                    <div>
                      <dt>Branch code</dt>
                      <dd>{formatValue(selectedApplicationView?.banking?.branchCode)}</dd>
                    </div>
                    <div>
                      <dt>Account number</dt>
                      <dd>{formatValue(selectedApplicationView?.banking?.accountNumber)}</dd>
                    </div>
                    <div>
                      <dt>Account type</dt>
                      <dd>{formatValue(selectedApplicationView?.banking?.accountType)}</dd>
                    </div>
                    <div>
                      <dt>Currency</dt>
                      <dd>{formatValue(selectedApplicationView?.banking?.currency)}</dd>
                    </div>
                    {selectedApplicationView?.settlementExtras.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{formatValue(detail.value)}</dd>
                      </div>
                    ))}
                    {selectedApplicationView?.isAgent ? (
                      <div>
                        <dt>Outlets</dt>
                        <dd>{selectedApplicationView.outlets.length}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>

                <article className="review-card">
                  <h4>Declaration</h4>
                  <dl className="detail-list">
                    <div>
                      <dt>Signer name</dt>
                      <dd>{formatValue(selectedApplicationView?.declaration?.signerName)}</dd>
                    </div>
                    <div>
                      <dt>Signer title</dt>
                      <dd>{formatValue(selectedApplicationView?.declaration?.signerTitle)}</dd>
                    </div>
                    <div>
                      <dt>Accepted terms</dt>
                      <dd>{formatBoolean(selectedApplicationView?.declaration?.acceptedTerms)}</dd>
                    </div>
                    <div>
                      <dt>Certified information</dt>
                      <dd>{formatBoolean(selectedApplicationView?.declaration?.certifiedInformation)}</dd>
                    </div>
                    <div>
                      <dt>Authorized to act</dt>
                      <dd>{formatBoolean(selectedApplicationView?.declaration?.authorizedToAct)}</dd>
                    </div>
                  </dl>
                </article>
              </div>

              <div className="review-grid review-grid--detail">
                <section className="form-section">
                  <div className="form-section__header">
                    <div>
                      <h3>
                        {selectedApplicationView?.participantsTitle ||
                          "Authorized Transactors"}
                      </h3>
                      <p>
                        Everyone listed here can transact or act on behalf of the{" "}
                        {selectedApplicationView?.applicationLabel || "application"}{" "}
                        during onboarding.
                      </p>
                    </div>
                    <span className="status-chip status-chip--soft">
                      {selectedApplicationView?.participants.length || 0}{" "}
                      listed
                    </span>
                  </div>

                  {selectedApplicationView?.participants.length ? (
                    <div className="people-grid">
                      {selectedApplicationView.participants.map(
                        (person, index) => (
                          <article className="person-card" key={`${person.fullName}-${index}`}>
                            <strong>{formatValue(person.fullName)}</strong>
                            <dl className="detail-list detail-list--compact">
                              <div>
                                <dt>Designation</dt>
                                <dd>{formatValue(person.designation)}</dd>
                              </div>
                              <div>
                                <dt>Email</dt>
                                <dd>{formatValue(person.email)}</dd>
                              </div>
                              <div>
                                <dt>Phone</dt>
                                <dd>{formatValue(person.phoneNumber)}</dd>
                              </div>
                              <div>
                                <dt>National ID</dt>
                                <dd>{formatValue(person.nationalIdNumber)}</dd>
                              </div>
                              <div>
                                <dt>Residential address</dt>
                                <dd>{formatValue(person.residentialAddress)}</dd>
                              </div>
                            </dl>
                          </article>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <strong>
                        No{" "}
                        {selectedApplicationView?.participantsTitle?.toLowerCase() ||
                          "authorized transactors"}{" "}
                        listed
                      </strong>
                      <span>
                        This section was left empty in the submitted application.
                      </span>
                    </div>
                  )}
                </section>

                <section className="form-section">
                  <div className="form-section__header">
                    <div>
                      <h3>{selectedApplicationView?.principalsTitle || "Signatories"}</h3>
                      <p>
                        Confirm who was named as a{" "}
                        {selectedApplicationView?.principalDescriptor || "signatory"} and whether a primary
                        contact is clearly identified.
                      </p>
                    </div>
                    <span className="status-chip status-chip--soft">
                      {selectedApplicationView?.principals.length || 0} listed
                    </span>
                  </div>

                  {selectedApplicationView?.principals.length ? (
                    <div className="people-grid">
                      {selectedApplicationView.principals.map(
                        (person, index) => (
                          <article className="person-card" key={`${person.fullName}-${index}`}>
                            <div className="person-card__header">
                              <strong>{formatValue(person.fullName)}</strong>
                              {(
                                person.isPrimarySignatory ||
                                ("isPrimaryDirector" in person &&
                                  Boolean(person.isPrimaryDirector))
                              ) ? (
                                <span className="status-chip status-chip--brand">
                                  Primary
                                </span>
                              ) : null}
                            </div>
                            <dl className="detail-list detail-list--compact">
                              <div>
                                <dt>Designation</dt>
                                <dd>{formatValue(person.designation)}</dd>
                              </div>
                              <div>
                                <dt>Email</dt>
                                <dd>{formatValue(person.email)}</dd>
                              </div>
                              <div>
                                <dt>Phone</dt>
                                <dd>{formatValue(person.phoneNumber)}</dd>
                              </div>
                              <div>
                                <dt>National ID</dt>
                                <dd>{formatValue(person.nationalIdNumber)}</dd>
                              </div>
                              <div>
                                <dt>Residential address</dt>
                                <dd>{formatValue(person.residentialAddress)}</dd>
                              </div>
                            </dl>
                          </article>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <strong>No {selectedApplicationView?.principalsTitle?.toLowerCase() || "signatories"} listed</strong>
                      <span>
                        The applicant did not provide any records in this section.
                      </span>
                    </div>
                  )}
                </section>
              </div>

              {selectedApplicationView?.isAgent ? (
                <section className="form-section">
                  <div className="form-section__header">
                    <div>
                      <h3>Operating Outlets</h3>
                      <p>Review the branch and outlet footprint attached to this agent application.</p>
                    </div>
                    <span className="status-chip status-chip--soft">
                      {selectedApplicationView.outlets.length} listed
                    </span>
                  </div>

                  {selectedApplicationView.outlets.length ? (
                    <div className="people-grid">
                      {selectedApplicationView.outlets.map((outlet, index) => (
                        <article className="person-card" key={`${outlet.name}-${index}`}>
                          <strong>{formatValue(outlet.name)}</strong>
                          <dl className="detail-list detail-list--compact">
                            <div>
                              <dt>Code</dt>
                              <dd>{formatValue(outlet.code)}</dd>
                            </div>
                            <div>
                              <dt>Phone</dt>
                              <dd>{formatValue(outlet.phoneNumber)}</dd>
                            </div>
                            <div>
                              <dt>Email</dt>
                              <dd>{formatValue(outlet.email)}</dd>
                            </div>
                            <div>
                              <dt>Address</dt>
                              <dd>{formatValue(outlet.addressLine1)}</dd>
                            </div>
                            <div>
                              <dt>City</dt>
                              <dd>{formatValue(outlet.city)}</dd>
                            </div>
                            <div>
                              <dt>Province</dt>
                              <dd>{formatValue(outlet.province)}</dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <strong>No outlets listed</strong>
                      <span>The applicant did not provide any outlet records here.</span>
                    </div>
                  )}
                </section>
              ) : null}

              <section className="form-section">
                <div className="form-section__header">
                  <div>
                    <h3>Document Review Summary</h3>
                    <p>
                      Review file readiness at a glance before deciding on the
                      application.
                    </p>
                  </div>
                  <span className="status-chip status-chip--soft">
                    {selectedApplication.documentReviewSummary.acceptedRequiredDocuments}/
                    {selectedApplication.documentReviewSummary.requiredDocuments} required
                    accepted
                  </span>
                </div>

                <div
                  className={`document-completeness-banner${
                    canApproveApplication ? "" : " document-completeness-banner--warning"
                  }`}
                >
                  <div>
                    <p className="panel-header__eyebrow">Document completeness</p>
                    <strong>
                      {selectedApplication.documentReviewSummary.acceptedRequiredDocuments}/
                      {selectedApplication.documentReviewSummary.requiredDocuments} required accepted
                    </strong>
                    <span>
                      {canApproveApplication
                        ? "Approval is ready once you confirm the decision."
                        : "Approve remains locked until every required document is accepted."}
                    </span>
                  </div>

                  <span
                    className={`status-chip${
                      canApproveApplication ? " status-chip--brand" : " status-chip--alert"
                    }`}
                  >
                    {canApproveApplication ? "Approval ready" : "Approval blocked"}
                  </span>
                </div>

                <div className="review-overview-grid">
                  <article className="review-overview-card">
                    <span className="review-overview-card__label">Accepted Files</span>
                    <strong>
                      {selectedApplication.documentReviewSummary.acceptedDocuments}
                    </strong>
                    <p>Files already cleared by internal review.</p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">Pending Files</span>
                    <strong>
                      {selectedApplication.documentReviewSummary.pendingDocuments}
                    </strong>
                    <p>Files still waiting for an internal document decision.</p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">Rejected Files</span>
                    <strong>
                      {selectedApplication.documentReviewSummary.rejectedDocuments}
                    </strong>
                    <p>Files flagged for replacement or correction.</p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">
                      Outstanding Required Docs
                    </span>
                    <strong>
                      {selectedApplication.documentReviewSummary
                        .missingRequiredDocuments.length +
                        selectedApplication.documentReviewSummary
                          .rejectedRequiredDocuments.length}
                    </strong>
                    <p>Required requirements that are still missing or rejected.</p>
                  </article>
                </div>

                <div className="document-summary-grid">
                  <article className="review-card">
                    <h4>Missing Required Documents</h4>
                    {selectedApplication.documentReviewSummary.missingRequiredDocuments
                      .length ? (
                      <ul className="flag-list">
                        {selectedApplication.documentReviewSummary.missingRequiredDocuments.map(
                          (item) => (
                            <li key={item.requirementCode}>
                              <strong>{item.label}</strong>
                              <span>No file uploaded yet.</span>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <div className="empty-state">
                        <strong>No required files are missing</strong>
                        <span>The applicant has uploaded every required document type.</span>
                      </div>
                    )}
                  </article>

                  <article className="review-card">
                    <h4>Rejected Required Documents</h4>
                    {selectedApplication.documentReviewSummary.rejectedRequiredDocuments
                      .length ? (
                      <ul className="flag-list">
                        {selectedApplication.documentReviewSummary.rejectedRequiredDocuments.map(
                          (item) => (
                            <li key={item.requirementCode}>
                              <strong>{item.label}</strong>
                              <span>
                                {item.rejectedCount} rejected file(s) need replacement.
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <div className="empty-state">
                        <strong>No required files are rejected</strong>
                        <span>There are no rejected required documents at the moment.</span>
                      </div>
                    )}
                  </article>
                </div>
              </section>

              <section className="form-section">
                <div className="form-section__header">
                  <div>
                    <h3>Uploaded Documents</h3>
                    <p>Review the uploaded documents before deciding.</p>
                  </div>
                  <span className="status-chip status-chip--soft">
                    {selectedApplication.uploadedDocuments.length} file(s)
                  </span>
                </div>

                {selectedApplication.uploadedDocuments.length === 0 ? (
                  <div className="empty-state">
                    <strong>No documents uploaded</strong>
                    <span>This application does not have any uploaded files yet.</span>
                  </div>
                ) : (
                  <div className="document-grid">
                    {selectedApplication.uploadedDocuments.map((document) => (
                      <article key={document.id} className="document-card">
                        <div className="document-card__header">
                          <div>
                            <strong>{document.label}</strong>
                            <span>{document.originalFileName}</span>
                          </div>
                          <span className={getDocumentStatusClassName(document.status)}>
                            {humanize(document.status)}
                          </span>
                        </div>

                        <div className="document-card__meta">
                          <span>
                            Requirement: {humanize(document.requirementCode || "unmapped")}
                          </span>
                          <span>{document.isRequired ? "Required" : "Optional"}</span>
                          <span>Uploaded: {formatDate(document.uploadedAt)}</span>
                          <span>Reviewed: {formatDate(document.reviewedAt)}</span>
                        </div>

                        <label className="field">
                          <span>Reviewer Note</span>
                          <textarea
                            value={documentNotes[document.id] || ""}
                            onChange={(event) =>
                              setDocumentNotes((currentNotes) => ({
                                ...currentNotes,
                                [document.id]: event.target.value
                              }))
                            }
                            placeholder="Record what was checked or what needs replacement."
                            disabled={isDecisionLocked || processingDocumentId === document.id}
                          />
                        </label>

                        <div className="form-actions form-actions--split">
                          <a
                            className="button button--ghost button-link"
                            href={`${ASSET_BASE_URL}${document.downloadUrl}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open File
                          </a>

                          <div className="form-actions__group">
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={() => void handleDocumentReview(document.id, "pending")}
                              disabled={
                                isDecisionLocked || processingDocumentId === document.id
                              }
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={() => void handleDocumentReview(document.id, "rejected")}
                              disabled={
                                isDecisionLocked || processingDocumentId === document.id
                              }
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="button button--primary"
                              onClick={() => void handleDocumentReview(document.id, "accepted")}
                              disabled={
                                isDecisionLocked || processingDocumentId === document.id
                              }
                            >
                              {processingDocumentId === document.id
                                ? "Saving..."
                                : "Accept"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <div className="review-grid">
                <section className="form-section">
                  <div className="form-section__header">
                    <div>
                      <h3>Status History</h3>
                      <p>Track how this application moved through the workflow.</p>
                    </div>
                  </div>

                  <div className="timeline-list">
                    {selectedApplication.statusHistory.map((item) => (
                      <article className="timeline-item" key={item.id}>
                        <div className="timeline-item__dot" />
                        <div>
                          <strong>
                            {humanize(item.fromStatus || "new")} to{" "}
                            {humanize(item.toStatus)}
                          </strong>
                          <p>{item.reason || "No reason recorded."}</p>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="form-section">
                  <div className="form-section__header">
                    <div>
                      <h3>Review Tasks</h3>
                      <p>Current and historical task items tied to this application.</p>
                    </div>
                  </div>

                  <div className="task-list">
                    {selectedApplication.reviewTasks.length === 0 ? (
                      <div className="empty-state">
                        <strong>No review tasks</strong>
                        <span>Tasks will appear here once the workflow creates them.</span>
                      </div>
                    ) : (
                      selectedApplication.reviewTasks.map((task) => (
                        <article className="task-item" key={task.id}>
                          <div className="task-item__header">
                            <strong>{humanize(task.taskType)}</strong>
                            <span className="status-chip">
                              {humanize(task.status)}
                            </span>
                          </div>
                          <p>{task.notes || "No task notes recorded."}</p>
                          <span>Created: {formatDate(task.createdAt)}</span>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <section className="form-section">
                <div className="form-section__header">
                  <div>
                    <h3>Review Comments</h3>
                    <p>
                      Leave internal notes or applicant-visible correction items
                      tied to the exact section that needs attention.
                    </p>
                  </div>
                  <span className="status-chip status-chip--soft">
                    {commentSummary?.unresolved || 0} unresolved
                  </span>
                </div>

                <div className="review-overview-grid">
                  <article className="review-overview-card">
                    <span className="review-overview-card__label">All Comments</span>
                    <strong>{commentSummary?.total || 0}</strong>
                    <p>Every note recorded against this application.</p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">Open Items</span>
                    <strong>{commentSummary?.unresolved || 0}</strong>
                    <p>Comments still waiting for follow-up or confirmation.</p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">
                      Applicant Visible
                    </span>
                    <strong>{commentSummary?.unresolvedApplicant || 0}</strong>
                    <p>Outstanding notes the applicant can currently see.</p>
                  </article>

                  <article className="review-overview-card">
                    <span className="review-overview-card__label">Internal Only</span>
                    <strong>{commentSummary?.unresolvedInternal || 0}</strong>
                    <p>Reviewer-only notes kept inside the internal workspace.</p>
                  </article>
                </div>

                <div className="comment-composer">
                  <div className="comment-composer__header">
                    <strong>Add review comment</strong>
                    <span>
                      Use applicant-visible comments before requesting more
                      information so the correction path is explicit.
                    </span>
                  </div>

                  <div className="form-grid">
                    <label className="field">
                      <span>Visibility</span>
                      <select
                        value={commentVisibility}
                        onChange={(event) => {
                          const nextVisibility = event.target
                            .value as CommentVisibility;
                          setCommentVisibility(nextVisibility);
                          setCommentType(
                            nextVisibility === "internal" ? "general" : "correction"
                          );
                        }}
                        disabled={processingComment}
                      >
                        <option value="applicant">Applicant visible</option>
                        <option value="internal">Internal only</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Related Section</span>
                      <select
                        value={commentSectionKey}
                        onChange={(event) => setCommentSectionKey(event.target.value)}
                        disabled={processingComment}
                      >
                        <option value="">General application note</option>
                        {selectedApplication.sections.map((section) => (
                          <option key={section.key} value={section.key}>
                            {section.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Comment Type</span>
                      <select
                        value={commentType}
                        onChange={(event) => setCommentType(event.target.value)}
                        disabled={processingComment}
                      >
                        <option value="correction">Correction</option>
                        <option value="document">Document</option>
                        <option value="general">General</option>
                      </select>
                    </label>
                  </div>

                  <label className="field">
                    <span>Comment</span>
                    <textarea
                      value={commentMessage}
                      onChange={(event) => setCommentMessage(event.target.value)}
                      placeholder="Example: Please replace the tax clearance certificate and confirm the bank account holder name."
                      disabled={processingComment}
                    />
                  </label>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => void handleCreateComment()}
                      disabled={processingComment}
                    >
                      {processingComment ? "Saving..." : "Add Comment"}
                    </button>
                  </div>
                </div>

                {selectedApplication.comments.length === 0 ? (
                  <div className="empty-state">
                    <strong>No review comments yet</strong>
                    <span>
                      Add the first comment to capture reviewer guidance or
                      applicant corrections in one thread.
                    </span>
                  </div>
                ) : (
                  <div className="comment-thread">
                    {selectedApplication.comments.map((comment) => (
                      <article key={comment.id} className="comment-card">
                        <div className="comment-card__header">
                          <div>
                            <strong>{comment.author.fullName}</strong>
                            <span className="comment-card__meta">
                              {comment.sectionKey
                                ? humanize(comment.sectionKey)
                                : "General note"}{" "}
                              | {humanize(comment.commentType)} |{" "}
                              {humanize(comment.visibility)} |{" "}
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <span
                            className={`status-chip${
                              comment.isResolved
                                ? " status-chip--brand"
                                : comment.visibility === "internal"
                                  ? " status-chip--danger"
                                  : " status-chip--soft"
                            }`}
                          >
                            {comment.isResolved
                              ? "Resolved"
                              : comment.visibility === "internal"
                                ? "Internal"
                                : "Open with applicant"}
                          </span>
                        </div>

                        <p className="comment-card__message">{comment.message}</p>

                        <div className="comment-card__actions">
                          <button
                            type="button"
                            className="button button--ghost"
                            onClick={() =>
                              void handleToggleCommentResolution(
                                comment.id,
                                !comment.isResolved
                              )
                            }
                            disabled={processingCommentId === comment.id}
                          >
                            {processingCommentId === comment.id
                              ? "Saving..."
                              : comment.isResolved
                                ? "Reopen"
                                : "Resolve"}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="form-section">
                <div className="form-section__header">
                  <div>
                    <h3>Review Actions</h3>
                    <p>
                      Add a note, then request corrections, approve, or reject
                      the application. The request note will also be sent
                      back into the applicant-visible comment thread.
                    </p>
                  </div>
                  <span className="status-chip">
                    {isDecisionLocked
                      ? "Decision locked"
                      : canApproveApplication
                        ? "Decision ready"
                        : "Approval blocked"}
                  </span>
                </div>

                <label className="field">
                  <span>Review Note</span>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Record the reason for the action or any review notes."
                    disabled={processingAction || isDecisionLocked}
                  />
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => openDecisionModal("request-info")}
                    disabled={processingAction || isDecisionLocked}
                  >
                    Request Corrections
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => openDecisionModal("reject")}
                    disabled={processingAction || isDecisionLocked}
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => openDecisionModal("approve")}
                    disabled={processingAction || isDecisionLocked || !canApproveApplication}
                  >
                    {processingAction ? "Processing..." : "Approve Application"}
                  </button>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>

      {pendingDecision ? (
        <div className="decision-modal__backdrop" role="presentation" onClick={closeDecisionModal}>
          <div
            className="decision-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="decision-modal__header">
              <div>
                <p className="panel-header__eyebrow">Confirm decision</p>
                <h3 id="decision-modal-title">
                  {DECISION_ACTION_COPY[pendingDecision].title}
                </h3>
              </div>
              <span
                className={`status-chip ${
                  DECISION_ACTION_COPY[pendingDecision].toneClassName
                }`}
              >
                {pendingDecision === "approve"
                  ? "Final action"
                  : pendingDecision === "reject"
                    ? "Needs a note"
                    : "Returns to applicant"}
              </span>
            </div>

            <p className="decision-modal__copy">
              {DECISION_ACTION_COPY[pendingDecision].description}
            </p>

            {DECISION_ACTION_COPY[pendingDecision].requiresNote && !reviewNote.trim() ? (
              <p className="feedback feedback--error decision-modal__hint">
                A review note is required before you can confirm this action.
              </p>
            ) : null}

            <div className="decision-modal__actions">
              <button
                type="button"
                className="button button--ghost"
                onClick={closeDecisionModal}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => void confirmDecision()}
                disabled={
                  processingAction ||
                  (DECISION_ACTION_COPY[pendingDecision].requiresNote && !reviewNote.trim()) ||
                  (pendingDecision === "approve" && !canApproveApplication)
                }
              >
                {processingAction
                  ? "Processing..."
                  : DECISION_ACTION_COPY[pendingDecision].confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default InternalReviewWorkspace;
