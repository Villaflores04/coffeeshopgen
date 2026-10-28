import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';

export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="text-stone-500">Loading…</p>;

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (role && profile?.role !== role) {
    return <p className="text-red-600">You don't have access to this page.</p>;
  }

  return children;
}
