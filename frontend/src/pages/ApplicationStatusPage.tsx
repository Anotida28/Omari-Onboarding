import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import Timeline, { TimelineEvent } from "../components/Timeline";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";
import {
  ApplicationDetailResponse,
  ReviewCommentItem,
  getActiveApplication,
  getApplication
} from "../services/api";

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

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Submitted",
    initial_review: "Under Review",
    document_check: "Document Check",
    compliance_review: "Compliance Review",
    needs_more_information: "Action Required",
    approved: "Approved",
    rejected: "Rejected",
    activated: "Activated",
    archived: "Archived"
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

const getApplicationRoute = (applicationType: string): string =>
  `/applications/wizard?type=${applicationType}`;

const groupCommentsBySection = (
  comments: ReviewCommentItem[]
): Record<string, ReviewCommentItem[]> =>
  comments.reduce<Record<string, ReviewCommentItem[]>>((accumulator, comment) => {
    const key = comment.sectionKey || "general";

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(comment);
    return accumulator;
  }, {});

const getWorkflowStageIndex = (status: string): number => {
  if (status === "draft") {
    return 0;
  }

  if (status === "submitted") {
    return 1;
  }

  if (["initial_review", "document_check", "needs_more_information"].includes(status)) {
    return 2;
  }

  if (status === "compliance_review") {
    return 3;
  }

  return 4;
};

