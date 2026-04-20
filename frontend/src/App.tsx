import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AgentOnboardingPage from "./pages/AgentOnboardingPage";
import ApplicantDashboardPage from "./pages/ApplicantDashboardPage";
import ApplicationStatusPage from "./pages/ApplicationStatusPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MerchantOnboardingPage from "./pages/MerchantOnboardingPage";
import PayerOnboardingPage from "./pages/PayerOnboardingPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ReviewPage from "./pages/ReviewPage";

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RoleRoute allowedRole="applicant" />}>
              <Route path="/dashboard" element={<ApplicantDashboardPage />} />
              <Route path="/applications/agent" element={<AgentOnboardingPage />} />
              <Route path="/applications/merchant" element={<MerchantOnboardingPage />} />
              <Route path="/applications/payer" element={<PayerOnboardingPage />} />
              <Route path="/applications/status" element={<ApplicationStatusPage />} />
              <Route
                path="/applications/:applicationId/status"
                element={<ApplicationStatusPage />}
              />
              <Route
                path="/applications/new/merchant"
                element={<Navigate to="/applications/merchant" replace />}
              />
              <Route
                path="/applications/new/payer"
                element={<Navigate to="/applications/payer" replace />}
              />
            </Route>

            <Route element={<RoleRoute allowedRole="admin" />}>
              <Route path="/review" element={<ReviewPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
