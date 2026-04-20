import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";
import { useAuth } from "../context/AuthContext";
import { ApplicationDetailResponse, getActiveApplication } from "../services/api";

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: "In Progress",
    submitted: "Under Review",
    initial_review: "Under Review",
    document_check: "Under Review",
    compliance_review: "Under Review",
    needs_more_information: "Action Required",
    approved: "Approved",
    rejected: "Rejected",
    activated: "Activated",
    archived: "Archived"
  };

  return labels[status] || status;
};

const getApplicationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    merchant: "Merchant Application",
    agent: "Agent Application",
    payer: "Payer / Biller Application"
  };

  return labels[type] || type;
};

const getStatusVariant = (status: string): string => {
  if (status === "draft") {
    return "draft";
  }

  if (status === "needs_more_information") {
    return "action-required";
  }

  if (["submitted", "initial_review", "document_check", "compliance_review"].includes(status)) {
    return "in-progress";
  }

  if (status === "approved") {
    return "approved";
  }

  return "rejected";
};

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
  const nextIncompleteSection = application?.sections.find(
    (section) => section.status !== "completed"
  );
  const progressLabel = application
    ? `${completedSections} of ${application.sections.length} sections complete`
    : "No active application";

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant workspace"
      heading="Dashboard"
      description="Manage your applications, continue saved work, and keep review feedback in one place."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-icon">...</div>
          <h3>Loading your dashboard...</h3>
        </div>
      ) : application ? (
        <div className="dashboard-stack">
          <div className="dashboard-grid">
            <article className="dashboard-card dashboard-card--hero">
              <span className="dashboard-card__eyebrow">Active application</span>

              <div className="dashboard-status-row">
                <div>
                  <h2>{getApplicationTypeLabel(application.applicationType)}</h2>
                  <p>{user?.organization?.legalName}</p>
                </div>

                <div className="dashboard-badges">
                  <span
                    className={`status-badge status-badge--${getStatusVariant(application.status)}`}
                  >
                    {getStatusLabel(application.status)}
                  </span>
                  <span className="section-tracker__health">{progressLabel}</span>
                </div>
              </div>

              <div className="status-hero-meta">
                <div className="status-meta-item">
                  <div className="status-meta-label">Submitted</div>
                  <div className="status-meta-value">
                    {application.submittedAt
                      ? new Date(application.submittedAt).toLocaleDateString()
                      : "Not submitted yet"}
                  </div>
                </div>
                <div className="status-meta-item">
                  <div className="status-meta-label">Next step</div>
                  <div className="status-meta-value">
                    {application.status === "needs_more_information"
                      ? "Address reviewer feedback"
                      : nextIncompleteSection?.title || "Ready for review"}
                  </div>
                </div>
                <div className="status-meta-item">
                  <div className="status-meta-label">Current stage</div>
                  <div className="status-meta-value">{getStatusLabel(application.status)}</div>
                </div>
              </div>

              <div className="dashboard-actions">
                <button
                  className="btn btn--primary"
                  onClick={() =>
                    navigate(`/applications/wizard?type=${application.applicationType}`)
                  }
                >
                  {application.status === "needs_more_information"
                    ? "Address feedback"
                    : "Continue application"}
                </button>
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    navigate(`/applications/${application.applicationId}/status`)
                  }
                >
                  Track status
                </button>
              </div>
            </article>

            <article className="dashboard-card dashboard-card--stat">
              <span className="dashboard-card__eyebrow">Completion</span>
              <strong className="dashboard-card__value">{completedSections}</strong>
              <p>Completed sections in your current application.</p>

              <div className="dashboard-card__meta-list">
                <div className="dashboard-card__meta-item">
                  <span>Total steps</span>
                  <strong>{application.sections.length}</strong>
                </div>
                <div className="dashboard-card__meta-item">
                  <span>Outstanding</span>
                  <strong>{Math.max(application.sections.length - completedSections, 0)}</strong>
                </div>
              </div>
            </article>
          </div>

          <div className="dashboard-grid dashboard-grid--quick">
            <article className="dashboard-card dashboard-card--action">
              <span className="dashboard-card__eyebrow">Application details</span>
              <strong>Continue from your latest saved step</strong>
              <p>
                Pick up at {nextIncompleteSection?.title || "the review stage"} and keep your
                submission moving forward.
              </p>
              <button
                className="btn btn--ghost dashboard-card__link"
                onClick={() =>
                  navigate(`/applications/wizard?type=${application.applicationType}`)
                }
              >
                Open application
              </button>
            </article>

            <article className="dashboard-card dashboard-card--action">
              <span className="dashboard-card__eyebrow">Reviewer feedback</span>
              <strong>
                {application.status === "needs_more_information"
                  ? "Updates requested"
                  : "Status and history"}
              </strong>
              <p>
                Review timelines, comments, and anything your team still needs to address.
              </p>
              <button
                className="btn btn--ghost dashboard-card__link"
                onClick={() => navigate(`/applications/${application.applicationId}/status`)}
              >
                View application status
              </button>
            </article>

            <article className="dashboard-card dashboard-card--action">
              <span className="dashboard-card__eyebrow">Account</span>
              <strong>Keep your profile up to date</strong>
              <p>
                Manage your contact details, password, and organization summary in one place.
              </p>
              <button
                className="btn btn--ghost dashboard-card__link"
                onClick={() => navigate("/profile")}
              >
                Open profile
              </button>
            </article>
          </div>
        </div>
      ) : (
        <div className="dashboard-stack">
          <article className="dashboard-card dashboard-card--hero">
            <span className="dashboard-card__eyebrow">Get started</span>
            <h2>Start your first Omari onboarding application</h2>
            <p>
              Choose the type that matches your business and complete the guided wizard in one
              unified portal.
            </p>
          </article>

          <div className="dashboard-grid dashboard-grid--quick">
            <article className="dashboard-card dashboard-card--action">
              <span className="dashboard-card__eyebrow">Merchant</span>
              <strong>Accept payments with Omari</strong>
              <p>Set up business details, contacts, banking, and supporting documents.</p>
              <button
                className="btn btn--primary dashboard-card__link"
                onClick={() => navigate("/applications/wizard?type=merchant")}
              >
                Start merchant application
              </button>
            </article>

            <article className="dashboard-card dashboard-card--action">
              <span className="dashboard-card__eyebrow">Agent</span>
              <strong>Launch an agent outlet network</strong>
              <p>Capture directors, operational outlets, banking details, and agent paperwork.</p>
              <button
                className="btn btn--primary dashboard-card__link"
                onClick={() => navigate("/applications/wizard?type=agent")}
              >
                Start agent application
              </button>
            </article>

            <article className="dashboard-card dashboard-card--action">
              <span className="dashboard-card__eyebrow">Payer / Biller</span>
              <strong>Set up biller and settlement onboarding</strong>
              <p>Prepare settlement details, signatories, and supporting documents.</p>
              <button
                className="btn btn--primary dashboard-card__link"
                onClick={() => navigate("/applications/wizard?type=payer")}
              >
                Start payer application
              </button>
            </article>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

export default ApplicantDashboardPage;
