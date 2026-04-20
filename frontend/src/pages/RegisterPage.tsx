import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";

function RegisterPage(): JSX.Element {
  const { isAuthenticated, isLoading, register, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
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
    <AuthShell
      eyebrow="Create account"
      title="Create Your Omari Applicant Account"
      description="Set up your account in a minute, then continue directly into onboarding. Mobile number is required and email is optional."
      variant="register"
    >
      <div className="auth-card__header">
        <p className="panel-header__eyebrow">New applicant</p>
        <h2>Create your account</h2>
        <p className="auth-card__copy">
          Once this is complete, you will be taken straight to your applicant
          dashboard so you can start or resume an application.
        </p>
      </div>

      {error ? <p className="feedback feedback--error">{error}</p> : null}

      <form className="auth-form" onSubmit={handleSubmit}>
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
          <span>Organization Name</span>
          <input
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Enter business or organization name"
            autoComplete="organization"
          />
        </label>

        <label className="field">
          <span>Mobile Number</span>
          <input
            value={mobileNumber}
            onChange={(event) => setMobileNumber(event.target.value)}
            placeholder="Enter mobile number"
            autoComplete="tel"
          />
        </label>

        <label className="field">
          <span>Email Address (Optional)</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter email if you want email updates later"
            autoComplete="email"
          />
        </label>

        <label className="field field--wide">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className="button button--primary auth-form__submit" disabled={submitting}>
          {submitting ? "Creating Your Account..." : "Create Account And Continue"}
        </button>
      </form>

      <p className="auth-card__footer">
        Already have an account? <Link to="/auth/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}

export default RegisterPage;
