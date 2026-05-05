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
  const { isAuthenticated, isLoading, login, loginInternal, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const authenticatedUser = isInternalMode
        ? await loginInternal({
            username,
            password
          })
        : await login({
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
          <h1>{isInternalMode ? "Internal sign in" : "Welcome back"}</h1>
          {isInternalMode ? (
            <p>
              Sign in with your Active Directory username and password. Password
              changes stay on the Active Directory side.
            </p>
          ) : null}
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
          {isInternalMode ? (
            <label className="field">
              <span>AD username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your AD username"
                autoComplete="username"
              />
            </label>
          ) : (
            <label className="field">
              <span>Mobile number or email</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Enter your mobile number or email"
                autoComplete="username"
              />
            </label>
          )}

          <label className="field">
            <span>Password</span>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
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
