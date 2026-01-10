import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AuthPage from './pages/AuthPage';
import CardDetails from './pages/CardDetails';
import SearchPage from './pages/SearchPage';
import Checkout from './pages/Checkout';
import UserBookmarks from './pages/UserBookmarks';
import SupportPage from './pages/SupportPage';
import ReferralsPage from './pages/ReferralsPage';
import InvoicesPage from './pages/InvoicesPage';
import AffiliateDashboard from './pages/AffiliateDashboard';
import Settings from './pages/Settings';
import ProfileEdit from './pages/ProfileEdit';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children, requireAdmin = false, requireSuperAdmin = false }: { 
  children: React.ReactNode; 
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}) {
  const { isSignedIn, user } = useUser();

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />;
  }

  const userRole = user?.publicMetadata?.role as string;

  if (requireSuperAdmin && userRole !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !['admin', 'super_admin'].includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function AppInner() {
  const { isSignedIn } = useUser();

  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={isSignedIn ? <Navigate to="/dashboard" /> : <AuthPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cards/:slug" element={<CardDetails />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute requireSuperAdmin>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/bookmarks"
          element={
            <ProtectedRoute>
              <UserBookmarks />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <ReferralsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/affiliate"
          element={
            <ProtectedRoute>
              <AffiliateDashboard />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <ProfileEdit />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
