type PortalView = "applicant" | "review";

interface PortalSidebarProps {
  activeView: PortalView;
  onSelectView: (view: PortalView) => void;
}

const buildNavGroups = (activeView: PortalView) => [
  {
    title: "Workspace",
    items: [
      {
        label: "Applicant Setup",
        view: "applicant" as const,
        active: activeView === "applicant"
      },
      {
        label: "Internal Review",
        view: "review" as const,
        active: activeView === "review"
      }
    ]
  },
  {
    title: "Workflow",
    items: [
      {
        label: activeView === "applicant" ? "Merchant Onboarding" : "Review Queue",
        view: activeView,
        active: true
      },
      {
        label:
          activeView === "applicant" ? "Supporting Documents" : "Decision Actions",
        view: activeView,
        active: false
      }
    ]
  },
  {
    title: "Settings",
    items: [{ label: "Support", view: activeView, active: false }]
  }
];

function PortalSidebar({
  activeView,
  onSelectView
}: PortalSidebarProps): JSX.Element {
  const navGroups = buildNavGroups(activeView);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">
          <img src="/omari-logo.png" alt="Omari logo" />
        </div>
        <div>
          <p className="sidebar__eyebrow">OMDS Platform</p>
          <h1>Omari Onboarding</h1>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Primary">
        {navGroups.map((group) => (
          <section key={group.title} className="sidebar__group">
            <p className="sidebar__group-title">{group.title}</p>
            <ul className="sidebar__list">
              {group.items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className={`sidebar__item${
                      item.active ? " sidebar__item--active" : ""
                    }`}
                    onClick={() => onSelectView(item.view)}
                  >
                    <span className="sidebar__icon" aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}

export default PortalSidebar;
