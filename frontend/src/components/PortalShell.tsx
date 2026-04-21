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
