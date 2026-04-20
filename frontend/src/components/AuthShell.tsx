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
    badge: "Returning applicant or reviewer",
    headline: "Pick up your Omari onboarding journey in one secure step.",
    copy:
      "Applicants can resume merchant onboarding while internal teams move straight into review, all inside the same Omari workspace.",
    statLabel: "Live flow",
    statValue: "Merchant onboarding",
    supportLabel: "Ready next",
    supportValue: "OTP verification later",
    footer:
      "A calm, secure entry into applicant onboarding and internal review."
  },
  register: {
    badge: "Fast account creation",
    headline: "Create your Omari account and move into onboarding right away.",
    copy:
      "We keep sign-up light so your business can get straight into the merchant form, save progress, and return safely any time.",
    statLabel: "Signup fields",
    statValue: "5 quick details",
    supportLabel: "Future-ready",
    supportValue: "SMS or email OTP",
    footer:
      "Built for quick onboarding today, with verification ready when you want it."
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

          <div className="auth-visual-stage">
            <span className="auth-visual-stage__badge">{stageContent.badge}</span>

            <div className="auth-visual-stage__halo" aria-hidden="true" />
            <div className="auth-visual-stage__grid" aria-hidden="true" />

            <article className="auth-floating-card auth-floating-card--top">
              <p className="auth-floating-card__eyebrow">{stageContent.statLabel}</p>
              <strong>{stageContent.statValue}</strong>
              <span>Applicant and internal review access share the same Omari portal.</span>
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
              <span>Mobile-first account identity keeps the sign-in flow simple.</span>
            </article>
          </div>

          <div className="auth-panel__highlights">
            <article className="auth-panel__highlight auth-panel__highlight--wide">
              <p className="auth-floating-card__eyebrow">Omari workspace</p>
              <strong>{stageContent.headline}</strong>
              <span>{stageContent.copy}</span>
            </article>
          </div>

          <p className="auth-panel__footer">{stageContent.footer}</p>
        </section>

        <section className="auth-card">{children}</section>
      </div>
    </div>
  );
}

export default AuthShell;
