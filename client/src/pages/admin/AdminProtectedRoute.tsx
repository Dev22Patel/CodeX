// client/src/components/admin/AdminProtectedRoute.tsx
import React from 'react';
import { AdminLogin } from './AdminLogin';
import { useAdminAuth } from '../../context/AdminAuthContext';
interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAdminAuthenticated } = useAdminAuth();


  if (!isAdminAuthenticated) {
    return <AdminLogin />;
  }

  return <>{children}</>;
};
