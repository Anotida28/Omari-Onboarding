import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";
import { useAuth } from "../context/AuthContext";
import { ApplicationDetailResponse, getActiveApplication } from "../services/api";

const humanize = (value: string): string =>
  value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

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

const getApplicationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    merchant: "Merchant Application",
    agent: "Agent Application",
    payer: "Payer / Biller Application"
  };

  return labels[type] || humanize(type);
};

const getEntryRows = () => [
  {
    key: "merchant",
    title: "Merchant onboarding",
    description: "For businesses accepting Omari payments and merchant settlement.",
    icon: "M"
  },
  {
    key: "agent",
    title: "Agent onboarding",
    description: "For agent networks, branches, authorized transactors, and float operations.",
    icon: "A"
  },
  {
    key: "payer",
    title: "Payer / biller onboarding",
    description: "For billers and bulk payment organizations integrating into the platform.",
    icon: "P"
  }
] as const;

function ApplicantDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadApplication = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const response = await getActiveApplication();
        setApplication(response);
      } catch {
        setApplication(null);
      } finally {
        setIsLoading(false);
      }
    };

    void loadApplication();
  }, []);

  const completedSections =
    application?.sections.filter((section) => section.status === "completed").length || 0;
  const progressPercent = application
    ? Math.round((completedSections / Math.max(application.sections.length, 1)) * 100)
    : 0;

  const nextIncompleteSection = application?.sections.find(
    (section) => section.status !== "completed"
  );

  const recentActivity = useMemo(() => {
    if (!application) {
      return [];
    }

    return [...application.statusHistory]
      .sort((left, right) => {
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })
      .slice(0, 4);
  }, [application]);

  const recentMessages = useMemo(() => {
    if (!application) {
      return [];
    }

    return [...application.comments]
      .filter((comment) => comment.visibility === "applicant")
      .sort((left, right) => {
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      })
      .slice(0, 4);
  }, [application]);

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant workspace"
      heading="Dashboard"
      description="Monitor application progress, continue the workflow, and respond to reviewer requests from one operational workspace."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-icon">...</div>
          <h3>Loading your dashboard...</h3>
        </div>
      ) : application ? (
        <div className="dashboard-enterprise">
          <section className="page-section page-section--dense">
            <div className="page-section__header">
              <div>
                <p className="page-section__eyebrow">Application status overview</p>
                <h2 className="page-section__title">
                  {getApplicationTypeLabel(application.applicationType)}
                </h2>
                <p className="page-section__description">
                  {application.organization.legalName}
                </p>
              </div>

              <div className="page-section__meta">
                <span className={`status-badge status-badge--${getStatusVariant(application.status)}`}>
                  {getStatusLabel(application.status)}
                </span>
                <dl className="inline-meta">
                  <div>
                    <dt>Current step</dt>
                    <dd>{nextIncompleteSection?.title || "Review complete"}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>
                      {application.submittedAt
                        ? new Date(application.submittedAt).toLocaleDateString()
                        : "Not submitted yet"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <div className="dashboard-primary-grid">
            <section className="page-section dashboard-primary-card">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Continue application</p>
                  <h3 className="page-section__title">Keep the workflow moving</h3>
                  <p className="page-section__description">
                    Complete the remaining onboarding steps and return to the review screen when
                    the file is ready to submit.
                  </p>
                </div>
              </div>

              <div className="progress-block">
                <div className="progress-block__header">
                  <strong>{progressPercent}% complete</strong>
                  <span>
                    {completedSections} of {application.sections.length} sections finished
                  </span>
                </div>
                <div className="progress-track" aria-hidden="true">
                  <div
                    className="progress-track__fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <dl className="stacked-meta">
                <div>
                  <dt>Next action</dt>
                  <dd>
                    {application.status === "needs_more_information"
                      ? "Address reviewer comments and resubmit"
                      : nextIncompleteSection?.title || "Move into final review"}
                  </dd>
                </div>
                <div>
                  <dt>Required documents accepted</dt>
                  <dd>
                    {application.documentReviewSummary.acceptedRequiredDocuments}/
                    {application.documentReviewSummary.requiredDocuments}
                  </dd>
                </div>
              </dl>

              <div className="page-actions">
                <button
                  className="btn btn--primary"
                  onClick={() =>
                    navigate(`/applications/wizard?type=${application.applicationType}`)
                  }
                >
                  Continue application
                </button>
              </div>
            </section>

            <section className="page-section dashboard-summary-card">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Working summary</p>
                  <h3 className="page-section__title">Key items requiring attention</h3>
                </div>
              </div>

              <div className="summary-metrics">
                <article className="summary-metric">
                  <span>Open reviewer notes</span>
                  <strong>{recentMessages.filter((comment) => !comment.isResolved).length}</strong>
                </article>
                <article className="summary-metric">
                  <span>Missing required documents</span>
                  <strong>{application.documentReviewSummary.missingRequiredDocuments.length}</strong>
                </article>
                <article className="summary-metric">
                  <span>Rejected required documents</span>
                  <strong>{application.documentReviewSummary.rejectedRequiredDocuments.length}</strong>
                </article>
              </div>

              <div className="page-actions">
                <button
                  className="btn btn--secondary"
                  onClick={() => navigate(`/applications/${application.applicationId}/status`)}
                >
                  View full status
                </button>
              </div>
            </section>
          </div>

          <div className="dashboard-secondary-grid">
            <section className="page-section">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Recent activity</p>
                  <h3 className="page-section__title">Latest workflow events</h3>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="empty-state empty-state--compact">
                  <strong>No activity recorded yet</strong>
                  <span>Status updates will appear here once the workflow progresses.</span>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map((item) => (
                    <article key={item.id} className="activity-item">
                      <div className="activity-item__header">
                        <strong>{humanize(item.toStatus)}</strong>
                        <span>
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p>{item.reason || "Status updated in the onboarding workflow."}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="page-section">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Messages / reviewer feedback</p>
                  <h3 className="page-section__title">Latest notes from review</h3>
                </div>
              </div>

              {recentMessages.length === 0 ? (
                <div className="empty-state empty-state--compact">
                  <strong>No reviewer feedback yet</strong>
                  <span>Once review begins, comments and action requests will appear here.</span>
                </div>
              ) : (
                <div className="message-list">
                  {recentMessages.map((comment) => (
                    <article key={comment.id} className="message-item">
                      <div className="message-item__header">
                        <strong>{comment.sectionKey ? humanize(comment.sectionKey) : "General"}</strong>
                        <span className={`status-chip${comment.isResolved ? " status-chip--brand" : ""}`}>
                          {comment.isResolved ? "Resolved" : "Open"}
                        </span>
                      </div>
                      <p>{comment.message}</p>
                      <span className="message-item__meta">
                        {comment.author.fullName} |{" "}
                        {new Date(comment.updatedAt).toLocaleDateString()}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="dashboard-enterprise">
          <section className="page-section page-section--dense">
            <div className="page-section__header">
              <div>
                <p className="page-section__eyebrow">Applications</p>
                <h2 className="page-section__title">Choose an onboarding track</h2>
                <p className="page-section__description">
                  Start the business workflow that matches your onboarding requirement.
                </p>
              </div>
            </div>

            <div className="application-entry-list">
              {getEntryRows().map((entry) => (
                <article key={entry.key} className="application-entry">
                  <span className="application-entry__icon" aria-hidden="true">
                    {entry.icon}
                  </span>
                  <div className="application-entry__copy">
                    <strong>{entry.title}</strong>
                    <p>{entry.description}</p>
                  </div>
                  <button
                    className="btn btn--secondary"
                    onClick={() => navigate(`/applications/wizard?type=${entry.key}`)}
                  >
                    Start
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </PortalShell>
  );
}

export default ApplicantDashboardPage;
