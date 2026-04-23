// types/intake.types.ts
export type IntakeFilter =
  | "all"
  | "draft"
  | "submitted"
  | "under-review"
  | "action-required";

export type SortOrder = "newest" | "oldest";

export interface IntakeFilterOption {
  value: IntakeFilter;
  label: string;
}

export interface QueueSummary {
  startedToday: number;
  drafts: number;
  submitted: number;
  inReview: number;
  actionRequired: number;
}

export interface ApplicationSummary {
  completedSections: number;
  openComments: number;
  applicantVisibleComments: number;
  progressPercent: number;
  latestTask: ReviewTask | null;
}

// constants/intake.constants.ts
import { IntakeFilterOption } from "../types/intake.types";

export const INTAKE_FILTERS: readonly IntakeFilterOption[] = [
  { value: "all", label: "All Active" },
  { value: "draft", label: "Drafts" },
  { value: "submitted", label: "Submitted" },
  { value: "under-review", label: "In Review" },
  { value: "action-required", label: "Action Required" },
] as const;

export const REVIEWING_STATUSES = new Set([
  "initial_review",
  "document_check",
  "compliance_review",
] as const);

export const STATUS_LABELS: Record<string, string> = {
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
} as const;

export const APPLICATION_TYPE_LABELS: Record<string, string> = {
  merchant: "Merchant",
  agent: "Agent",
  payer: "Payer / Biller",
} as const;

export const STATUS_VARIANTS: Record<string, string> = {
  draft: "draft",
  needs_more_information: "warning",
  approved: "success",
  activated: "success",
  rejected: "danger",
} as const;

// utils/intake.utils.ts
export const humanize = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export const formatDate = (value: string | null): string => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatValue = (value: string | null | undefined): string =>
  value?.trim() || "-";

export const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status] || humanize(status);

export const getStatusVariant = (status: string): string =>
  STATUS_VARIANTS[status] || "info";

export const getApplicationTypeLabel = (type: string): string =>
  APPLICATION_TYPE_LABELS[type] || humanize(type);

export const matchesFilter = (
  item: ReviewQueueItem,
  filter: IntakeFilter,
): boolean => {
  const filterMap: Record<IntakeFilter, (item: ReviewQueueItem) => boolean> = {
    all: () => true,
    draft: (item) => item.status === "draft",
    submitted: (item) => item.status === "submitted",
    "under-review": (item) => REVIEWING_STATUSES.has(item.status),
    "action-required": (item) => item.status === "needs_more_information",
  };

  return filterMap[filter](item);
};

export const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const getProgressPercent = (completed: number, total: number): number =>
  total > 0 ? Math.round((completed / total) * 100) : 0;

export const resolveSelectedApplicationId = (
  items: ReviewQueueItem[],
  currentSelected: string,
  preferredApplicationId?: string,
): string => {
  if (
    preferredApplicationId &&
    items.some((item) => item.applicationId === preferredApplicationId)
  ) {
    return preferredApplicationId;
  }

  if (
    currentSelected &&
    items.some((item) => item.applicationId === currentSelected)
  ) {
    return currentSelected;
  }

  return items[0]?.applicationId || "";
};

// hooks/useIntakeQueue.ts
import { useState, useCallback, useRef } from "react";
import { getReviewQueue } from "../services/api";

