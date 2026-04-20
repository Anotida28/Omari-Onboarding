import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";

function RegisterPage(): JSX.Element {
  const { isAuthenticated, isLoading, register, user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={getDefaultPathForUser(user)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const fullName = `${firstName} ${lastName}`.trim();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const authenticatedUser = await register({
        fullName,
        organizationName,
        mobileNumber,
        email: email.trim() || undefined,
        password
      });

      navigate(getDefaultPathForUser(authenticatedUser), {
        replace: true
      });
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

        {error ? <p className="feedback feedback--error">{error}</p> : null}

        <form className="auth-form auth-form--minimal auth-form--signup" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name*</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Enter first name"
              autoComplete="given-name"
              required
            />
          </label>

          <label className="field">
            <span>Last Name*</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Enter last name"
              autoComplete="family-name"
              required
            />
          </label>

          <label className="field">
            <span>Email*</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Phone*</span>
            <input
              value={mobileNumber}
              onChange={(event) => setMobileNumber(event.target.value)}
              placeholder="Enter phone number"
              autoComplete="tel"
              required
            />
          </label>

          <label className="field auth-field--full">
            <span>Organization*</span>
            <input
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Enter organization name"
              autoComplete="organization"
              required
            />
          </label>

          <label className="field">
            <span>Password*</span>
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
            <span>Repeat Password*</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
          </label>

          <button
            type="submit"
            className="button button--primary auth-form__submit"
            disabled={submitting}
          >
            {submitting ? "Creating Account..." : "Create Account"}
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
