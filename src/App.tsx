import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

const Landing = lazy(() => import('./pages/Landing'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GroupDetails = lazy(() => import('./pages/GroupDetails'));
const Settings = lazy(() => import('./pages/Settings'));
const GlobalFinance = lazy(() => import('./pages/GlobalFinance'));
const Classrooms = lazy(() => import('./pages/Classrooms'));

function RouteLoading() {
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-cream text-navy font-cairo" role="status">
      جاري التحميل...
    </div>
  );
}

export default function App() {
  useEffect(() => {
    try {
      document.documentElement.dataset.theme = localStorage.getItem('daftari-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      document.documentElement.dataset.theme = 'light';
    }
  }, []);

  return (
    <AuthProvider>
      <HashRouter>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/group/:id" element={<GroupDetails />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/finance" element={<GlobalFinance />} />
              <Route path="/classrooms" element={<Classrooms />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthProvider>
  );
}
