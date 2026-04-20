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
        label: "Continue Application",
        to: "/applications/wizard"
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
        label: "Review Queue",
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
