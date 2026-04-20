import { PortalNavGroup } from "../components/PortalSidebar";

export const APPLICANT_NAV_GROUPS: PortalNavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        end: true
      },
      {
        label: "Merchant Application",
        to: "/applications/merchant"
      },
      {
        label: "Agent Application",
        to: "/applications/agent"
      },
      {
        label: "Payer / Biller Application",
        to: "/applications/payer"
      },
      {
        label: "Application Status",
        to: "/applications/status"
      },
      {
        label: "Profile",
        to: "/profile"
      }
    ]
  }
];

export const ADMIN_NAV_GROUPS: PortalNavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        label: "Application Queue",
        to: "/review",
        end: true
      },
      {
        label: "Profile",
        to: "/profile"
      }
    ]
  }
];
