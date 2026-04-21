import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ApplicantPortalOnly, InternalPortalOnly } from "./components/PortalHostRoute";
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import ApplicantDashboardPage from "./pages/ApplicantDashboardPage";
import ApplicationStatusPage from "./pages/ApplicationStatusPage";
import HomePage from "./pages/HomePage";
import InternalIntakePage from "./pages/InternalIntakePage";
import LoginPage from "./pages/LoginPage";
import OnboardingWizardPage from "./pages/OnboardingWizardPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ReviewPage from "./pages/ReviewPage";

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route element={<ApplicantPortalOnly />}>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute allowedRole="applicant" />}>
                <Route path="/dashboard" element={<ApplicantDashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/applications/wizard" element={<OnboardingWizardPage />} />
                <Route
                  path="/applications/agent"
                  element={<Navigate to="/applications/wizard?type=agent" replace />}
                />
                <Route
                  path="/applications/merchant"
                  element={<Navigate to="/applications/wizard?type=merchant" replace />}
                />
                <Route
                  path="/applications/payer"
                  element={<Navigate to="/applications/wizard?type=payer" replace />}
                />
                <Route path="/applications/status" element={<ApplicationStatusPage />} />
                <Route
                  path="/applications/:applicationId/status"
                  element={<ApplicationStatusPage />}
                />
                <Route
                  path="/applications/new/merchant"
                  element={<Navigate to="/applications/wizard?type=merchant" replace />}
                />
                <Route
                  path="/applications/new/payer"
                  element={<Navigate to="/applications/wizard?type=payer" replace />}
                />
                <Route
                  path="/applications/new/agent"
                  element={<Navigate to="/applications/wizard?type=agent" replace />}
                />
              </Route>
            </Route>
          </Route>

          <Route element={<InternalPortalOnly />}>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/internal/login" element={<LoginPage mode="internal" />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<RoleRoute allowedRole="admin" />}>
                <Route path="/internal" element={<Navigate to="/internal/intake" replace />} />
                <Route path="/internal/intake" element={<InternalIntakePage />} />
                <Route path="/internal/review" element={<ReviewPage />} />
                <Route path="/internal/profile" element={<ProfilePage />} />
                <Route
                  path="/review/intake"
                  element={<Navigate to="/internal/intake" replace />}
                />
                <Route path="/review" element={<Navigate to="/internal/review" replace />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
