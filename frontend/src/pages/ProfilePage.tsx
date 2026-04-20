import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import {
  ADMIN_NAV_GROUPS,
  APPLICANT_NAV_GROUPS
} from "../constants/navigation";
import { useAuth } from "../context/AuthContext";
import {
  ApplicationDetailResponse,
  getActiveApplication
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

const getApplicationRoute = (applicationType: string): string => {
  if (applicationType === "agent") {
    return "/applications/agent";
  }

  if (applicationType === "payer") {
    return "/applications/payer";
  }

  return "/applications/merchant";
};

const getApplicationLabel = (applicationType: string): string => {
  if (applicationType === "agent") {
    return "Agent";
  }

  if (applicationType === "payer") {
    return "Payer / Biller";
  }

  return "Merchant";
};

function ProfilePage(): JSX.Element {
  const { user, updateProfile, changePassword } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || "");
  const [email, setEmail] = useState(user?.email || "");
  const [organizationName, setOrganizationName] = useState(
    user?.organization?.legalName || ""
  );
  const [tradingName, setTradingName] = useState(
    user?.organization?.tradingName || ""
  );
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(
    null
  );
  const [loadingApplication, setLoadingApplication] = useState(
    user?.role === "applicant"
  );
  const [applicationError, setApplicationError] = useState("");

  useEffect(() => {
    setFullName(user?.fullName || "");
    setMobileNumber(user?.mobileNumber || "");
    setEmail(user?.email || "");
    setOrganizationName(user?.organization?.legalName || "");
    setTradingName(user?.organization?.tradingName || "");
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "applicant") {
      setApplication(null);
      setLoadingApplication(false);
      setApplicationError("");
      return;
    }

    let isMounted = true;

    const loadApplication = async (): Promise<void> => {
      setLoadingApplication(true);

      try {
        const response = await getActiveApplication();

        if (isMounted) {
          setApplication(response);
          setApplicationError("");
        }
      } catch (caughtError) {
        if (isMounted) {
          setApplication(null);
          setApplicationError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load your active application."
          );
        }
      } finally {
        if (isMounted) {
          setLoadingApplication(false);
        }
      }
    };

    void loadApplication();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const navGroups =
    user?.role === "admin" ? ADMIN_NAV_GROUPS : APPLICANT_NAV_GROUPS;

  const applicationSummary = useMemo(() => {
    if (!application) {
      return null;
    }

    return {
      completedSections: application.sections.filter(
        (section) => section.status === "completed"
      ).length,
      unresolvedComments: application.comments.filter(
        (comment) => !comment.isResolved && comment.visibility === "applicant"
      ).length
    };
  }, [application]);

  if (!user) {
    return <></>;
  }

  const handleProfileSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      await updateProfile({
        fullName,
        mobileNumber,
        email: email.trim() || null,
        organizationName: user.role === "applicant" ? organizationName : undefined,
        tradingName:
          user.role === "applicant" ? tradingName.trim() || null : undefined
      });

      setProfileSuccess("Your account details have been updated.");
    } catch (caughtError) {
      setProfileError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update your profile right now."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword({
        currentPassword,
        newPassword
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        "Your password was updated. Other active sessions have been signed out."
      );
    } catch (caughtError) {
      setPasswordError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to change your password right now."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Account management"
      heading="Profile"
      description="Manage your contact details, keep your password up to date, and check the account information tied to your Omari workspace."
      navGroups={navGroups}
    >
      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card--hero">
          <span className="dashboard-card__eyebrow">Account</span>
          <h2>{user.fullName}</h2>
          <p>
            {user.role === "admin"
              ? "Internal review access"
              : user.organization?.legalName || "Applicant workspace"}
          </p>
          <div className="dashboard-badges">
            <span className="status-chip status-chip--brand">
              {humanize(user.role)}
            </span>
            <span className="status-chip status-chip--soft">
              {humanize(user.status)}
            </span>
          </div>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card__eyebrow">Verification</span>
          <strong>
            {user.mobileVerified || user.emailVerified ? "Partially ready" : "Pending"}
          </strong>
          <p>Verification tooling will plug into this page later with SMS and email OTPs.</p>
          <div className="dashboard-badges">
            <span className="status-chip status-chip--soft">
              Mobile {user.mobileVerified ? "Verified" : "Pending"}
            </span>
            <span className="status-chip">
              Email {user.emailVerified ? "Verified" : "Pending"}
            </span>
          </div>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card__eyebrow">
            {user.role === "admin" ? "Workspace Access" : "Application Access"}
          </span>
          {user.role === "admin" ? (
            <>
              <strong>Application Queue</strong>
              <p>Open the internal review workspace and continue processing submitted applications.</p>
              <div className="dashboard-actions">
                <Link to="/review" className="button button--ghost button-link">
                  Open Application Queue
                </Link>
              </div>
            </>
          ) : loadingApplication ? (
            <>
              <strong>Checking application...</strong>
              <p>Loading your current application status and next available actions.</p>
            </>
          ) : application ? (
            <>
              <strong>{humanize(application.status)}</strong>
              <p>
                {applicationSummary?.completedSections}/{application.sections.length} sections complete.
              </p>
              <span className="dashboard-card__meta">
                {applicationSummary?.unresolvedComments || 0} reviewer notes open
              </span>
              <div className="dashboard-actions">
                <Link
                  to={`/applications/${application.applicationId}/status`}
                  className="button button--ghost button-link"
                >
                  Open Status Page
                </Link>
              </div>
            </>
          ) : (
            <>
              <strong>No active application</strong>
              <p>
                Start a new merchant, agent, or payer / biller application
                whenever you are ready to continue onboarding.
              </p>
              <div className="dashboard-actions">
                <Link
                  to="/applications/merchant"
                  className="button button--ghost button-link"
                >
                  Start Merchant Application
                </Link>
                <Link
                  to="/applications/agent"
                  className="button button--ghost button-link"
                >
                  Start Agent Application
                </Link>
                <Link
                  to="/applications/payer"
                  className="button button--ghost button-link"
                >
                  Start Payer / Biller
                </Link>
              </div>
            </>
          )}
        </article>
      </div>

      {applicationError ? (
        <p className="feedback feedback--error">{applicationError}</p>
      ) : null}

      <div className="review-grid review-grid--detail">
        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Personal Details</h3>
              <p>
                Keep your login and contact information current. If you change a
                mobile number or email, verification will be required later when
                OTP support is enabled.
              </p>
            </div>
          </div>

          {profileError ? <p className="feedback feedback--error">{profileError}</p> : null}
          {profileSuccess ? (
            <p className="feedback feedback--success">{profileSuccess}</p>
          ) : null}

          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <div className="form-grid">
              <label className="field">
                <span>Full Name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </label>

              <label className="field">
                <span>Mobile Number</span>
                <input
                  value={mobileNumber}
                  onChange={(event) => setMobileNumber(event.target.value)}
                  placeholder="Enter your mobile number"
                  autoComplete="tel"
                />
              </label>

              <label className="field field--wide">
                <span>Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
              </label>

              {user.role === "applicant" ? (
                <>
                  <label className="field">
                    <span>Organization Name</span>
                    <input
                      value={organizationName}
                      onChange={(event) => setOrganizationName(event.target.value)}
                      placeholder="Enter organization name"
                      autoComplete="organization"
                    />
                  </label>

                  <label className="field">
                    <span>Trading Name</span>
                    <input
                      value={tradingName}
                      onChange={(event) => setTradingName(event.target.value)}
                      placeholder="Enter trading name if you use one"
                    />
                  </label>
                </>
              ) : null}
            </div>

            <div className="dashboard-actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving..." : "Save Profile Changes"}
              </button>
            </div>
          </form>
        </section>

        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Security</h3>
              <p>
                Change your password here. Once updated, any other signed-in
                sessions tied to this account will be closed.
              </p>
            </div>
          </div>

          {passwordError ? <p className="feedback feedback--error">{passwordError}</p> : null}
          {passwordSuccess ? (
            <p className="feedback feedback--success">{passwordSuccess}</p>
          ) : null}

          <form className="profile-form" onSubmit={handlePasswordSubmit}>
            <div className="form-grid">
              <label className="field field--wide">
                <span>Current Password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
              </label>

              <label className="field">
                <span>New Password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                />
              </label>

              <label className="field">
                <span>Confirm New Password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <div className="dashboard-actions">
              <button
                type="submit"
                className="button button--primary"
                disabled={changingPassword}
              >
                {changingPassword ? "Updating..." : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="review-grid">
        {user.role === "applicant" ? (
          <section className="form-section">
            <div className="form-section__header">
              <div>
                <h3>Organization Summary</h3>
                <p>
                  This is the organization currently tied to your applicant
                  account and onboarding flow.
                </p>
              </div>
            </div>

            <div className="detail-list">
              <div>
                <dt>Legal name</dt>
                <dd>{user.organization?.legalName || "-"}</dd>
              </div>
              <div>
                <dt>Trading name</dt>
                <dd>{user.organization?.tradingName || "-"}</dd>
              </div>
              <div>
                <dt>Entity type</dt>
                <dd>{humanize(user.organization?.entityType || "applicant")}</dd>
              </div>
              <div>
                <dt>Account contact</dt>
                <dd>{user.email || user.mobileNumber}</dd>
              </div>
            </div>
          </section>
        ) : (
          <section className="form-section">
            <div className="form-section__header">
              <div>
                <h3>Review Workspace</h3>
                <p>
                  Your account is set up for internal review. Use these quick
                  links to return to operational work.
                </p>
              </div>
            </div>

            <div className="dashboard-actions">
              <Link to="/review" className="button button--primary button-link">
                Open Application Queue
              </Link>
            </div>
          </section>
        )}

        <section className="form-section">
          <div className="form-section__header">
            <div>
              <h3>Quick Access</h3>
              <p>
                Jump back to the most important place in the workflow without
                leaving your account page first.
              </p>
            </div>
          </div>

          {user.role === "admin" ? (
            <div className="detail-list detail-list--compact">
              <div>
                <dt>Primary route</dt>
                <dd>/review</dd>
              </div>
              <div>
                <dt>Account email</dt>
                <dd>{user.email || "-"}</dd>
              </div>
              <div>
                <dt>Mobile contact</dt>
                <dd>{user.mobileNumber}</dd>
              </div>
            </div>
          ) : application ? (
            <>
              <div className="detail-list detail-list--compact">
                <div>
                  <dt>Status</dt>
                  <dd>{humanize(application.status)}</dd>
                </div>
                <div>
                  <dt>Application type</dt>
                  <dd>{getApplicationLabel(application.applicationType)}</dd>
                </div>
                <div>
                  <dt>Current step</dt>
                  <dd>{humanize(application.currentStep || "business_snapshot")}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(application.submittedAt)}</dd>
                </div>
              </div>

              <div className="dashboard-actions">
                <Link
                  to={getApplicationRoute(application.applicationType)}
                  className="button button--primary button-link"
                >
                  Continue Application
                </Link>
                <Link
                  to={`/applications/${application.applicationId}/status`}
                  className="button button--ghost button-link"
                >
                  View Status
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>No active application</strong>
              <span>
                Once you start an application, quick status and resume
                links will appear here automatically.
              </span>
            </div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}

export default ProfilePage;
