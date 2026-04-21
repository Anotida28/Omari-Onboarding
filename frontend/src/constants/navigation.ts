import { PortalNavGroup } from "../components/PortalSidebar";

export const APPLICANT_NAV_GROUPS: PortalNavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        label: "Dashboard",
        to: "/dashboard",
        end: true,
        icon: "dashboard"
      }
    ]
  },
  {
    title: "Applications",
    items: [
      {
        label: "Application Wizard",
        to: "/applications/wizard",
        icon: "application"
      },
      {
        label: "Application Status",
        to: "/applications/status",
        icon: "timeline"
      }
    ]
  },
  {
    title: "Account",
    items: [
      {
        label: "Profile",
        to: "/profile",
        icon: "profile"
      }
    ]
  }
];

export const ADMIN_NAV_GROUPS: PortalNavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        label: "Intake Monitor",
        to: "/internal/intake",
        end: true,
        icon: "dashboard"
      }
    ]
  },
  {
    title: "Applications",
    items: [
      {
        label: "Review Queue",
        to: "/internal/review",
        end: true,
        icon: "review"
      }
    ]
  },
  {
    title: "Account",
    items: [
      {
        label: "Profile",
        to: "/internal/profile",
        icon: "profile"
      }
    ]
  }
];
