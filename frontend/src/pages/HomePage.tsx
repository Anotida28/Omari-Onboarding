import { useState } from "react";
import InternalReviewWorkspace from "../components/InternalReviewWorkspace";
import MerchantOnboardingForm from "../components/MerchantOnboardingForm";
import PortalSidebar from "../components/PortalSidebar";

type PortalView = "applicant" | "review";

function HomePage(): JSX.Element {
  const [activeView, setActiveView] = useState<PortalView>("applicant");

  const isApplicantView = activeView === "applicant";

  return (
    <div className="page">
      <div className="workspace-shell">
        <PortalSidebar
          activeView={activeView}
          onSelectView={setActiveView}
        />

        <main className="workspace-main">
          <header className="topbar">
            <strong className="topbar__title">
              {isApplicantView ? "Omari - Onboarding System" : "Omari - Review System"}
            </strong>

            <div className="topbar__meta">
              <div className="profile-card">
                <div className="profile-card__avatar">
                  {isApplicantView ? "AP" : "RV"}
                </div>
                <div>
                  <strong>{isApplicantView ? "Applicant Workspace" : "Review Manager"}</strong>
                  <span>
                    {isApplicantView ? "Merchant onboarding" : "Internal review"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <div className="workspace-content">
            <section className="workspace-intro">
              <p className="workspace-intro__eyebrow">
                {isApplicantView ? "Merchant onboarding workspace" : "Internal review workspace"}
              </p>
              <h1>{isApplicantView ? "Applicant Setup" : "Review Operations"}</h1>
              <p>
                {isApplicantView
                  ? "Capture merchant information in a guided flow, save drafts safely, and submit when each section is complete."
                  : "Evaluate submissions with complete context, review document readiness, and process decision actions with confidence."}
              </p>
            </section>

            {isApplicantView ? (
              <MerchantOnboardingForm />
            ) : (
              <InternalReviewWorkspace />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default HomePage;
