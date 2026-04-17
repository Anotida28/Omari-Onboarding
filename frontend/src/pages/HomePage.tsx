import MerchantOnboardingForm from "../components/MerchantOnboardingForm";
import PortalSidebar from "../components/PortalSidebar";

function HomePage(): JSX.Element {
  return (
    <div className="page">
      <div className="workspace-shell">
        <PortalSidebar />

        <main className="workspace-main">
          <header className="topbar">
            <div>
              <p className="topbar__eyebrow">Merchant onboarding workspace</p>
              <h2>Applicant Setup</h2>
            </div>

            <div className="topbar__meta">
              <span className="status-chip status-chip--brand">
                Omari branded
              </span>
              <div className="profile-card">
                <div className="profile-card__avatar">OO</div>
                <div>
                  <strong>Omari Operator</strong>
                  <span>Applicant Portal</span>
                </div>
              </div>
            </div>
          </header>

          <MerchantOnboardingForm />
        </main>
      </div>
    </div>
  );
}

export default HomePage;
