import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PortalSidebar, { PortalNavGroup } from "./PortalSidebar";

interface PortalShellProps {
  title: string;
  eyebrow: string;
  heading: string;
  description: string;
  navGroups: PortalNavGroup[];
  children: ReactNode;
}

function PortalShell({
  title,
  eyebrow,
  heading,
  description,
  navGroups,
  children
}: PortalShellProps): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return <></>;
  }

  const profileMeta =
    user.role === "admin"
      ? user.email || "Internal reviewer"
      : user.organization?.legalName || user.mobileNumber;

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/auth/login", {
        replace: true
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="page">
      <div className="workspace-shell">
        <PortalSidebar
          groups={navGroups}
          currentUserName={user.fullName}
          currentUserMeta={profileMeta}
          onLogout={() => void handleLogout()}
          isLoggingOut={isLoggingOut}
        />

        <main className="workspace-main">
          <header className="topbar">
            <div className="topbar__copy">
              <p className="topbar__eyebrow">{eyebrow}</p>
              <strong className="topbar__title">{title}</strong>
            </div>

            <div className="topbar__meta">
              <div className="topbar__profile">
                <span className="topbar__profile-label">
                  {user.role === "admin" ? "Internal reviewer" : "Applicant account"}
                </span>
                <strong className="topbar__user-name">{user.fullName}</strong>
                <span className="topbar__user-meta">{profileMeta}</span>
              </div>
            </div>
          </header>

          <div className="workspace-content">
            <section className="workspace-intro">
              <p className="workspace-intro__eyebrow">{eyebrow}</p>
              <h1>{heading}</h1>
              <p>{description}</p>
            </section>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PortalShell;
