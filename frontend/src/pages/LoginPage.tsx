import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";

function LoginPage(): JSX.Element {
  const { isAuthenticated, isLoading, login, user } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={getDefaultPathForUser(user)} replace />;
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

      navigate(getDefaultPathForUser(authenticatedUser), {
        replace: true
      });
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
          <h1>Welcome back</h1>
        </div>

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

        <p className="auth-card__footer auth-card__footer--minimal">
          New here? <Link to="/auth/register">Create an account</Link>
        </p>
      </section>
    </div>
  );
}

export default LoginPage;
