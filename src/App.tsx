import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GroupDetails from './pages/GroupDetails';
import Settings from './pages/Settings';
import GlobalFinance from './pages/GlobalFinance';
import Classrooms from './pages/Classrooms';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
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
      </HashRouter>
    </AuthProvider>
  );
}