export const useIntakeQueue = () => {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const loadQueue = useCallback(async (
    preferredApplicationId?: string,
    currentSelected?: string,
  ): Promise<string | null> => {
    setLoading(true);
    setError("");

    try {
      const response = await getReviewQueue("intake");
      const nextSelectedId = resolveSelectedApplicationId(
        response.items,
        currentSelected || "",
        preferredApplicationId,
      );

      setQueue(response.items);
      return nextSelectedId;
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error
        ? caughtError.message
        : "Unable to load the intake queue.";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    queue,
    loading,
    error,
    loadQueue,
    setQueue,
  };
};

// hooks/useApplicationDetail.ts
import { useState, useCallback, useRef } from "react";
import { getApplication, ApplicationDetailResponse } from "../services/api";

export const useApplicationDetail = () => {
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const requestIdRef = useRef(0);

  const loadDetail = useCallback(async (applicationId: string): Promise<boolean> => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    try {
      const response = await getApplication(applicationId);

      if (requestIdRef.current !== requestId) return false;

      setApplication(response);
      return true;
    } catch (caughtError) {
      if (requestIdRef.current !== requestId) return false;

      const errorMessage = caughtError instanceof Error
        ? caughtError.message
        : "Unable to load the selected application.";
      setError(errorMessage);
      return false;
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, []);

  const resetRequestId = useCallback(() => {
    requestIdRef.current += 1;
    setApplication(null);
    setLoading(true);
  }, []);

  return {
    application,
    loading,
    error,
    loadDetail,
    resetRequestId,
    setApplication,
  };
};

// hooks/useQueueFiltering.ts
import { useMemo } from "react";
import { IntakeFilter, SortOrder } from "../types/intake.types";

export const useQueueFiltering = (
  queue: ReviewQueueItem[],
  filter: IntakeFilter,
  searchTerm: string,
  sortOrder: SortOrder,
) => {
  return useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = queue
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => {
        if (!normalizedSearch) return true;

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

    return filtered.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [queue, filter, searchTerm, sortOrder]);
};

// hooks/useQueueSummary.ts
import { useMemo } from "react";
import { QueueSummary } from "../types/intake.types";

export const useQueueSummary = (queue: ReviewQueueItem[]): QueueSummary => {
  return useMemo(() => {
    const today = new Date();

    return {
      startedToday: queue.filter((item) =>
        isSameCalendarDay(new Date(item.createdAt), today)
      ).length,
      drafts: queue.filter((item) => item.status === "draft").length,
      submitted: queue.filter((item) => item.status === "submitted").length,
      inReview: queue.filter((item) => REVIEWING_STATUSES.has(item.status)).length,
      actionRequired: queue.filter(
        (item) => item.status === "needs_more_information"
      ).length,
    };
  }, [queue]);
};

// hooks/useApplicationSummary.ts
import { useMemo } from "react";
import { ApplicationSummary } from "../types/intake.types";

export const useApplicationSummary = (
  application: ApplicationDetailResponse | null
): ApplicationSummary | null => {
  return useMemo(() => {
    if (!application) return null;

    const completedSections = application.sections.filter(
      (section) => section.status === "completed"
    ).length;

    const openComments = application.comments.filter(
      (comment) => !comment.isResolved
    ).length;

    const applicantVisibleComments = application.comments.filter(
      (comment) => !comment.isResolved && comment.visibility === "applicant"
    ).length;

    const latestTask =
      application.reviewTasks.find(
        (task) => task.status !== "completed" && task.status !== "cancelled"
      ) || application.reviewTasks[0] || null;

    return {
      completedSections,
      openComments,
      applicantVisibleComments,
      progressPercent: getProgressPercent(completedSections, application.sections.length),
      latestTask,
    };
  }, [application]);
};

// hooks/useLatestComments.ts
import { useMemo } from "react";

export const useLatestComments = (application: ApplicationDetailResponse | null) => {
  return useMemo(() => {
    if (!application) return [];

    return [...application.comments]
      .sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 4);
  }, [application]);
};

// components/IntakeSummaryGrid.tsx
import React from "react";
import { QueueSummary } from "../types/intake.types";

interface IntakeSummaryGridProps {
  summary: QueueSummary;
}

export const IntakeSummaryGrid: React.FC<IntakeSummaryGridProps> = ({ summary }) => {
  const cards = [
    {
      title: "Started Today",
      value: summary.startedToday,
      description: "New onboarding records opened by applicants today.",
    },
    {
      title: "Draft In Progress",
      value: summary.drafts,
      description: "Applications still being prepared and not yet submitted.",
    },
    {
      title: "Ready For Review",
      value: summary.submitted,
      description: "Submitted files waiting to move through the internal queue.",
    },
    {
      title: "In Review",
      value: summary.inReview,
      description: "Files already with reviewers for operational checks.",
    },
    {
      title: "Action Required",
      value: summary.actionRequired,
      description: "Applications returned to applicants for corrections.",
    },
  ];

  return (
    <section className="intake-summary-grid" aria-label="Intake summary">
      {cards.map((card) => (
        <article key={card.title} className="intake-summary-card">
          <span>{card.title}</span>
          <strong>{card.value}</strong>
          <p>{card.description}</p>
        </article>
      ))}
    </section>
  );
};

// components/IntakeQueueItem.tsx
import React from "react";

interface IntakeQueueItemProps {
  item: ReviewQueueItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const IntakeQueueItem: React.FC<IntakeQueueItemProps> = ({
  item,
  isSelected,
  onSelect,
}) => {
  const progressPercent = getProgressPercent(
    item.sectionProgress.completed,
    item.sectionProgress.total
  );

  return (
    <button
      type="button"
      className={`intake-queue-item${isSelected ? " intake-queue-item--active" : ""}`}
      onClick={() => onSelect(item.applicationId)}
    >
      <div className="intake-queue-item__header">
        <div>
          <strong>{item.organization.legalName}</strong>
          <p>
            {getApplicationTypeLabel(item.applicationType)} |{" "}
            {item.startedBy.fullName}
          </p>
        </div>
        <span className={`status-badge status-badge--${getStatusVariant(item.status)}`}>
          {getStatusLabel(item.status)}
        </span>
      </div>

      <div className="intake-queue-item__meta">
        <span>Started {formatDate(item.createdAt)}</span>
        <span>Updated {formatDate(item.updatedAt)}</span>
        <span>
          {item.sectionProgress.completed}/{item.sectionProgress.total} sections complete
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
              ? `${humanize(item.reviewTask.taskType)} | ${humanize(item.reviewTask.status)}`
              : "No active review task yet"}
          </span>
        </div>
      </div>
    </button>
  );
};

// components/IntakeQueuePanel.tsx
import React from "react";
import { IntakeFilter, SortOrder } from "../types/intake.types";

interface IntakeQueuePanelProps {
  items: ReviewQueueItem[];
  selectedId: string;
  loading: boolean;
  searchTerm: string;
  filter: IntakeFilter;
  sortOrder: SortOrder;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: IntakeFilter) => void;
  onSortChange: (order: SortOrder) => void;
  onRefresh: () => Promise<void>;
  onSelectItem: (id: string) => void;
}

export const IntakeQueuePanel: React.FC<IntakeQueuePanelProps> = ({
  items,
  selectedId,
  loading,
  searchTerm,
  filter,
  sortOrder,
  onSearchChange,
  onFilterChange,
  onSortChange,
  onRefresh,
  onSelectItem,
}) => {
  const handleRefresh = () => {
    void onRefresh();
  };

  return (
    <section className="page-section intake-queue-panel">
      <div className="page-section__header">
        <div>
          <p className="page-section__eyebrow">Internal intake</p>
          <h2 className="page-section__title">Intake queue</h2>
          <p className="page-section__description">
            Monitor new onboarding activity and identify which files are ready to move into review.
          </p>
        </div>

        <div className="page-section__meta">
          <span className="status-chip status-chip--soft">
            {items.length} active
          </span>
        </div>
      </div>

      <div className="intake-queue-tools">
        <label className="field review-search">
          <span>Search</span>
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
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
                  filter === option.value ? " review-scope__button--active" : ""
                }`}
                onClick={() => onFilterChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="field review-sort__field">
            <span>Sort</span>
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as SortOrder)}
            >
              <option value="newest">Newest activity</option>
              <option value="oldest">Oldest activity</option>
            </select>
          </label>

          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="intake-queue-list">
        {loading ? (
          <div className="empty-state empty-state--compact">
            <strong>Loading intake queue...</strong>
            <span>Preparing the latest onboarding start activity.</span>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <strong>No applications found</strong>
            <span>
              Try another search or filter, or wait for a new onboarding record to be created.
            </span>
          </div>
        ) : (
          items.map((item) => (
            <IntakeQueueItem
              key={item.applicationId}
              item={item}
              isSelected={item.applicationId === selectedId}
              onSelect={onSelectItem}
            />
          ))
        )}
      </div>
    </section>
  );
};

// components/ApplicationDetailModal.tsx
import React from "react";
import { ApplicationSummary } from "../types/intake.types";

interface ApplicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationDetailResponse | null;
  summary: ApplicationSummary | null;
  loading: boolean;
  latestComments: Comment[];
  onRefresh: () => Promise<void>;
  onOpenReview: () => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  isOpen,
  onClose,
  application,
  summary,
  loading,
  latestComments,
  onRefresh,
  onOpenReview,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="intake-detail-modal__backdrop"
      role="presentation"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      <section
        className="intake-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-detail-modal-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="intake-detail-modal__header">
          <div>
            <p className="page-section__eyebrow">Selected application</p>
            <h2 id="intake-detail-modal-title" className="page-section__title">
              {application?.organization.legalName || "Application detail"}
            </h2>
          </div>

          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="intake-detail-modal__body">
          {loading ? (
            <div className="empty-state">
              <strong>Loading application detail...</strong>
              <span>Preparing the selected onboarding record.</span>
            </div>
          ) : !application || !summary ? (
            <div className="empty-state">
              <strong>No application selected</strong>
              <span>
                Choose an onboarding record from the intake list to inspect its current state.
              </span>
            </div>
          ) : (
            <ApplicationDetailContent
              application={application}
              summary={summary}
              latestComments={latestComments}
              onRefresh={onRefresh}
              onOpenReview={onOpenReview}
            />
          )}
        </div>
      </section>
    </div>
  );
};

// components/ApplicationDetailContent.tsx
import React from "react";

interface ApplicationDetailContentProps {
  application: ApplicationDetailResponse;
  summary: ApplicationSummary;
  latestComments: Comment[];
  onRefresh: () => Promise<void>;
  onOpenReview: () => void;
}

const ApplicationDetailContent: React.FC<ApplicationDetailContentProps> = ({
  application,
  summary,
  latestComments,
  onRefresh,
  onOpenReview,
}) => {
  return (
    <div className="intake-detail-stack">
      <ApplicationHeader application={application} summary={summary} />
      
      <ApplicationKPIs application={application} summary={summary} />
      
      <ApplicationActions
        application={application}
        onRefresh={onRefresh}
        onOpenReview={onOpenReview}
      />
      
      <ApplicationMetadata application={application} />
      
      <ApplicationReadiness application={application} summary={summary} />
      
      <ApplicationComments comments={latestComments} />
    </div>
  );
};

// components/ApplicationHeader.tsx
const ApplicationHeader: React.FC<{ application: ApplicationDetailResponse; summary: ApplicationSummary }> = ({
  application,
  summary,
}) => (
  <section className="page-section">
    <div className="page-section__header">
      <div>
        <p className="page-section__eyebrow">Selected application</p>
        <h2 className="page-section__title">{application.organization.legalName}</h2>
        <p className="page-section__description">
          {getApplicationTypeLabel(application.applicationType)} onboarding record for{" "}
          {application.startedBy.fullName}.
        </p>
      </div>

      <div className="page-section__meta">
        <span className={`status-badge status-badge--${getStatusVariant(application.status)}`}>
          {getStatusLabel(application.status)}
        </span>
        <dl className="inline-meta">
          <div>
            <dt>Current step</dt>
            <dd>{application.currentStep ? humanize(application.currentStep) : "Business Snapshot"}</dd>
          </div>
          <div>
            <dt>Last activity</dt>
            <dd>{formatDate(application.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </div>

    <div className="progress-block">
      <div className="progress-block__header">
        <strong>{summary.progressPercent}% complete</strong>
        <span>
          {summary.completedSections} of {application.sections.length} sections completed
        </span>
      </div>
      <div className="progress-track" aria-hidden="true">
        <div
          className="progress-track__fill"
          style={{ width: `${summary.progressPercent}%` }}
        />
      </div>
    </div>
  </section>
);

// components/ApplicationKPIs.tsx
const ApplicationKPIs: React.FC<{ application: ApplicationDetailResponse; summary: ApplicationSummary }> = ({
  application,
  summary,
}) => (
  <div className="intake-kpi-grid">
    <article className="intake-kpi-card">
      <span>Open Comments</span>
      <strong>{summary.openComments}</strong>
    </article>
    <article className="intake-kpi-card">
      <span>Applicant Visible Notes</span>
      <strong>{summary.applicantVisibleComments}</strong>
    </article>
    <article className="intake-kpi-card">
      <span>Required Docs Accepted</span>
      <strong>
        {application.documentReviewSummary.acceptedRequiredDocuments}/
        {application.documentReviewSummary.requiredDocuments}
      </strong>
    </article>
  </div>
);

// components/ApplicationActions.tsx
const ApplicationActions: React.FC<{
  application: ApplicationDetailResponse;
  onRefresh: () => Promise<void>;
  onOpenReview: () => void;
}> = ({ application, onRefresh, onOpenReview }) => (
  <div className="page-actions">
    {application.status === "draft" ? (
      <span className="status-chip status-chip--soft">
        Drafts remain in intake until the applicant submits.
      </span>
    ) : (
      <button type="button" className="btn btn--primary" onClick={onOpenReview}>
        Open in review queue
      </button>
    )}

    <button type="button" className="btn btn--secondary" onClick={() => void onRefresh()}>
      Refresh this record
    </button>
  </div>
);

// components/ApplicationMetadata.tsx
const ApplicationMetadata: React.FC<{ application: ApplicationDetailResponse }> = ({ application }) => (
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
          <dd>{application.startedBy.fullName}</dd>
        </div>
        <div>
          <dt>Mobile number</dt>
          <dd>{application.startedBy.mobileNumber}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{formatValue(application.startedBy.email)}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatDate(application.createdAt)}</dd>
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
          <dd>{application.organization.legalName}</dd>
        </div>
        <div>
          <dt>Trading name</dt>
          <dd>{formatValue(application.organization.tradingName)}</dd>
        </div>
        <div>
          <dt>Entity type</dt>
          <dd>{humanize(application.organization.entityType)}</dd>
        </div>
        <div>
          <dt>Business email</dt>
          <dd>{formatValue(application.organization.businessEmail)}</dd>
        </div>
        <div>
          <dt>Business phone</dt>
          <dd>{formatValue(application.organization.businessPhone)}</dd>
        </div>
      </dl>
    </section>
  </div>
);

// components/ApplicationReadiness.tsx
const ApplicationReadiness: React.FC<{ application: ApplicationDetailResponse; summary: ApplicationSummary }> = ({
  application,
  summary,
}) => (
  <section className="page-section intake-readiness-section">
    <div className="page-section__header">
      <div>
        <p className="page-section__eyebrow">Application readiness</p>
        <h3 className="page-section__title">Progress and operational checks</h3>
        <p className="page-section__description">
          Review section completion alongside the latest task and document readiness indicators.
        </p>
      </div>
    </div>

    <div className="intake-readiness-layout">
      <div className="intake-readiness-column">
        <div className="intake-readiness-subheader">
          <strong>Section completion</strong>
          <span>
            {summary.completedSections}/{application.sections.length} complete
          </span>
        </div>

        <div className="section-tracker section-tracker--stacked">
          {application.sections.map((section) => (
            <article key={section.key} className="section-tracker__item">
              <div className="section-tracker__item-top">
                <div>
                  <strong>{section.title}</strong>
                  <p>Last updated {formatDate(section.lastEditedAt)}</p>
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
      </div>

      <aside className="intake-readiness-summary">
        <div className="intake-readiness-subheader">
          <strong>Operational readiness</strong>
          <span>{getStatusLabel(application.status)}</span>
        </div>

        <dl className="stacked-meta">
          <div>
            <dt>Latest review task</dt>
            <dd>
              {summary.latestTask
                ? `${humanize(summary.latestTask.taskType)} | ${humanize(summary.latestTask.status)}`
                : "No internal review task yet"}
            </dd>
          </div>
          <div>
            <dt>Total uploaded documents</dt>
            <dd>{application.documentReviewSummary.totalDocuments}</dd>
          </div>
          <div>
            <dt>Pending required documents</dt>
            <dd>{application.documentReviewSummary.pendingRequiredDocuments.length}</dd>
          </div>
          <div>
            <dt>Missing required documents</dt>
            <dd>{application.documentReviewSummary.missingRequiredDocuments.length}</dd>
          </div>
          <div>
            <dt>Rejected required documents</dt>
            <dd>{application.documentReviewSummary.rejectedRequiredDocuments.length}</dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
);

// components/ApplicationComments.tsx
const ApplicationComments: React.FC<{ comments: Comment[] }> = ({ comments }) => (
  <section className="page-section">
    <div className="page-section__header">
      <div>
        <p className="page-section__eyebrow">Latest comments</p>
        <h3 className="page-section__title">Reviewer and applicant thread</h3>
        <p className="page-section__description">
          Use the latest notes to see whether the file is clean, blocked, or waiting on the applicant.
        </p>
      </div>
    </div>

    {comments.length === 0 ? (
      <div className="empty-state empty-state--compact">
        <strong>No comments yet</strong>
        <span>
          Review feedback and applicant responses will appear here once the conversation starts.
        </span>
      </div>
    ) : (
      <div className="message-list">
        {comments.map((comment) => (
          <article key={comment.id} className="message-item">
            <div className="message-item__header">
              <strong>
                {comment.sectionKey ? humanize(comment.sectionKey) : "General note"}
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
              {comment.author.fullName} | {humanize(comment.commentType)} |{" "}
              {formatDate(comment.updatedAt)}
            </span>
          </article>
        ))}
      </div>
    )}
  </section>
);

// InternalIntakeWorkspace.tsx (Main Component - Refactored)
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { IntakeFilter, SortOrder } from "./types/intake.types";
import { useIntakeQueue } from "./hooks/useIntakeQueue";
import { useApplicationDetail } from "./hooks/useApplicationDetail";
import { useQueueFiltering } from "./hooks/useQueueFiltering";
import { useQueueSummary } from "./hooks/useQueueSummary";
import { useApplicationSummary } from "./hooks/useApplicationSummary";
import { useLatestComments } from "./hooks/useLatestComments";
import { IntakeSummaryGrid } from "./components/IntakeSummaryGrid";
import { IntakeQueuePanel } from "./components/IntakeQueuePanel";
import { ApplicationDetailModal } from "./components/ApplicationDetailModal";

function InternalIntakeWorkspace(): JSX.Element {
  const navigate = useNavigate();
  
  // State
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<IntakeFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Custom hooks
  const {
    queue,
    loading: loadingQueue,
    error: queueError,
    loadQueue,
  } = useIntakeQueue();

  const {
    application,
    loading: loadingDetail,
    error: detailError,
    loadDetail,
    resetRequestId,
  } = useApplicationDetail();

  // Derived state
  const filteredQueue = useQueueFiltering(queue, filter, searchTerm, sortOrder);
  const queueSummary = useQueueSummary(queue);
  const applicationSummary = useApplicationSummary(application);
  const latestComments = useLatestComments(application);

  // Effects
  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (filteredQueue.length === 0) {
      setSelectedApplicationId("");
      setIsDetailModalOpen(false);
      return;
    }

    setSelectedApplicationId((current) =>
      filteredQueue.some((item) => item.applicationId === current)
        ? current
        : filteredQueue[0].applicationId
    );
  }, [filteredQueue]);

  useEffect(() => {
    if (!selectedApplicationId) {
      resetRequestId();
      setIsDetailModalOpen(false);
      return;
    }

    void loadDetail(selectedApplicationId);
  }, [selectedApplicationId, loadDetail, resetRequestId]);

  // Handlers
  const handleRefresh = useCallback(async (): Promise<void> => {
    const previousId = selectedApplicationId;
    const nextId = await loadQueue(previousId || undefined, previousId);

    if (!nextId) return;

    let detailRefreshed = true;
    if (nextId === previousId && nextId) {
      detailRefreshed = await loadDetail(nextId);
    }

    if (detailRefreshed) {
      setMessage("Intake queue refreshed.");
    }
  }, [selectedApplicationId, loadQueue, loadDetail]);

  const handleSelectQueueItem = useCallback((applicationId: string): void => {
    if (applicationId !== selectedApplicationId) {
      resetRequestId();
    }
    setSelectedApplicationId(applicationId);
    setIsDetailModalOpen(true);
    setMessage("");
  }, [selectedApplicationId, resetRequestId]);

  const handleOpenReviewQueue = useCallback((): void => {
    if (!application) return;
    
    setIsDetailModalOpen(false);
    navigate(`/internal/review?scope=pending&applicationId=${application.applicationId}`);
  }, [application, navigate]);

  const error = queueError || detailError;

  return (
    <div className="intake-workspace">
      {error && <p className="feedback feedback--error">{error}</p>}
      {message && <p className="feedback feedback--success">{message}</p>}

      <IntakeSummaryGrid summary={queueSummary} />

      <div className="intake-layout">
        <aside className="intake-queue-column">
          <IntakeQueuePanel
            items={filteredQueue}
            selectedId={selectedApplicationId}
            loading={loadingQueue}
            searchTerm={searchTerm}
            filter={filter}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onFilterChange={setFilter}
            onSortChange={setSortOrder}
            onRefresh={handleRefresh}
            onSelectItem={handleSelectQueueItem}
          />
        </aside>
      </div>

      <ApplicationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        application={application}
        summary={applicationSummary}
        loading={loadingDetail}
        latestComments={latestComments}
        onRefresh={handleRefresh}
        onOpenReview={handleOpenReviewQueue}
      />
    </div>
  );
}

export default InternalIntakeWorkspace;