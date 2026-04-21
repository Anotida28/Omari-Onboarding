import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RouteRedirect from "../components/RouteRedirect";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";
import { getCurrentPortal, redirectWithNavigate } from "../utils/portal";

function RegisterPage(): JSX.Element {
  const { isAuthenticated, isLoading, register, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const currentPortal = getCurrentPortal();
  const roleMatchesPortal = user && user.role === "applicant";

  if (!isLoading && isAuthenticated && roleMatchesPortal) {
    return <RouteRedirect to={getDefaultPathForUser(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const authenticatedUser = await register({
        fullName: fullName.trim(),
        organizationName: organizationName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim() || undefined,
        password
      });

      redirectWithNavigate(
        navigate,
        getDefaultPathForUser(authenticatedUser),
        true
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the account right now."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page auth-page--minimal">
      <img
        className="auth-page__bg-art"
        src="/omari-auth-hero.png"
        alt=""
        aria-hidden="true"
      />
      <div className="auth-page__veil" aria-hidden="true" />

      <section className="auth-minimal-card auth-minimal-card--signup" aria-label="Create account">
        <div className="auth-minimal-card__brand">
          <img src="/omari-logo.png" alt="Omari logo" />
        </div>

        <div className="auth-minimal-card__header">
          <h1>Create your account</h1>
        </div>

        {!isLoading && isAuthenticated && user && !roleMatchesPortal ? (
          <p className="feedback feedback--warning">
            {currentPortal === "applicant"
              ? "An internal staff session is already active in this browser. Creating an applicant account here will switch this browser into the applicant portal."
              : "An internal portal session is active in this browser."}
          </p>
        ) : null}

        {error ? <p className="feedback feedback--error">{error}</p> : null}

        <form className="auth-form auth-form--minimal auth-form--signup" onSubmit={handleSubmit}>
          <label className="field auth-field--full">
            <span>Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </label>

          <label className="field auth-field--full">
            <span>Organization name</span>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Enter your organization name"
              autoComplete="organization"
              required
            />
          </label>

          <label className="field">
            <span>Mobile number</span>
            <input
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              placeholder="Enter your mobile number"
              autoComplete="tel"
              required
            />
          </label>

          <label className="field">
            <span>Email (optional)</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
            />
          </label>

          <button
            type="submit"
            className="button button--primary auth-form__submit"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-card__footer auth-card__footer--minimal">
          Already have an account? <Link to="/auth/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}

export default RegisterPage;
