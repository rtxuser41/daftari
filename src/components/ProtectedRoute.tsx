import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream flex-col gap-4">
         <div className="w-12 h-12 border-4 border-navy border-t-gold rounded-full animate-spin"></div>
         <p className="text-navy font-cairo font-semibold animate-pulse">جاري التحميل...</p>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
