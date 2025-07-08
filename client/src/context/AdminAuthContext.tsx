// client/src/context/AdminAuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  adminLogin: (email: string, password: string) => boolean;
  adminLogout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    // Check if admin is already logged in (from localStorage)
    // Only run this on the client side
    if (typeof window !== 'undefined') {
      const adminAuth = window.localStorage.getItem('adminAuthenticated');
      if (adminAuth === 'true') {
        setIsAdminAuthenticated(true);
      }
    }
  }, []);

  const adminLogin = (email: string, password: string): boolean => {
    console.log('Admin login attempt:', { email, password }); // Debug log

    // Hardcoded admin credentials
    if (email === 'admin@email.com' && password === 'admin1234') {
      setIsAdminAuthenticated(true);
      // Only use localStorage on client side
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('adminAuthenticated', 'true');
      }
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
    // Only use localStorage on client side
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('adminAuthenticated');
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, adminLogin, adminLogout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
