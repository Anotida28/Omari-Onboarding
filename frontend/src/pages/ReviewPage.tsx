import InternalReviewWorkspace from "../components/InternalReviewWorkspace";
import PortalShell from "../components/PortalShell";
import { ADMIN_NAV_GROUPS } from "../constants/navigation";

function ReviewPage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Review System"
      eyebrow="Internal review"
      heading="Review Queue"
      description="Assess submitted applications, clear document checks, and record approval decisions with full audit context."
      navGroups={ADMIN_NAV_GROUPS}
    >
      <InternalReviewWorkspace />
    </PortalShell>
  );
}

export default ReviewPage;
