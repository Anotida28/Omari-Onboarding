import AgentOnboardingForm from "../components/AgentOnboardingForm";
import PortalShell from "../components/PortalShell";
import { APPLICANT_NAV_GROUPS } from "../constants/navigation";

function AgentOnboardingPage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Onboarding System"
      eyebrow="Agent onboarding workspace"
      heading="Domestic Remittances Agent Application"
      description="Complete agent business details, contacts, outlets, and required documents through a guided step-by-step flow before review."
      navGroups={APPLICANT_NAV_GROUPS}
    >
      <AgentOnboardingForm />
    </PortalShell>
  );
}

export default AgentOnboardingPage;
