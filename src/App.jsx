import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import TabBar from './components/TabBar.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import ScanScreen from './screens/ScanScreen.jsx';
import HistoryScreen from './screens/HistoryScreen.jsx';
import PassportScreen from './screens/PassportScreen.jsx';
import MyPageScreen from './screens/MyPageScreen.jsx';
import { ROUTES, TABS } from './constants.js';
import { color } from './theme.js';

function SplashScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: color.brand, color: '#fff', fontSize: 13, letterSpacing: '.08em' }}>
      IEUM DPP
    </div>
  );
}

function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SplashScreen />;
  if (status !== 'authenticated') return <Navigate to={ROUTES.login} replace state={{ from: location.pathname }} />;
  return children;
}

function AppShell({ children }) {
  const location = useLocation();
  const showTabs = TABS.some((tab) => tab.to === location.pathname);
  return (
    <>
      {children}
      {showTabs ? <TabBar /> : null}
    </>
  );
}

function AppRoutes() {
  const { status } = useAuth();
  return (
    <AppShell>
      <Routes>
        <Route path={ROUTES.login} element={status === 'authenticated' ? <Navigate to={ROUTES.scan} replace /> : <LoginScreen />} />
        <Route path={ROUTES.scan} element={<RequireAuth><ScanScreen /></RequireAuth>} />
        <Route path={ROUTES.history} element={<RequireAuth><HistoryScreen /></RequireAuth>} />
        <Route path="/passport/:passportId" element={<RequireAuth><PassportScreen /></RequireAuth>} />
        <Route path={ROUTES.my} element={<RequireAuth><MyPageScreen /></RequireAuth>} />
        <Route path="*" element={<Navigate to={ROUTES.scan} replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UiProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </UiProvider>
    </AuthProvider>
  );
}
