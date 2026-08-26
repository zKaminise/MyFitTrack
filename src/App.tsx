import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastHost, ConfirmHost } from './ui/components';
import { AppShell } from './components/AppShell';
import { BrandLogo } from './components/BrandLogo';
import AuthFlow from './pages/auth/AuthFlow';
import { LegacyImportModal } from './components/LegacyImportModal';
import { detectLegacyData, type LegacyCounts } from './services/migration';
import { useAuth } from './store/authStore';
import { useSettings } from './store/settingsStore';
import TodayPage from './pages/TodayPage';
import WorkoutsPage from './pages/WorkoutsPage';
import WorkoutEditorPage from './pages/WorkoutEditorPage';
import HistoryPage from './pages/HistoryPage';
import SessionDetailPage from './pages/SessionDetailPage';
import MorePage from './pages/MorePage';
import ExerciseLibraryPage from './pages/ExerciseLibraryPage';
import ExerciseDetailPage from './pages/ExerciseDetailPage';
import SettingsPage from './pages/SettingsPage';
import BackupPage from './pages/BackupPage';
import ProgramPage from './pages/ProgramPage';
import PeriodizationPage from './pages/PeriodizationPage';
import SessionPage from './pages/SessionPage';
import OnboardingPage from './pages/OnboardingPage';
import AccountPage from './pages/AccountPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

function Splash() {
  return (
    <div className="splash">
      <div className="logo-pulse">
        <BrandLogo size={34} />
      </div>
      <strong>MyFitTrack</strong>
      <span className="faint" style={{ fontSize: 13 }}>Preparando seus treinos...</span>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;

  if (location.pathname === '/reset-password') return <ResetPasswordPage />;

  if (!user) {
    return (
      <>
        <AuthFlow />
        <ToastHost />
        <ConfirmHost />
      </>
    );
  }

  return <AuthedApp />;
}

function AuthedApp() {
  const user = useAuth((s) => s.user)!;
  const { settings, loaded } = useSettings();
  const [legacy, setLegacy] = useState<LegacyCounts | null | undefined>(undefined);

  useEffect(() => {
    void detectLegacyData().then(setLegacy);
  }, [user.id]);

  if (!loaded || legacy === undefined) return <Splash />;

  if (legacy) {
    return (
      <>
        <LegacyImportModal counts={legacy} onDone={() => setLegacy(null)} />
        <ToastHost />
        <ConfirmHost />
      </>
    );
  }

  if (!settings.onboarded) {
    return (
      <>
        <OnboardingPage />
        <ToastHost />
        <ConfirmHost />
      </>
    );
  }

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/workouts/:id" element={<WorkoutEditorPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:id" element={<SessionDetailPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/exercises" element={<ExerciseLibraryPage />} />
          <Route path="/exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="/program" element={<ProgramPage />} />
          <Route path="/periodization" element={<PeriodizationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <ToastHost />
      <ConfirmHost />
    </>
  );
}
