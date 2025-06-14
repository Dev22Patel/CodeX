import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../service/api';
import type { AuthContextType, AuthProviderProps, LoginCredentials, RegisterData, User } from '../types/index';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (token) {
      api
        .getProfile(token)
        .then((response) => {
          if (response.success) {
            setUser(response.data.user);
          } else {
            localStorage.removeItem('token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (
    credentials: LoginCredentials
  ): Promise<{ success: boolean; message: string; data: { token: string; user: User } }> => {
    const response = await api.login(credentials);
    if (response.success) {
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem('token', response.data.token);
    }
    return response;
  };

  const register = async (
    userData: RegisterData
  ): Promise<{ success: boolean; message: string; data: { token: string; user: User } }> => {
    const response = await api.register(userData);
    if (response.success) {
      setToken(response.data.token);
      setUser(response.data.user);
      localStorage.setItem('token', response.data.token);
    }
    return response;
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
