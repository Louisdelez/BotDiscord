import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { useGuildStore } from './stores/guild';
import { useThemeStore } from './stores/theme';
import { useT } from './lib/i18n';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Callback } from './pages/Callback';
import { SelectServer } from './pages/SelectServer';
import { Dashboard } from './pages/Dashboard';
import { Moderation } from './pages/Moderation';
import { XP } from './pages/XP';
import { AI } from './pages/AI';
import { Games } from './pages/Games';
import { GameLibrary } from './pages/GameLibrary';
import { Community } from './pages/Community';
import { Music } from './pages/Music';
import { Settings } from './pages/Settings';
import { WatchTogether } from './pages/WatchTogether';
import { ServerSetup } from './pages/ServerSetup';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  const t = useT();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--text-secondary)]">{t('common.loading')}</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function RoleRoute({ minRole, children }) {
  const hasRole = useGuildStore(s => s.hasRole);
  if (!hasRole(minRole)) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  const { fetchUser } = useAuthStore();
  const { init: initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    if (localStorage.getItem('token')) fetchUser();
    else useAuthStore.setState({ loading: false });
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<Callback />} />
      <Route path="/servers" element={<ProtectedRoute><SelectServer /></ProtectedRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/moderation" element={<RoleRoute minRole="MOD"><Moderation /></RoleRoute>} />
        <Route path="/xp" element={<XP />} />
        <Route path="/ai" element={<RoleRoute minRole="ADMIN"><AI /></RoleRoute>} />
        <Route path="/games" element={<Games />} />
        <Route path="/game-library" element={<GameLibrary />} />
        <Route path="/community" element={<Community />} />
        <Route path="/music" element={<RoleRoute minRole="ADMIN"><Music /></RoleRoute>} />
        <Route path="/watchtogether" element={<RoleRoute minRole="ADMIN"><WatchTogether /></RoleRoute>} />
        <Route path="/server-setup" element={<RoleRoute minRole="ADMIN"><ServerSetup /></RoleRoute>} />
        <Route path="/settings" element={<RoleRoute minRole="ADMIN"><Settings /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
