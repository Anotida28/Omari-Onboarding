import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApplicationDetailResponse,
  ReviewQueueItem,
  getApplication,
  getReviewQueue,
} from "../services/api";

type IntakeFilter =
  | "all"
  | "draft"
  | "submitted"
  | "under-review"
  | "action-required";

const INTAKE_FILTERS: Array<{ value: IntakeFilter; label: string }> = [
  { value: "all", label: "All Active" },
  { value: "draft", label: "Drafts" },
  { value: "submitted", label: "Submitted" },
  { value: "under-review", label: "In Review" },
  { value: "action-required", label: "Action Required" },
];

const REVIEWING_STATUSES = new Set([
  "initial_review",
  "document_check",
  "compliance_review",
]);

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
    minute: "2-digit",
  });
};

const formatValue = (value: string | null | undefined): string =>
  value && value.trim() ? value : "-";

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    initial_review: "Initial Review",
    document_check: "Document Check",
    compliance_review: "Compliance Review",
    needs_more_information: "Action Required",
    approved: "Approved",
    rejected: "Rejected",
    activated: "Activated",
    archived: "Archived",
  };

  return labels[status] || humanize(status);
};

const getStatusVariant = (status: string): string => {
  if (status === "draft") {
    return "draft";
  }

  if (status === "needs_more_information") {
    return "warning";
  }

  if (["approved", "activated"].includes(status)) {
    return "success";
  }

  if (status === "rejected") {
    return "danger";
  }

  return "info";
};

const getApplicationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    merchant: "Merchant",
    agent: "Agent",
    payer: "Payer / Biller",
  };

  return labels[type] || humanize(type);
};

const matchesFilter = (
  item: ReviewQueueItem,
  filter: IntakeFilter,
): boolean => {
  if (filter === "all") {
    return true;
  }

  if (filter === "draft") {
    return item.status === "draft";
  }

  if (filter === "submitted") {
    return item.status === "submitted";
  }

  if (filter === "under-review") {
    return REVIEWING_STATUSES.has(item.status);
  }

  return item.status === "needs_more_information";
};

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getProgressPercent = (completed: number, total: number): number =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

