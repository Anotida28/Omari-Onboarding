import PayerOnboardingForm from "../components/PayerOnboardingForm";
import PortalShell from "../components/PortalShell";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";

function PayerOnboardingPage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Payer onboarding workspace"
      heading="Biller / Payer Application"
      description="Capture billing model, settlement setup, signatories, and required documents in a guided flow before review."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      <PayerOnboardingForm />
    </PortalShell>
  );
}

export default PayerOnboardingPage;
