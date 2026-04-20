import MerchantOnboardingForm from "../components/MerchantOnboardingForm";
import PortalShell from "../components/PortalShell";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";

function MerchantOnboardingPage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Merchant onboarding workspace"
      heading="Merchant Application"
      description="Capture merchant information in a guided flow, save drafts safely, and submit when each section is complete."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      <MerchantOnboardingForm />
    </PortalShell>
  );
}

export default MerchantOnboardingPage;
