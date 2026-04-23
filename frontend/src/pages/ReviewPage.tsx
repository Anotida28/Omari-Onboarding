import InternalReviewWorkspace from "../components/InternalReviewWorkspace";
import PortalShell from "../components/PortalShell";
import { ADMIN_NAV_GROUPS } from "../constants/navigation";

function ReviewPage(): JSX.Element {
  return (
    <PortalShell
      title="Omari - Review Queue"
      eyebrow="Internal operations"
      heading="Review Queue"
      description="Review submitted applications, verify documents, manage review tasks, and make approval decisions."
      navGroups={ADMIN_NAV_GROUPS}
    >
      <InternalReviewWorkspace />
    </PortalShell>
  );
}

export default ReviewPage;
