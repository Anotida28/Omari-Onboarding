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

const getApplicationLabel = (applicationType: string): string => {
  if (applicationType === "agent") {
    return "agent";
  }

  if (applicationType === "payer") {
    return "payer / biller";
  }

  return "merchant";
};

const getApplicationRoute = (applicationType: string): string => {
  if (applicationType === "agent") {
    return "/applications/agent";
  }

  if (applicationType === "payer") {
    return "/applications/payer";
  }

  return "/applications/merchant";
};

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

function ApplicationStatusPage(): JSX.Element {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(
    null
  );
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

  const unresolvedComments = useMemo(
    () => application?.comments.filter((comment) => !comment.isResolved) || [],
    [application]
  );

  const unresolvedBySection = useMemo(
    () => groupCommentsBySection(unresolvedComments),
    [unresolvedComments]
  );

  const statusSummary = useMemo(() => {
    if (!application) {
      return null;
    }

    const completedSections = application.sections.filter(
      (section) => section.status === "completed"
    ).length;

    return {
      completedSections,
      unresolvedApplicantComments: unresolvedComments.filter(
        (comment) => comment.visibility === "applicant"
      ).length,
      documentIssues:
        application.documentReviewSummary.missingRequiredDocuments.length +
        application.documentReviewSummary.rejectedRequiredDocuments.length,
      latestTask:
        application.reviewTasks.find(
          (task) => task.status !== "completed" && task.status !== "cancelled"
        ) || application.reviewTasks[0] || null
    };
  }, [application, unresolvedComments]);

  const nextActionCopy = useMemo(() => {
    if (!application) {
      return {
        title: "No active application",
        description:
          "Start a merchant, agent, or payer / biller application to see live status, review feedback, and resubmission guidance here."
      };
    }

    const label = getApplicationLabel(application.applicationType);

    if (application.status === "needs_more_information") {
      return {
        title: "Update the requested sections and resubmit",
        description:
          `Open the ${label} form, resolve reviewer notes, and resubmit from the review step once corrections are complete.`
      };
    }

    if (application.status === "submitted") {
      return {
        title: "Waiting for internal review",
        description:
          `Your ${label} application is with the Omari review team. You can monitor progress and respond here if corrections are requested.`
      };
    }

    if (application.status === "approved") {
      return {
        title: "Application approved",
        description:
          `The ${label} onboarding request has been approved. Keep this page as your status history reference.`
      };
    }

    if (application.status === "rejected") {
      return {
        title: "Application closed",
        description:
          `This ${label} application has been rejected. Review the recorded notes here before creating a new application.`
      };
    }

    return {
      title: "Continue your application",
      description:
        `You still have an active ${label} application in progress. Use the form to finish missing sections and submit when ready.`
    };
  }, [application]);

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant workspace"
      heading="Application Status And Next Actions"
      description="Track your live status, understand reviewer feedback, and follow a clear checklist for what to do next."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {error ? <p className="feedback feedback--error">{error}</p> : null}

      {loadingApplication ? (
        <div className="empty-state">
          <strong>Loading your application status...</strong>
          <span>Preparing the latest status, comments, and timeline.</span>
        </div>
      ) : null}

      {!loadingApplication && !application ? (
        <div className="dashboard-grid">
          <article className="dashboard-card dashboard-card--hero">
            <span className="dashboard-card__eyebrow">Status</span>
            <h2>No active application</h2>
            <p>
              Start your onboarding flow and this page will track review
              progress, returned notes, and resubmission guidance for you.
            </p>

            <div className="dashboard-actions">
              <Link
                to="/applications/merchant"
                className="button button--primary button-link"
              >
                Start New Merchant Application
              </Link>
              <Link
                to="/applications/agent"
                className="button button--ghost button-link"
              >
                Start New Agent Application
              </Link>
              <Link
                to="/applications/payer"
                className="button button--ghost button-link"
              >
                Start New Payer / Biller Application
              </Link>
            </div>
          </article>
        </div>
      ) : null}

      {!loadingApplication && application && statusSummary ? (
        <>
          <div className="dashboard-grid">
            <article className="dashboard-card dashboard-card--hero">
              <span className="dashboard-card__eyebrow">Current Status</span>
              <h2>{humanize(application.status)}</h2>
              <p>{nextActionCopy.description}</p>

              <div className="dashboard-actions">
                <Link
                  to={getApplicationRoute(application.applicationType)}
                  className="button button--primary button-link"
                >
                  {application.status === "needs_more_information"
                    ? "Open Correction Form"
                    : application.status === "submitted"
                      ? "Open Application Form"
                      : "Resume Application Form"}
                </Link>
              </div>
            </article>

            <article className="dashboard-card">
              <span className="dashboard-card__eyebrow">Application Progress</span>
              <strong>
                {statusSummary.completedSections}/{application.sections.length} sections
              </strong>
              <p>Current step: {humanize(application.currentStep || "business_snapshot")}</p>
              <span className="dashboard-card__meta">
                Submitted: {formatDate(application.submittedAt)}
              </span>
            </article>

            <article className="dashboard-card">
              <span className="dashboard-card__eyebrow">Open Reviewer Notes</span>
              <strong>{statusSummary.unresolvedApplicantComments}</strong>
              <p>Applicant-visible comments still waiting for correction or confirmation.</p>
            </article>

            <article className="dashboard-card">
              <span className="dashboard-card__eyebrow">Document Issues</span>
              <strong>{statusSummary.documentIssues}</strong>
              <p>Required document groups that are still missing or rejected.</p>
            </article>
          </div>

          {application.status === "needs_more_information" ? (
            <div className="feedback feedback--warning">
              <strong>{nextActionCopy.title}</strong>
              <div>
                Open the {getApplicationLabel(application.applicationType)} form, apply the requested fixes, and use the
                review step to resubmit once all corrections are complete.
              </div>
            </div>
          ) : null}

          <div className="review-grid">
            <section className="form-section">
              <div className="form-section__header">
                <div>
                  <h3>Section Status</h3>
                  <p>
                    See which parts of the current application flow are complete and where
                    reviewer notes are still open.
                  </p>
                </div>
              </div>

              <div className="section-tracker">
                {application.sections.map((section) => {
                  const unresolvedForSection =
                    unresolvedBySection[section.key]?.filter(
                      (comment) => comment.visibility === "applicant"
                    ) || [];

                  return (
                    <article key={section.key} className="section-tracker__item">
                      <div className="section-tracker__item-top">
                        <div>
                          <strong>{section.title}</strong>
                          <p>Last updated: {formatDate(section.lastEditedAt)}</p>
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

                      {unresolvedForSection.length > 0 ? (
                        <span className="section-tracker__health">
                          {unresolvedForSection.length} open{" "}
                          {unresolvedForSection.length === 1 ? "comment" : "comments"}
                        </span>
                      ) : (
                        <span className="section-tracker__health">No open notes</span>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="form-section">
              <div className="form-section__header">
                <div>
                  <h3>Action Checklist</h3>
                  <p>
                    Use this as your checklist for what to do before the
                    application can move forward.
                  </p>
                </div>
              </div>

              <div className="comment-summary-inline">
                <strong>{nextActionCopy.title}</strong>
                <span>{nextActionCopy.description}</span>
              </div>

              <div className="detail-list detail-list--compact">
                <div>
                  <dt>Latest review task</dt>
                  <dd>
                    {statusSummary.latestTask
                      ? `${humanize(statusSummary.latestTask.taskType)} | ${humanize(
                          statusSummary.latestTask.status
                        )}`
                      : "No active task"}
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
                  <dt>Open applicant comments</dt>
                  <dd>{statusSummary.unresolvedApplicantComments}</dd>
                </div>
              </div>
            </section>
          </div>

          <section className="form-section">
            <div className="form-section__header">
              <div>
                <h3>Reviewer Feedback</h3>
                <p>
                  These are the applicant-visible notes that explain what needs
                  to be updated before resubmission.
                </p>
              </div>
              <span className="status-chip status-chip--soft">
                {application.comments.length} comments
              </span>
            </div>

            {application.comments.length === 0 ? (
              <div className="empty-state">
                <strong>No reviewer comments yet</strong>
                <span>
                  If the Omari review team needs anything from you, their notes
                  will appear here.
                </span>
              </div>
            ) : (
              <div className="comment-thread">
                {application.comments.map((comment) => (
                  <article key={comment.id} className="comment-card">
                    <div className="comment-card__header">
                      <div>
                        <strong>{comment.author.fullName}</strong>
                        <span className="comment-card__meta">
                          {comment.sectionKey
                            ? humanize(comment.sectionKey)
                            : "General application note"}{" "}
                          | {humanize(comment.commentType)} |{" "}
                          {formatDate(comment.createdAt)}
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
            )}
          </section>

          <div className="review-grid">
            <section className="form-section">
              <div className="form-section__header">
                <div>
                  <h3>Status Timeline</h3>
                  <p>
                    Follow how the application moved through submission, review,
                    and any returns for correction.
                  </p>
                </div>
              </div>

              <Timeline
                events={application.statusHistory.map((item): TimelineEvent => ({
                  id: item.id,
                  title: `${humanize(item.fromStatus || "new")} to ${humanize(item.toStatus)}`,
                  description: item.reason || "No reason recorded.",
                  timestamp: formatDate(item.createdAt),
                  isCompleted: true,
                  isActive: false
                }))}
              />
            </section>

            <section className="form-section">
              <div className="form-section__header">
                <div>
                  <h3>Document Readiness</h3>
                  <p>
                    Keep an eye on required document groups that still need work
                    before the application can pass review.
                  </p>
                </div>
              </div>

              <div className="document-summary-grid">
                <article className="review-card">
                  <h4>Missing Required Documents</h4>
                  {application.documentReviewSummary.missingRequiredDocuments.length ? (
                    <ul className="flag-list">
                      {application.documentReviewSummary.missingRequiredDocuments.map(
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
                      <span>Every required document type has at least one upload.</span>
                    </div>
                  )}
                </article>

                <article className="review-card">
                  <h4>Rejected Required Documents</h4>
                  {application.documentReviewSummary.rejectedRequiredDocuments.length ? (
                    <ul className="flag-list">
                      {application.documentReviewSummary.rejectedRequiredDocuments.map(
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
                      <span>There are no rejected required documents right now.</span>
                    </div>
                  )}
                </article>
              </div>
            </section>
          </div>
        </>
      ) : null}
    </PortalShell>
  );
}

export default ApplicationStatusPage;
