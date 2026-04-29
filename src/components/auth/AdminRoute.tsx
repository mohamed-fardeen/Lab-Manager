import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface AdminRouteProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  onLogout: (skipNavigate?: boolean) => void;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ isAuthenticated, isAdmin, onLogout }) => {
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // If a regular (non-admin) user somehow lands on an /admin/* route,
    // force sign them out immediately before sending to admin login.
    if (isAuthenticated && !isAdmin && !signingOut) {
      setSigningOut(true);
      supabase.auth.signOut().then(() => {
        onLogout(true); // pass true to skip redirecting to '/'
        setSigningOut(false);
      });
    }
  }, [isAuthenticated, isAdmin]);

  // While signing out, render nothing (avoids flash of content)
  if (signingOut) return null;

  // Not authenticated (or just signed out) → admin login
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
