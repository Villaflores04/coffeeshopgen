import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { EmptyState, LinkButton, Skeleton } from './ui.jsx';

export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  // The profile loads just after the session; wait for it before checking access.
  if (!profile) return <Skeleton className="h-64 w-full" />;

  if (profile.is_suspended) {
    return (
      <EmptyState title="Account access is suspended" action={<LinkButton to="/" variant="dark">Back to shops</LinkButton>}>
        {profile.suspension_reason || 'Your account access has been paused by the marketplace administrator.'}
        {' '}Your order and account records are preserved. Contact the administrator if you need clarification.
      </EmptyState>
    );
  }

  if (role && profile.role !== role) {
    return (
      <EmptyState title="This page is for admins" action={<LinkButton to="/" variant="dark">Back to shops</LinkButton>}>
        Your account doesn’t have access here.
      </EmptyState>
    );
  }
  return children;
}
