import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase.js';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import CartBar from './components/CartBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SetupNotice from './components/SetupNotice.jsx';
import { Skeleton } from './components/ui.jsx';
import Home from './pages/Home.jsx';

const ShopPage = lazy(() => import('./pages/ShopPage.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const Rewards = lazy(() => import('./pages/Rewards.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard.jsx'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<Skeleton className="mt-10 h-72 w-full" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shops/:id" element={<ShopPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
              <Route path="/owner" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CartBar />
    </>
  );
}
