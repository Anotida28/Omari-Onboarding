import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import RouteRedirect from "../components/RouteRedirect";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";
import {
  buildPortalUrl,
  getCurrentPortal,
  redirectWithNavigate
} from "../utils/portal";

interface LoginPageProps {
  mode?: "applicant" | "internal";
}

function LoginPage({ mode = "applicant" }: LoginPageProps): JSX.Element {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const locationState = location.state as { from?: unknown } | null;
  const requestedPath =
    typeof locationState?.from === "string" ? locationState.from : null;
  const isInternalMode = mode === "internal";
  const currentPortal = getCurrentPortal();
  const roleMatchesMode =
    user &&
    ((isInternalMode && user.role === "admin") ||
      (!isInternalMode && user.role === "applicant"));

  if (!isLoading && isAuthenticated && roleMatchesMode) {
    return <RouteRedirect to={getDefaultPathForUser(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const authenticatedUser = await login({
        identifier,
        password
      });

      const fallbackPath = getDefaultPathForUser(authenticatedUser);
      const nextPath =
        requestedPath &&
        (isInternalMode
          ? requestedPath.startsWith("/internal")
          : !requestedPath.startsWith("/internal"))
          ? requestedPath
          : fallbackPath;

      redirectWithNavigate(navigate, nextPath, true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in right now."
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

      <section className="auth-minimal-card" aria-label="Sign in">
        <div className="auth-minimal-card__brand">
          <img src="/omari-logo.png" alt="Omari logo" />
        </div>

        <div className="auth-minimal-card__header">
          <h1>{isInternalMode ? "Internal access" : "Welcome back"}</h1>
        </div>

        {!isLoading && isAuthenticated && user && !roleMatchesMode ? (
          <p className="feedback feedback--warning">
            {currentPortal === "internal"
              ? "An applicant session is already active in this browser. Sign in here with an internal Omari account to switch into the internal portal."
              : "An internal staff session is already active in this browser. Sign in here with an applicant account to continue in the applicant portal."}
          </p>
        ) : null}

        {error ? <p className="feedback feedback--error">{error}</p> : null}

        <form className="auth-form auth-form--minimal" onSubmit={handleSubmit}>
          <label className="field">
            <span>Mobile number or email</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter your mobile number or email"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="button button--primary auth-form__submit"
            disabled={submitting}
          >
            {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {isInternalMode ? (
          <p className="auth-card__footer auth-card__footer--minimal">
            Applicant account?{" "}
            <a href={buildPortalUrl("applicant", "/auth/login")}>
              Use applicant sign in
            </a>
          </p>
        ) : (
          <p className="auth-card__footer auth-card__footer--minimal">
            New here? <Link to="/auth/register">Create an account</Link>
          </p>
        )}
      </section>
    </div>
  );
}

export default LoginPage;