function ApplicationStatusPage(): JSX.Element {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadApplication = async (): Promise<void> => {
      setLoadingApplication(true);

      try {
        const response = applicationId
          ? await getApplication(applicationId)
          : await getActiveApplication();

        setApplication(response);
        setError("");
      } catch (caughtError) {
        setApplication(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load the application status."
        );
      } finally {
        setLoadingApplication(false);
      }
    };

    void loadApplication();
  }, [applicationId]);

  const applicantComments = useMemo(
    () =>
      (application?.comments || [])
        .filter((comment) => comment.visibility === "applicant")
        .sort((left, right) => {
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }),
    [application]
  );

  const commentsBySection = useMemo(
    () => groupCommentsBySection(applicantComments),
    [applicantComments]
  );

  const workflowStages = useMemo(() => {
    if (!application) {
      return [];
    }

    const currentStageIndex = getWorkflowStageIndex(application.status);

    return [
      {
        key: "draft",
        title: "Draft",
        description: "Business details and application data are being prepared."
      },
      {
        key: "submitted",
        title: "Submitted",
        description: "The application file has been handed over to Omari."
      },
      {
        key: "review",
        title: "Review",
        description: "Operations review documents, contacts, and workflow completeness."
      },
      {
        key: "compliance",
        title: "Compliance",
        description: "Compliance validates the application before final outcome."
      },
      {
        key: "outcome",
        title: "Outcome",
        description: "The application is approved, rejected, or activated."
      }
    ].map((stage, index) => ({
      ...stage,
      isComplete: index < currentStageIndex,
      isCurrent: index === currentStageIndex
    }));
  }, [application]);

  const latestTask = useMemo(() => {
    if (!application) {
      return null;
    }

    return (
      application.reviewTasks.find(
        (task) => task.status !== "completed" && task.status !== "cancelled"
      ) ||
      application.reviewTasks[0] ||
      null
    );
  }, [application]);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!application) {
      return [];
    }

    return [...application.statusHistory]
      .sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })
      .map((item, index) => ({
        id: item.id,
        title: `${item.fromStatus ? humanize(item.fromStatus) : "New"} to ${humanize(
          item.toStatus
        )}`,
        description: item.reason || "Workflow status updated.",
        timestamp: formatDate(item.createdAt),
        isCompleted: true,
        isActive: index === 0
      }));
  }, [application]);

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant workspace"
      heading="Application Status"
      description="Track the business onboarding workflow, understand current review stage, and act on any requests without losing context."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {error ? <p className="feedback feedback--error">{error}</p> : null}

      {loadingApplication ? (
        <div className="empty-state">
          <strong>Loading your application status...</strong>
          <span>Preparing the latest workflow, comments, and document review context.</span>
        </div>
      ) : null}

      {!loadingApplication && !application ? (
        <section className="page-section">
          <div className="page-section__header">
            <div>
              <p className="page-section__eyebrow">Status</p>
              <h2 className="page-section__title">No active application</h2>
              <p className="page-section__description">
                Start an onboarding flow and this page will track reviewer activity, required
                actions, and workflow progression.
              </p>
            </div>
          </div>

          <div className="application-entry-list">
            {[
              ["merchant", "Merchant onboarding", "Merchant and settlement onboarding for businesses."],
              ["agent", "Agent onboarding", "Agent network and outlet onboarding workflow."],
              ["payer", "Payer / biller onboarding", "Settlement and payer agreement onboarding."]
            ].map(([key, title, description]) => (
              <article key={key} className="application-entry">
                <span className="application-entry__icon" aria-hidden="true">
                  {title.charAt(0)}
                </span>
                <div className="application-entry__copy">
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
                <Link to={`/applications/wizard?type=${key}`} className="btn btn--secondary">
                  Start
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!loadingApplication && application ? (
        <div className="status-workbench">
          <aside className="status-workbench__rail">
            <section className="page-section page-section--dense">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Current status</p>
                  <h2 className="page-section__title">{getStatusLabel(application.status)}</h2>
                  <p className="page-section__description">{application.organization.legalName}</p>
                </div>
              </div>

              <div className="status-rail-meta">
                <span className={`status-badge status-badge--${getStatusVariant(application.status)}`}>
                  {getStatusLabel(application.status)}
                </span>
                <dl className="stacked-meta stacked-meta--compact">
                  <div>
                    <dt>Application type</dt>
                    <dd>{humanize(application.applicationType)}</dd>
                  </div>
                  <div>
                    <dt>Current step</dt>
                    <dd>{humanize(application.currentStep || "business_snapshot")}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(application.submittedAt)}</dd>
                  </div>
                </dl>
              </div>
            </section>

            <section className="page-section page-section--dense">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Workflow</p>
                  <h3 className="page-section__title">Progress timeline</h3>
                </div>
              </div>

              <div className="workflow-rail">
                {workflowStages.map((stage) => (
                  <article
                    key={stage.key}
                    className={`workflow-rail__item${
                      stage.isCurrent ? " workflow-rail__item--current" : ""
                    }${stage.isComplete ? " workflow-rail__item--complete" : ""}`}
                  >
                    <span className="workflow-rail__dot" aria-hidden="true" />
                    <div>
                      <strong>{stage.title}</strong>
                      <p>{stage.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </aside>

          <div className="status-workbench__detail">
            {application.status === "needs_more_information" ? (
              <section className="page-section page-section--alert">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Action required</p>
                    <h3 className="page-section__title">Corrections are needed before review can continue</h3>
                    <p className="page-section__description">
                      Update the flagged sections, replace any rejected documents, and resubmit the
                      application from the final review step.
                    </p>
                  </div>
                </div>

                <div className="page-actions">
                  <Link
                    to={getApplicationRoute(application.applicationType)}
                    className="btn btn--primary"
                  >
                    Open application
                  </Link>
                </div>
              </section>
            ) : null}

            <div className="detail-grid detail-grid--status">
              <section className="page-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Step tracker</p>
                    <h3 className="page-section__title">Section completion</h3>
                  </div>
                </div>

                <div className="section-tracker section-tracker--stacked">
                  {application.sections.map((section) => {
                    const sectionComments = commentsBySection[section.key] || [];

                    return (
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
                        <span className="section-tracker__health">
                          {sectionComments.length
                            ? `${sectionComments.length} open reviewer notes`
                            : "No open reviewer notes"}
                        </span>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="page-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Review controls</p>
                    <h3 className="page-section__title">Details panel</h3>
                  </div>
                </div>

                <dl className="stacked-meta">
                  <div>
                    <dt>Latest review task</dt>
                    <dd>
                      {latestTask
                        ? `${humanize(latestTask.taskType)} | ${humanize(latestTask.status)}`
                        : "No active review task"}
                    </dd>
                  </div>
                  <div>
                    <dt>Required docs accepted</dt>
                    <dd>
                      {application.documentReviewSummary.acceptedRequiredDocuments}/
                      {application.documentReviewSummary.requiredDocuments}
                    </dd>
                  </div>
                  <div>
                    <dt>Missing required docs</dt>
                    <dd>{application.documentReviewSummary.missingRequiredDocuments.length}</dd>
                  </div>
                  <div>
                    <dt>Rejected required docs</dt>
                    <dd>{application.documentReviewSummary.rejectedRequiredDocuments.length}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="page-section">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Reviewer feedback</p>
                  <h3 className="page-section__title">Comments and requests</h3>
                  <p className="page-section__description">
                    Comments are grouped by section so you can see exactly where corrections are
                    needed.
                  </p>
                </div>
              </div>

              {applicantComments.length === 0 ? (
                <div className="empty-state empty-state--compact">
                  <strong>No applicant-visible comments yet</strong>
                  <span>Reviewers have not posted any notes that require your action.</span>
                </div>
              ) : (
                <div className="comment-groups">
                  {Object.entries(commentsBySection).map(([sectionKey, comments]) => (
                    <section key={sectionKey} className="comment-group">
                      <header className="comment-group__header">
                        <strong>{sectionKey === "general" ? "General" : humanize(sectionKey)}</strong>
                        <span>{comments.length} note{comments.length === 1 ? "" : "s"}</span>
                      </header>

                      <div className="comment-thread">
                        {comments.map((comment) => (
                          <article key={comment.id} className="comment-card comment-card--structured">
                            <div className="comment-card__header">
                              <div>
                                <strong>{comment.author.fullName}</strong>
                                <span className="comment-card__meta">
                                  {formatDate(comment.updatedAt)} | {humanize(comment.commentType)}
                                </span>
                              </div>
                              <span
                                className={`status-chip${
                                  comment.isResolved ? " status-chip--brand" : " status-chip--soft"
                                }`}
                              >
                                {comment.isResolved ? "Resolved" : "Open"}
                              </span>
                            </div>
                            <p className="comment-card__message">{comment.message}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>

            <div className="detail-grid detail-grid--status">
              <section className="page-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Document review</p>
                    <h3 className="page-section__title">Document readiness</h3>
                  </div>
                </div>

                <div className="document-flags">
                  <article className="document-flag-card">
                    <strong>Missing required documents</strong>
                    {application.documentReviewSummary.missingRequiredDocuments.length ? (
                      <ul className="flag-list">
                        {application.documentReviewSummary.missingRequiredDocuments.map((item) => (
                          <li key={item.requirementCode}>
                            <span>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>None.</p>
                    )}
                  </article>

                  <article className="document-flag-card">
                    <strong>Rejected required documents</strong>
                    {application.documentReviewSummary.rejectedRequiredDocuments.length ? (
                      <ul className="flag-list">
                        {application.documentReviewSummary.rejectedRequiredDocuments.map((item) => (
                          <li key={item.requirementCode}>
                            <span>{item.label}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>None.</p>
                    )}
                  </article>
                </div>
              </section>

              <section className="page-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">History</p>
                    <h3 className="page-section__title">Workflow activity</h3>
                  </div>
                </div>

                {timelineEvents.length === 0 ? (
                  <div className="empty-state empty-state--compact">
                    <strong>No workflow history yet</strong>
                    <span>Application events will appear here as the process progresses.</span>
                  </div>
                ) : (
                  <Timeline events={timelineEvents} />
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

export default ApplicationStatusPage;
