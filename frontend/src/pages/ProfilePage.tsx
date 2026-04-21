import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PortalShell from "../components/PortalShell";
import { ADMIN_NAV_GROUPS, APPLICANT_NAV_GROUPS } from "../constants/navigation";
import { useAuth } from "../context/AuthContext";
import { ApplicationDetailResponse, getActiveApplication } from "../services/api";

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

const getApplicationRoute = (applicationType: string): string =>
  `/applications/wizard?type=${applicationType}`;

function ProfilePage(): JSX.Element {
  const { user, updateProfile, changePassword } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [mobileNumber, setMobileNumber] = useState(user?.mobileNumber || "");
  const [email, setEmail] = useState(user?.email || "");
  const [organizationName, setOrganizationName] = useState(
    user?.organization?.legalName || ""
  );
  const [tradingName, setTradingName] = useState(user?.organization?.tradingName || "");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [application, setApplication] = useState<ApplicationDetailResponse | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(user?.role === "applicant");
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

  const navGroups = user?.role === "admin" ? ADMIN_NAV_GROUPS : APPLICANT_NAV_GROUPS;
  const isDirectoryManagedInternal = Boolean(
    user && user.role === "admin" && !user.canEditProfile
  );
  const canManagePasswordLocally = Boolean(user?.canChangePassword);

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

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!user.canEditProfile) {
      setProfileError(
        "This internal identity is managed through the Omari access gateways and cannot be edited here."
      );
      setProfileSuccess("");
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      await updateProfile({
        fullName,
        mobileNumber,
        email: email.trim() || null,
        organizationName: user.role === "applicant" ? organizationName : undefined,
        tradingName: user.role === "applicant" ? tradingName.trim() || null : undefined
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

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!user.canChangePassword) {
      setPasswordError(
        "Password changes for this internal account are handled by the enterprise directory."
      );
      return;
    }

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
      description="Maintain account identity, organization details, and security settings tied to your onboarding workspace."
      navGroups={navGroups}
    >
      <div className="profile-shell">
        <section className="page-section page-section--dense">
          <div className="page-section__header">
            <div>
              <p className="page-section__eyebrow">Account overview</p>
              <h2 className="page-section__title">{user.fullName}</h2>
              <p className="page-section__description">
                {user.role === "admin"
                  ? user.username || user.email || "Internal reviewer account"
                  : user.organization?.legalName || "Applicant workspace"}
              </p>
            </div>

            <div className="page-section__meta">
              <span className="status-badge status-badge--info">{humanize(user.role)}</span>
              <span className="status-chip status-chip--soft">{humanize(user.status)}</span>
            </div>
          </div>
        </section>

        {applicationError ? <p className="feedback feedback--error">{applicationError}</p> : null}

        <div className="profile-layout">
          <div className="profile-main">
            <section className="page-section profile-section">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Section 1</p>
                  <h3 className="page-section__title">Identity</h3>
                  <p className="page-section__description">
                    {isDirectoryManagedInternal
                      ? "This internal identity is synced from the enterprise access gateways. Review the details here, but update them in the source directory."
                      : "Keep the account name, mobile number, and email aligned with the person responsible for this onboarding workspace."}
                  </p>
                </div>
              </div>

              {profileError ? <p className="feedback feedback--error">{profileError}</p> : null}
              {profileSuccess ? <p className="feedback feedback--success">{profileSuccess}</p> : null}

              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <div className="form-grid">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Enter your full name"
                      autoComplete="name"
                      disabled={isDirectoryManagedInternal}
                    />
                  </label>

                  <label className="field">
                    <span>{user.role === "admin" ? "Work mobile" : "Mobile number"}</span>
                    <input
                      value={mobileNumber}
                      onChange={(event) => setMobileNumber(event.target.value)}
                      placeholder={
                        user.role === "admin"
                          ? "Enter your work mobile number"
                          : "Enter your mobile number"
                      }
                      autoComplete="tel"
                      disabled={isDirectoryManagedInternal}
                    />
                  </label>

                  <label className="field field--wide">
                    <span>Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      disabled={isDirectoryManagedInternal}
                    />
                  </label>
                </div>

                {user.canEditProfile ? (
                  <div className="page-actions">
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving..." : "Save identity changes"}
                    </button>
                  </div>
                ) : null}
              </form>
            </section>

            {user.role === "applicant" ? (
              <section className="page-section profile-section">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Section 2</p>
                    <h3 className="page-section__title">Organization</h3>
                    <p className="page-section__description">
                      Maintain the company record attached to this applicant account. This summary
                      is separate from the operational details inside each application.
                    </p>
                  </div>
                </div>

                <form className="profile-form" onSubmit={handleProfileSubmit}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Organization name</span>
                      <input
                        value={organizationName}
                        onChange={(event) => setOrganizationName(event.target.value)}
                        placeholder="Enter organization name"
                        autoComplete="organization"
                      />
                    </label>

                    <label className="field">
                      <span>Trading name</span>
                      <input
                        value={tradingName}
                        onChange={(event) => setTradingName(event.target.value)}
                        placeholder="Enter trading name if applicable"
                      />
                    </label>
                  </div>

                  <div className="page-actions">
                    <button
                      type="submit"
                      className="btn btn--secondary"
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving..." : "Update organization"}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}

            <section className="page-section profile-section">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">Section 3</p>
                  <h3 className="page-section__title">Security</h3>
                  <p className="page-section__description">
                    {canManagePasswordLocally
                      ? "Update your password and review verification readiness for this account."
                      : "This internal account signs in through enterprise gateways, so password and credential lifecycle are handled outside this workspace."}
                  </p>
                </div>
              </div>

              {passwordError ? <p className="feedback feedback--error">{passwordError}</p> : null}
              {passwordSuccess ? <p className="feedback feedback--success">{passwordSuccess}</p> : null}

              {canManagePasswordLocally ? (
                <form className="profile-form" onSubmit={handlePasswordSubmit}>
                  <div className="form-grid">
                    <label className="field field--wide">
                      <span>Current password</span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                      />
                    </label>

                    <label className="field">
                      <span>New password</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Enter a new password"
                        autoComplete="new-password"
                      />
                    </label>

                    <label className="field">
                      <span>Confirm new password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <div className="page-actions">
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={changingPassword}
                    >
                      {changingPassword ? "Updating..." : "Change password"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="empty-state empty-state--compact">
                  <strong>Directory-managed sign in</strong>
                  <span>
                    Your username, password, and internal access approval are controlled by the
                    upstream Omari gateways.
                  </span>
                </div>
              )}
            </section>
          </div>

          <aside className="profile-aside">
            <section className="page-section page-section--dense">
              <div className="page-section__header">
                <div>
                  <p className="page-section__eyebrow">
                    {user.role === "admin" ? "Access" : "Verification"}
                  </p>
                  <h3 className="page-section__title">
                    {user.role === "admin" ? "Identity source" : "Contact readiness"}
                  </h3>
                </div>
              </div>

              <dl className="stacked-meta stacked-meta--compact">
                {user.role === "admin" ? (
                  <>
                    <div>
                      <dt>Username</dt>
                      <dd>{user.username || "-"}</dd>
                    </div>
                    <div>
                      <dt>Auth source</dt>
                      <dd>{humanize(user.authSource)}</dd>
                    </div>
                    <div>
                      <dt>Password control</dt>
                      <dd>
                        {canManagePasswordLocally
                          ? "Managed in Omari"
                          : "Managed by enterprise directory"}
                      </dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt>Mobile</dt>
                      <dd>{user.mobileVerified ? "Verified" : "Pending verification"}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{user.emailVerified ? "Verified" : "Pending verification"}</dd>
                    </div>
                  </>
                )}
              </dl>
            </section>

            {user.role === "applicant" ? (
              <section className="page-section page-section--dense">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Application</p>
                    <h3 className="page-section__title">Active workflow</h3>
                  </div>
                </div>

                {loadingApplication ? (
                  <div className="empty-state empty-state--compact">
                    <strong>Checking application...</strong>
                    <span>Loading current workflow data.</span>
                  </div>
                ) : application && applicationSummary ? (
                  <>
                    <dl className="stacked-meta stacked-meta--compact">
                      <div>
                        <dt>Status</dt>
                        <dd>{humanize(application.status)}</dd>
                      </div>
                      <div>
                        <dt>Sections complete</dt>
                        <dd>
                          {applicationSummary.completedSections}/{application.sections.length}
                        </dd>
                      </div>
                      <div>
                        <dt>Open reviewer notes</dt>
                        <dd>{applicationSummary.unresolvedComments}</dd>
                      </div>
                      <div>
                        <dt>Last submitted</dt>
                        <dd>{formatDate(application.submittedAt)}</dd>
                      </div>
                    </dl>

                    <div className="page-actions page-actions--stacked">
                      <Link
                        to={getApplicationRoute(application.applicationType)}
                        className="btn btn--primary"
                      >
                        Continue application
                      </Link>
                      <Link
                        to={`/applications/${application.applicationId}/status`}
                        className="btn btn--secondary"
                      >
                        View status
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="empty-state empty-state--compact">
                    <strong>No active application</strong>
                    <span>Start a workflow from the dashboard when you are ready.</span>
                  </div>
                )}
              </section>
            ) : (
              <section className="page-section page-section--dense">
                <div className="page-section__header">
                  <div>
                    <p className="page-section__eyebrow">Workspace</p>
                    <h3 className="page-section__title">Internal operations</h3>
                  </div>
                </div>

                <div className="page-actions page-actions--stacked">
                  <Link to="/internal/intake" className="btn btn--primary">
                    Open intake monitor
                  </Link>
                  <Link to="/internal/review" className="btn btn--secondary">
                    Open review queue
                  </Link>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </PortalShell>
  );
}

export default ProfilePage;
