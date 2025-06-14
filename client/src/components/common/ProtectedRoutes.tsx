import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loading from './Loading';
import type { ProtectedRouteProps } from '../../types/index';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return user ? <>{children}</> : <Navigate to="/login" />;
};

export default ProtectedRoute;
