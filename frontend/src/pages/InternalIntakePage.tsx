import InternalIntakeWorkspace from "../components/InternalIntakeWorkspace";
import PortalShell from "../components/PortalShell";
import { ADMIN_NAV_GROUPS } from "../constants/navigation";

function InternalIntakePage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Internal Intake"
      eyebrow="Internal operations"
      heading="Intake Monitor"
      description="Monitor newly started onboarding files, assess readiness before submission, and route clean applications into review."
      navGroups={ADMIN_NAV_GROUPS}
    >
      <InternalIntakeWorkspace />
    </PortalShell>
  );
}

export default InternalIntakePage;
