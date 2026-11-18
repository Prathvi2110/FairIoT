import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoadingScreen } from './components/LoadingScreen';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const DatasetsPage = lazy(() => import('./pages/DatasetsPage').then((module) => ({ default: module.DatasetsPage })));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage').then((module) => ({ default: module.AnalyzePage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));

function LazyView({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen label="Loading FairIoT view" />}>{children}</Suspense>;
}

function ProtectedApp() {
  const { user, ready } = useAuth();
  if (!ready) return <LoadingScreen label="Preparing your workspace" />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<LazyView><LandingPage /></LazyView>} />
      <Route path="/login" element={<LazyView><AuthPage mode="login" /></LazyView>} />
      <Route path="/register" element={<LazyView><AuthPage mode="register" /></LazyView>} />
      <Route path="/forgot-password" element={<LazyView><AuthPage mode="forgot" /></LazyView>} />
      <Route path="/reset-password" element={<LazyView><AuthPage mode="reset" /></LazyView>} />
      <Route path="/app" element={<ProtectedApp />}>
        <Route index element={<LazyView><DashboardPage /></LazyView>} />
        <Route path="datasets" element={<LazyView><DatasetsPage /></LazyView>} />
        <Route path="analysis" element={<LazyView><AnalyzePage /></LazyView>} />
        <Route path="modules/:module" element={<LazyView><AnalyzePage /></LazyView>} />
        <Route path="history" element={<LazyView><HistoryPage /></LazyView>} />
        <Route path="profile" element={<LazyView><ProfilePage /></LazyView>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return <BrowserRouter><AuthProvider><Router /></AuthProvider></BrowserRouter>;
}
