const navGroups = [
  {
    title: "Main",
    items: [
      { label: "Dashboard" },
      { label: "Merchant Onboarding", active: true },
      { label: "Document Rules" }
    ]
  },
  {
    title: "Workflow",
    items: [
      { label: "Applications" },
      { label: "Reviews" },
      { label: "Approvals" }
    ]
  },
  {
    title: "Settings",
    items: [{ label: "Profile" }, { label: "Support" }]
  }
];

function PortalSidebar(): JSX.Element {
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
