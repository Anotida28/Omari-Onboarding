import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCurrentPortalLoginPath, redirectWithNavigate } from "../utils/portal";
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

  useEffect(() => {
    document.title = title;
  }, [title]);

  if (!user) {
    return <></>;
  }

  const profileMeta =
    user.role === "admin"
      ? user.username || user.email || "Internal reviewer"
      : user.organization?.legalName || user.mobileNumber || "Applicant workspace";

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    const nextPath = getCurrentPortalLoginPath();

    try {
      await logout();
      redirectWithNavigate(navigate, nextPath, true);
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
