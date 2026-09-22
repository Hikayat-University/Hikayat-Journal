import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div className="container" style={{ padding: 60 }}>Memuat…</div>;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
