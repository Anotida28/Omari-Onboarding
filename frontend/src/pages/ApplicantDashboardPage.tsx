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

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant workspace"
      heading="Dashboard"
      description="Manage your applications and track their progress through our review process."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {isLoading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <h3>Loading your dashboard...</h3>
        </div>
      ) : application ? (
        <div style={{ display: "grid", gap: "var(--space-6)" }}>
          {/* Current Application Status */}
          <div className="status-hero">
            <div style={{ display: "grid", gap: "var(--space-2)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-3)"
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 var(--space-2) 0" }}>
                    {getApplicationTypeLabel(application.applicationType)}
                  </h2>
                  <p style={{ margin: 0, color: "var(--text-700)" }}>
                    {user?.organization?.legalName}
                  </p>
                </div>
                <span
                  className={`status-badge status-badge--${
                    application.status === "draft"
                      ? "draft"
                      : application.status === "needs_more_information"
                        ? "action-required"
                        : ["submitted", "initial_review", "document_check", "compliance_review"].includes(
                            application.status
                          )
                          ? "in-progress"
                          : application.status === "approved"
                            ? "approved"
                            : "rejected"
                  }`}
                >
                  {getStatusLabel(application.status)}
                </span>
              </div>
            </div>

            <div className="status-hero-meta">
              <div className="status-meta-item">
                <div className="status-meta-label">Last Updated</div>
                <div className="status-meta-value">
                  {application.submittedAt
                    ? new Date(application.submittedAt).toLocaleDateString()
                    : "Draft"}
                </div>
              </div>
              <div className="status-meta-item">
                <div className="status-meta-label">Progress</div>
                <div className="status-meta-value">
                  {application.sections.filter((s) => s.status === "completed").length} of{" "}
                  {application.sections.length} sections
                </div>
              </div>
            </div>
          </div>

          {/* Continue Application CTA */}
          {application.status === "draft" && (
            <div
              style={{
                padding: "var(--space-5)",
                background: "rgba(36, 191, 117, 0.08)",
                border: "1px solid rgba(36, 191, 117, 0.3)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--space-4)"
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 var(--space-1) 0", color: "var(--text-900)" }}>
                  Continue your application
                </h3>
                <p style={{ margin: 0, color: "var(--text-700)" }}>
                  You're on step{" "}
                  {
                    application.sections.find((s) => s.status !== "completed")
                      ?.sortOrder
                  }{" "}
                  of {application.sections.length}. Pick up where you left off.
                </p>
              </div>
              <button
                className="btn btn--primary"
                onClick={() =>
                  navigate(
                    `/applications/wizard?type=${application.applicationType}`
                  )
                }
              >
                Continue →
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "var(--space-4)"
            }}
          >
            <div
              className="form-section-card"
              style={{ cursor: "pointer" }}
              onClick={() =>
                navigate(`/applications/wizard?type=${application.applicationType}`)
              }
            >
              <div className="form-section-card__title">Edit Application</div>
              <p style={{ margin: "var(--space-2) 0 0 0", color: "var(--text-700)" }}>
                Update your application details and progress through remaining sections.
              </p>
            </div>

            <div
              className="form-section-card"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/applications/${application.applicationId}/status`)}
            >
              <div className="form-section-card__title">View Status</div>
              <p style={{ margin: "var(--space-2) 0 0 0", color: "var(--text-700)" }}>
                Track your application progress and reviewer feedback.
              </p>
            </div>

            <div
              className="form-section-card"
              style={{ cursor: "pointer" }}
              onClick={() => navigate("/profile")}
            >
              <div className="form-section-card__title">Account Settings</div>
              <p style={{ margin: "var(--space-2) 0 0 0", color: "var(--text-700)" }}>
                Update your personal information and preferences.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No active application</h3>
          <p>Start a new merchant, agent, or payer / biller application to get started.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-3)", maxWidth: "500px" }}>
            <button
              className="btn btn--primary"
              onClick={() => navigate("/applications/wizard?type=merchant")}
            >
              Merchant
            </button>
            <button
              className="btn btn--primary"
              onClick={() => navigate("/applications/wizard?type=agent")}
            >
              Agent
            </button>
            <button
              className="btn btn--primary"
              onClick={() => navigate("/applications/wizard?type=payer")}
            >
              Payer
            </button>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

export default ApplicantDashboardPage;