function InternalIntakeWorkspace(): JSX.Element {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationDetailResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<IntakeFilter>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadApplicationDetail = async (
    applicationId: string,
  ): Promise<void> => {
    setLoadingDetail(true);

    try {
      const response = await getApplication(applicationId);
      setSelectedApplication(response);
      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the selected application.",
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadQueue = async (preferredApplicationId?: string): Promise<void> => {
    setLoadingQueue(true);

    try {
      const response = await getReviewQueue("intake");
      setQueue(response.items);
      setSelectedApplicationId((currentSelected) => {
        if (
          preferredApplicationId &&
          response.items.some(
            (item) => item.applicationId === preferredApplicationId,
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
          : "Unable to load the intake queue.",
      );
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const filteredQueue = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const matchingItems = queue
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        const searchTarget = [
          item.organization.legalName,
          item.organization.tradingName || "",
          item.organization.entityType,
          item.applicationType,
          item.status,
          item.currentStep || "",
          item.startedBy.fullName,
          item.startedBy.mobileNumber,
          item.startedBy.email || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchTarget.includes(normalizedSearch);
      });

    return matchingItems.sort((left, right) => {
      const leftTime = new Date(left.updatedAt).getTime();
      const rightTime = new Date(right.updatedAt).getTime();

      return sortOrder === "newest"
        ? rightTime - leftTime
        : leftTime - rightTime;
    });
  }, [filter, queue, searchTerm, sortOrder]);

  useEffect(() => {
    if (filteredQueue.length === 0) {
      setSelectedApplicationId("");
      return;
    }

    setSelectedApplicationId((currentSelected) =>
      filteredQueue.some((item) => item.applicationId === currentSelected)
        ? currentSelected
        : filteredQueue[0].applicationId,
    );
  }, [filteredQueue]);

  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedApplication(null);
      return;
    }

    void loadApplicationDetail(selectedApplicationId);
  }, [selectedApplicationId]);

  const queueSummary = useMemo(() => {
    const today = new Date();

    return {
      startedToday: queue.filter((item) =>
        isSameCalendarDay(new Date(item.createdAt), today),
      ).length,
      drafts: queue.filter((item) => item.status === "draft").length,
      submitted: queue.filter((item) => item.status === "submitted").length,
      actionRequired: queue.filter(
        (item) => item.status === "needs_more_information",
      ).length,
    };
  }, [queue]);

  const selectedSummary = useMemo(() => {
    if (!selectedApplication) {
      return null;
    }

    const completedSections = selectedApplication.sections.filter(
      (section) => section.status === "completed",
    ).length;
    const openComments = selectedApplication.comments.filter(
      (comment) => !comment.isResolved,
    ).length;
    const applicantVisibleComments = selectedApplication.comments.filter(
      (comment) => !comment.isResolved && comment.visibility === "applicant",
    ).length;
    const latestTask =
      selectedApplication.reviewTasks.find(
        (task) => task.status !== "completed" && task.status !== "cancelled",
      ) ||
      selectedApplication.reviewTasks[0] ||
      null;

    return {
      completedSections,
      openComments,
      applicantVisibleComments,
      progressPercent: getProgressPercent(
        completedSections,
        selectedApplication.sections.length,
      ),
      latestTask,
    };
  }, [selectedApplication]);

  const latestComments = useMemo(() => {
    if (!selectedApplication) {
      return [];
    }

    return [...selectedApplication.comments]
      .sort((left, right) => {
        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      })
      .slice(0, 4);
  }, [selectedApplication]);

  const handleRefresh = async (): Promise<void> => {
    await loadQueue(selectedApplicationId || undefined);
    if (selectedApplicationId) {
      await loadApplicationDetail(selectedApplicationId);
    }
    setMessage("Intake queue refreshed.");
  };

  const handleOpenReviewQueue = (): void => {
    if (!selectedApplication) {
      return;
    }

    navigate(
      `/internal/review?scope=pending&applicationId=${selectedApplication.applicationId}`,
    );
  };

  return (
    <div className="intake-workspace">
      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      <section className="intake-summary-grid" aria-label="Intake summary">
        <article className="intake-summary-card">
          <span>Started Today</span>
          <strong>{queueSummary.startedToday}</strong>
          <p>New onboarding records opened by applicants today.</p>
        </article>

        <article className="intake-summary-card">
          <span>Draft In Progress</span>
          <strong>{queueSummary.drafts}</strong>
          <p>Applications still being prepared and not yet submitted.</p>
        </article>

        <article className="intake-summary-card">
          <span>Ready For Review</span>
          <strong>{queueSummary.submitted}</strong>
          <p>Submitted files waiting to move through the internal queue.</p>
        </article>

        <article className="intake-summary-card">
          <span>Action Required</span>
          <strong>{queueSummary.actionRequired}</strong>
          <p>Applications returned to applicants for corrections.</p>
        </article>
      </section>

      <div className="intake-layout">
        <aside className="intake-queue-column">
          <section className="page-section intake-queue-panel">
            <div className="page-section__header">
              <div>
                <p className="page-section__eyebrow">Internal intake</p>
                <h2 className="page-section__title">Intake queue</h2>
                <p className="page-section__description">
                  Monitor new onboarding activity and identify which files are
                  ready to move into review.
                </p>
              </div>

              <div className="page-section__meta">
                <span className="status-chip status-chip--soft">
                  {filteredQueue.length} active
                </span>
              </div>
            </div>

            <div className="intake-queue-tools">
              <label className="field review-search">
                <span>Search</span>
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search organization, applicant, phone, or status"
                />
              </label>

              <div className="review-sort">
                <div className="review-scope">
                  {INTAKE_FILTERS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`review-scope__button${
                        filter === option.value
                          ? " review-scope__button--active"
                          : ""
                      }`}
                      onClick={() => setFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="field review-sort__field">
                  <span>Sort</span>
                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value as "newest" | "oldest")
                    }
                  >
                    <option value="newest">Newest activity</option>
                    <option value="oldest">Oldest activity</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void handleRefresh()}
                  disabled={loadingQueue}
                >
                  {loadingQueue ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="intake-queue-list">
              {loadingQueue ? (
                <div className="empty-state empty-state--compact">
                  <strong>Loading intake queue...</strong>
                  <span>Preparing the latest onboarding start activity.</span>
                </div>
              ) : filteredQueue.length === 0 ? (
                <div className="empty-state empty-state--compact">
                  <strong>No applications found</strong>
                  <span>
                    Try another search or filter, or wait for a new onboarding
                    record to be created.
                  </span>
                </div>
              ) : (
                filteredQueue.map((item) => {
                  const progressPercent = getProgressPercent(
                    item.sectionProgress.completed,
                    item.sectionProgress.total,
                  );

                  return (
                    <button
                      key={item.applicationId}
                      type="button"
                      className={`intake-queue-item${
                        item.applicationId === selectedApplicationId
                          ? " intake-queue-item--active"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedApplicationId(item.applicationId);
                        setMessage("");
                      }}
                    >
                      <div className="intake-queue-item__header">
                        <div>
                          <strong>{item.organization.legalName}</strong>
                          <p>
                            {getApplicationTypeLabel(item.applicationType)} |{" "}
                            {item.startedBy.fullName}
                          </p>
                        </div>
                        <span
                          className={`status-badge status-badge--${getStatusVariant(
                            item.status,
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </div>

                      <div className="intake-queue-item__meta">
                        <span>Started {formatDate(item.createdAt)}</span>
                        <span>Updated {formatDate(item.updatedAt)}</span>
                        <span>
                          {item.sectionProgress.completed}/
                          {item.sectionProgress.total} sections complete
                        </span>
                      </div>

                      <div className="intake-queue-item__progress">
                        <div className="progress-track" aria-hidden="true">
                          <div
                            className="progress-track__fill"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="intake-queue-item__progress-meta">
                          <span>{progressPercent}% complete</span>
                          <span>
                            {item.reviewTask
                              ? `${humanize(item.reviewTask.taskType)} | ${humanize(
                                  item.reviewTask.status,
                                )}`
                              : "No active review task yet"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </aside>

        <div className="intake-detail-column">
          {loadingDetail ? (
            <div className="empty-state">
              <strong>Loading application detail...</strong>
              <span>Preparing the selected onboarding record.</span>
            </div>
          ) : !selectedApplication || !selectedSummary ? (
            <div className="empty-state">
              <strong>No application selected</strong>
              <span>
                Choose an onboarding record from the intake list to inspect its
                current state.
              </span>
            </div>
          ) : (
            <div className="intake-detail-stack">
              <section className="page-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">
                      Selected application
                    </p>
                    <h2 className="page-section__title">
                      {selectedApplication.organization.legalName}
                    </h2>
                    <p className="page-section__description">
                      {getApplicationTypeLabel(
                        selectedApplication.applicationType,
                      )}{" "}
                      onboarding record for{" "}
                      {selectedApplication.startedBy.fullName}.
                    </p>
                  </div>

                  <div className="page-section__meta">
                    <span
                      className={`status-badge status-badge--${getStatusVariant(
                        selectedApplication.status,
                      )}`}
                    >
                      {getStatusLabel(selectedApplication.status)}
                    </span>
                    <dl className="inline-meta">
                      <div>
                        <dt>Current step</dt>
                        <dd>
                          {selectedApplication.currentStep
                            ? humanize(selectedApplication.currentStep)
                            : "Business Snapshot"}
                        </dd>
                      </div>
                      <div>
                        <dt>Last activity</dt>
                        <dd>{formatDate(selectedApplication.updatedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="progress-block">
                  <div className="progress-block__header">
                    <strong>{selectedSummary.progressPercent}% complete</strong>
                    <span>
                      {selectedSummary.completedSections} of{" "}
                      {selectedApplication.sections.length} sections completed
                    </span>
                  </div>
                  <div className="progress-track" aria-hidden="true">
                    <div
                      className="progress-track__fill"
                      style={{ width: `${selectedSummary.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="intake-kpi-grid">
                  <article className="intake-kpi-card">
                    <span>Open Comments</span>
                    <strong>{selectedSummary.openComments}</strong>
                  </article>
                  <article className="intake-kpi-card">
                    <span>Applicant Visible Notes</span>
                    <strong>{selectedSummary.applicantVisibleComments}</strong>
                  </article>
                  <article className="intake-kpi-card">
                    <span>Required Docs Accepted</span>
                    <strong>
                      {
                        selectedApplication.documentReviewSummary
                          .acceptedRequiredDocuments
                      }
                      /
                      {
                        selectedApplication.documentReviewSummary
                          .requiredDocuments
                      }
                    </strong>
                  </article>
                </div>

                <div className="page-actions">
                  {selectedApplication.status === "draft" ? (
                    <span className="status-chip status-chip--soft">
                      Drafts remain in intake until the applicant submits.
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleOpenReviewQueue}
                    >
                      Open in review queue
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => void handleRefresh()}
                  >
                    Refresh this record
                  </button>
                </div>
              </section>

              <div className="detail-grid detail-grid--status">
                <section className="page-section">
                  <div className="page-section__header">
                    <div>
                      <p className="page-section__eyebrow">Applicant account</p>
                      <h3 className="page-section__title">Starter identity</h3>
                    </div>
                  </div>

                  <dl className="stacked-meta">
                    <div>
                      <dt>Full name</dt>
                      <dd>{selectedApplication.startedBy.fullName}</dd>
                    </div>
                    <div>
                      <dt>Mobile number</dt>
                      <dd>{selectedApplication.startedBy.mobileNumber}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        {formatValue(selectedApplication.startedBy.email)}
                      </dd>
                    </div>
                    <div>
                      <dt>Started</dt>
                      <dd>{formatDate(selectedApplication.createdAt)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="page-section">
                  <div className="page-section__header">
                    <div>
                      <p className="page-section__eyebrow">Organization</p>
                      <h3 className="page-section__title">Business context</h3>
                    </div>
                  </div>

                  <dl className="stacked-meta">
                    <div>
                      <dt>Legal name</dt>
                      <dd>{selectedApplication.organization.legalName}</dd>
                    </div>
                    <div>
                      <dt>Trading name</dt>
                      <dd>
                        {formatValue(
                          selectedApplication.organization.tradingName,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Entity type</dt>
                      <dd>
                        {humanize(selectedApplication.organization.entityType)}
                      </dd>
                    </div>
                    <div>
                      <dt>Business email</dt>
                      <dd>
                        {formatValue(
                          selectedApplication.organization.businessEmail,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Business phone</dt>
                      <dd>
                        {formatValue(
                          selectedApplication.organization.businessPhone,
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              <div className="detail-grid detail-grid--status">
                <section className="page-section">
                  <div className="page-section__header">
                    <div>
                      <p className="page-section__eyebrow">Progress tracker</p>
                      <h3 className="page-section__title">
                        Section completion
                      </h3>
                      <p className="page-section__description">
                        Follow where the applicant has already provided data and
                        which sections still need attention.
                      </p>
                    </div>
                  </div>

                  <div className="section-tracker section-tracker--stacked">
                    {selectedApplication.sections.map((section) => (
                      <article
                        key={section.key}
                        className="section-tracker__item"
                      >
                        <div className="section-tracker__item-top">
                          <div>
                            <strong>{section.title}</strong>
                            <p>
                              Last updated {formatDate(section.lastEditedAt)}
                            </p>
                          </div>
                          <span
                            className={`status-chip${
                              section.status === "completed"
                                ? " status-chip--brand"
                                : section.status === "in_progress"
                                  ? " status-chip--soft"
                                  : ""
                            }`}
                          >
                            {humanize(section.status)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="page-section">
                  <div className="page-section__header">
                    <div>
                      <p className="page-section__eyebrow">Readiness</p>
                      <h3 className="page-section__title">
                        Operational summary
                      </h3>
                    </div>
                  </div>

                  <dl className="stacked-meta">
                    <div>
                      <dt>Latest review task</dt>
                      <dd>
                        {selectedSummary.latestTask
                          ? `${humanize(selectedSummary.latestTask.taskType)} | ${humanize(
                              selectedSummary.latestTask.status,
                            )}`
                          : "No internal review task yet"}
                      </dd>
                    </div>
                    <div>
                      <dt>Total uploaded documents</dt>
                      <dd>
                        {
                          selectedApplication.documentReviewSummary
                            .totalDocuments
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Pending required documents</dt>
                      <dd>
                        {
                          selectedApplication.documentReviewSummary
                            .pendingRequiredDocuments.length
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Missing required documents</dt>
                      <dd>
                        {
                          selectedApplication.documentReviewSummary
                            .missingRequiredDocuments.length
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Rejected required documents</dt>
                      <dd>
                        {
                          selectedApplication.documentReviewSummary
                            .rejectedRequiredDocuments.length
                        }
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              <section className="page-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Latest comments</p>
                    <h3 className="page-section__title">
                      Reviewer and applicant thread
                    </h3>
                    <p className="page-section__description">
                      Use the latest notes to see whether the file is clean,
                      blocked, or waiting on the applicant.
                    </p>
                  </div>
                </div>

                {latestComments.length === 0 ? (
                  <div className="empty-state empty-state--compact">
                    <strong>No comments yet</strong>
                    <span>
                      Review feedback and applicant responses will appear here
                      once the conversation starts.
                    </span>
                  </div>
                ) : (
                  <div className="message-list">
                    {latestComments.map((comment) => (
                      <article key={comment.id} className="message-item">
                        <div className="message-item__header">
                          <strong>
                            {comment.sectionKey
                              ? humanize(comment.sectionKey)
                              : "General note"}
                          </strong>
                          <span
                            className={`status-chip${
                              comment.isResolved
                                ? " status-chip--brand"
                                : comment.visibility === "internal"
                                  ? ""
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
                        <p>{comment.message}</p>
                        <span className="message-item__meta">
                          {comment.author.fullName} |{" "}
                          {humanize(comment.commentType)} |{" "}
                          {formatDate(comment.updatedAt)}
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InternalIntakeWorkspace;
