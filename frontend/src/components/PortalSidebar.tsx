import { NavLink } from "react-router-dom";

export interface PortalNavItem {
  label: string;
  to: string;
  end?: boolean;
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

        <div>
          <p className="sidebar__eyebrow">Omari</p>
          <h1>Onboarding</h1>
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
                    <span className="sidebar__icon" aria-hidden="true" />
                    <span>{item.label}</span>
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
