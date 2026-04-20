import { NavLink } from "react-router-dom";

export type PortalNavIcon =
  | "dashboard"
  | "application"
  | "timeline"
  | "review"
  | "profile";

export interface PortalNavItem {
  label: string;
  to: string;
  end?: boolean;
  icon?: PortalNavIcon;
}

export interface PortalNavGroup {
  title: string;
  items: PortalNavItem[];
}

interface PortalSidebarProps {
  groups: PortalNavGroup[];
  currentUserName: string;
  currentUserMeta: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}

const SidebarGlyph = ({ icon = "application" }: { icon?: PortalNavIcon }): JSX.Element => {
  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="6" height="6" rx="1.5" />
          <rect x="11" y="3" width="6" height="4" rx="1.5" />
          <rect x="3" y="11" width="6" height="6" rx="1.5" />
          <rect x="11" y="9" width="6" height="8" rx="1.5" />
        </svg>
      );
    case "timeline":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 4v12M10 7v9M15 10v6" />
          <circle cx="5" cy="4" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="10" cy="7" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "review":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 4.5h12v8H9l-3.5 3v-3H4z" />
          <path d="M7 7.5h6M7 10h4" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="6.2" r="2.7" />
          <path d="M4.5 15.8c1.1-2.5 3-3.8 5.5-3.8s4.4 1.3 5.5 3.8" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 4.5h10M5 8.5h10M5 12.5h10M5 16.5h6" />
        </svg>
      );
  }
};

function PortalSidebar({
  groups,
  currentUserName,
  currentUserMeta,
  onLogout,
  isLoggingOut
}: PortalSidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <img src="/omari-logo.png" alt="Omari logo" />
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        {groups.map((group) => (
          <section key={group.title} className="sidebar__group">
            <p className="sidebar__group-title">{group.title}</p>
            <ul className="sidebar__list">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `sidebar__item${isActive ? " sidebar__item--active" : ""}`
                    }
                  >
                    <span className="sidebar__icon" aria-hidden="true">
                      <SidebarGlyph icon={item.icon} />
                    </span>
                    <span className="sidebar__label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="sidebar__account">
        <p>Signed in as</p>
        <strong>{currentUserName}</strong>
        <span className="sidebar__account-meta">{currentUserMeta}</span>

        <button
          type="button"
          className="sidebar__action"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>
    </aside>
  );
}

export default PortalSidebar;
