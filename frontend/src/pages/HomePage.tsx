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
            <div>
              <p className="topbar__eyebrow">
                {isApplicantView
                  ? "Merchant onboarding workspace"
                  : "Internal review workspace"}
              </p>
              <h2>{isApplicantView ? "Applicant Setup" : "Review Queue"}</h2>
            </div>

            <div className="topbar__meta">
              <span className="status-chip status-chip--brand">
                Omari branded
              </span>
              <div className="profile-card">
                <div className="profile-card__avatar">
                  {isApplicantView ? "AP" : "RV"}
                </div>
                <div>
                  <strong>
                    {isApplicantView ? "Applicant Workspace" : "Review Manager"}
                  </strong>
                  <span>
                    {isApplicantView ? "Applicant Portal" : "Internal Review"}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {isApplicantView ? (
            <MerchantOnboardingForm />
          ) : (
            <InternalReviewWorkspace />
          )}
        </main>
      </div>
    </div>
  );
}

export default HomePage;
