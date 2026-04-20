import { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  variant?: "login" | "register";
  children: ReactNode;
}

const AUTH_STAGE_CONTENT = {
  login: {
    badge: "Returning users",
    statLabel: "Live flow",
    statValue: "Unified onboarding",
    supportLabel: "Secure access",
    supportValue: "Mobile or email sign-in"
  },
  register: {
    badge: "Create account",
    headline: "Start your Omari onboarding in a calm, guided setup.",
    copy:
      "We keep sign-up light so applicants can enter once, save progress, and return to the same branded experience later.",
    statLabel: "Signup fields",
    statValue: "5 quick details",
    supportLabel: "Future-ready",
    supportValue: "SMS or email OTP",
    footer:
      "Built for fast onboarding today, with verification ready when you need it."
  }
} as const;

function AuthShell({
  eyebrow,
  title,
  description,
  variant = "login",
  children
}: AuthShellProps): JSX.Element {
  const stageContent = AUTH_STAGE_CONTENT[variant];

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-panel">
          <div className="auth-panel__brand">
            <div className="auth-panel__brand-mark">
              <img src="/omari-logo.png" alt="Omari logo" />
            </div>

            <div>
              <p className="sidebar__eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
            </div>
          </div>

          <p className="auth-panel__copy">{description}</p>

          <div className="auth-panel__badge-row">
            <span className="auth-pill">Applicant login</span>
            <span className="auth-pill">Admin review access</span>
          </div>

          <div className="auth-visual-stage">
            <span className="auth-visual-stage__badge">{stageContent.badge}</span>

            <div className="auth-visual-stage__halo" aria-hidden="true" />
            <div className="auth-visual-stage__grid" aria-hidden="true" />

            <article className="auth-floating-card auth-floating-card--top">
              <p className="auth-floating-card__eyebrow">{stageContent.statLabel}</p>
              <strong>{stageContent.statValue}</strong>
              <span>Applicant and internal review access share one branded portal.</span>
            </article>

            <div className="auth-device-card">
              <img
                src="/omari-auth-hero.png"
                alt="Omari branded payment cards"
                className="auth-device-card__image"
              />
            </div>

            <article className="auth-floating-card auth-floating-card--bottom">
              <p className="auth-floating-card__eyebrow">{stageContent.supportLabel}</p>
              <strong>{stageContent.supportValue}</strong>
              <span>Mobile-first identity keeps the sign-in flow simple.</span>
            </article>
          </div>

          {"headline" in stageContent && "copy" in stageContent ? (
            <div className="auth-panel__highlights">
              <article className="auth-panel__highlight auth-panel__highlight--wide">
                <p className="auth-floating-card__eyebrow">Omari workspace</p>
                <strong>{stageContent.headline}</strong>
                <span>{stageContent.copy}</span>
              </article>
            </div>
          ) : null}

          {"footer" in stageContent ? (
            <p className="auth-panel__footer">{stageContent.footer}</p>
          ) : null}
        </section>

        <section className="auth-card">{children}</section>
      </div>
    </div>
  );
}

export default AuthShell;
