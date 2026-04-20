import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getInitials } from "../utils/auth";
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
            <strong className="topbar__title">{title}</strong>

            <div className="topbar__meta">
              <div className="profile-card">
                <div className="profile-card__avatar">
                  {getInitials(user.fullName)}
                </div>
                <div>
                  <strong>{user.fullName}</strong>
                  <span>
                    {user.role === "admin"
                      ? "Internal review workspace"
                      : user.organization?.legalName || "Applicant workspace"}
                  </span>
                </div>
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
