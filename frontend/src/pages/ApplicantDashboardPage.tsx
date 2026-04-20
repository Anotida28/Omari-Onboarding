import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

const getApplicationLabel = (applicationType: string): string => {
  if (applicationType === "agent") {
    return "Agent Application";
  }

  if (applicationType === "payer") {
    return "Payer / Biller Application";
  }

  return "Merchant Application";
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

function ApplicantDashboardPage(): JSX.Element {
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(
    null
  );
  const [loadingApplication, setLoadingApplication] = useState(true);
  const [applicationError, setApplicationError] = useState("");

  useEffect(() => {
    const loadDraft = async (): Promise<void> => {
      try {
        const response = await getActiveApplication();
        setApplication(response);
        setApplicationError("");
      } catch (caughtError) {
        setApplication(null);
        setApplicationError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load your saved application."
        );
      } finally {
        setLoadingApplication(false);
      }
    };

    void loadDraft();
  }, []);

  const completedSections = useMemo(
    () =>
      application?.sections.filter((section) => section.status === "completed")
        .length || 0,
    [application]
  );

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Applicant workspace"
      heading="Your Onboarding Dashboard"
      description="Resume where you left off, see what still needs attention, and move to the right form with clear next actions."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      {applicationError ? (
        <p className="feedback feedback--error">{applicationError}</p>
      ) : null}

      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card--hero">
          <span className="dashboard-card__eyebrow">Organization</span>
          <h2>{user?.organization?.legalName || "Your organization"}</h2>
          <p>
            {user?.organization?.entityType
              ? humanize(user.organization.entityType)
              : "Onboarding applicant"}
          </p>

          <div className="dashboard-actions">
            {application ? (
              <Link
                to={getApplicationRoute(application.applicationType)}
                className="button button--primary button-link"
              >
                Resume {getApplicationLabel(application.applicationType)}
              </Link>
            ) : (
              <>
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
              </>
            )}
            {application ? (
              <Link
                to={`/applications/${application.applicationId}/status`}
                className="button button--ghost button-link"
              >
                Track Application Status
              </Link>
            ) : null}
          </div>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card__eyebrow">Account Contact</span>
          <strong>{user?.mobileNumber || "-"}</strong>
          <p>{user?.email || "No email added yet"}</p>
          <div className="dashboard-badges">
            <span className="status-chip status-chip--soft">
              Mobile {user?.mobileVerified ? "Verified" : "Pending"}
            </span>
            <span className="status-chip">
              Email {user?.emailVerified ? "Verified" : "Pending"}
            </span>
          </div>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card__eyebrow">Saved Application</span>
          {loadingApplication ? (
            <>
              <strong>Checking draft...</strong>
              <p>We are checking if you already have an active onboarding application.</p>
            </>
          ) : application ? (
            <>
              <strong>{humanize(application.status)}</strong>
              <p>
                {completedSections}/{application.sections.length} sections completed.
              </p>
              <span className="dashboard-card__meta">
                Current step: {humanize(application.currentStep || "business_snapshot")}
              </span>
            </>
          ) : (
            <>
              <strong>No saved draft yet</strong>
              <p>
                Start a merchant, agent, or payer / biller application to begin
                and we will save progress section by section.
              </p>
            </>
          )}
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card__eyebrow">Recommended Next Step</span>
          <strong>
            {application
              ? application.status === "needs_more_information"
                ? "Update requested sections"
                : "Continue your draft"
              : "Begin onboarding"}
          </strong>
          <p>
            {application
              ? `Open the ${getApplicationLabel(application.applicationType).toLowerCase()} form to continue editing, upload missing files, or resubmit after review feedback.`
              : "We'll save your progress section by section once you begin any onboarding flow."}
          </p>
          {application ? (
            <div className="dashboard-actions">
              <Link
                to={
                  application.status === "needs_more_information"
                    ? `/applications/${application.applicationId}/status`
                    : getApplicationRoute(application.applicationType)
                }
                className="button button--ghost button-link"
              >
                {application.status === "needs_more_information"
                  ? "Review Requested Changes"
                  : "Open Application Form"}
              </Link>
            </div>
          ) : null}
        </article>
      </div>
    </PortalShell>
  );
}

export default ApplicantDashboardPage;
