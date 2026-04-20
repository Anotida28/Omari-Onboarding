import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDefaultPathForUser } from "../utils/auth";

function HomePage(): JSX.Element {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="route-loader">
        <div className="route-loader__card">
          <img src="/omari-logo.png" alt="Omari logo" />
          <strong>Preparing Omari Onboarding...</strong>
          <span>Your workspace is loading.</span>
        </div>
      </div>
    );
  }

  return <Navigate to={getDefaultPathForUser(user)} replace />;
}

export default HomePage;
