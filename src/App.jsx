import { Route, Routes } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AchievementExperience from './components/experience/AchievementExperience';
import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { ToastProvider } from './components/ui/ToastProvider';
import AboutPage from './views/AboutPage';
import LandingPage from './views/LandingPage';
import NotFound from './views/NotFound';
import PrivacyPage from './views/PrivacyPage';

function App() {
  return (
    <ConfigProvider>
      <ToastProvider>
        <AuthProvider>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AchievementExperience />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/settings"
                  element={
                    <ProtectedRoute>
                      <AchievementExperience />
                    </ProtectedRoute>
                  }
                />
                <Route path="/dashboard/*" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
        </AuthProvider>
      </ToastProvider>
    </ConfigProvider>
  );
}

export default App;
