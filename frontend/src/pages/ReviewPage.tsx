import InternalReviewWorkspace from "../components/InternalReviewWorkspace";
import PortalShell from "../components/PortalShell";
import { ADMIN_NAV_GROUPS } from "../constants/navigation";

function ReviewPage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Review System"
      eyebrow="Internal review workspace"
      heading="Application Review Operations"
      description="Review submissions end-to-end, assess document readiness, and complete approval decisions with clear audit context."
      navGroups={ADMIN_NAV_GROUPS}
    >
      <InternalReviewWorkspace />
    </PortalShell>
  );
}

export default ReviewPage;
