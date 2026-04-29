import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAuthenticated, isAdmin }) => {
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
