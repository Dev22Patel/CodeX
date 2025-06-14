import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Code } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/common/Toast';
import type { LoginCredentials, ToastProps } from '../types/index';

const Login: React.FC = () => {
  const [formData, setFormData] = useState<LoginCredentials>({ login: '', password: '' });
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData);
      if (response.success) {
        navigate('/problems');
      } else {
        setToast({ message: response.message, type: 'error', onClose: () => setToast(null) });
      }
    } catch (error) {
      setToast({ message: 'Login failed. Please try again.', type: 'error', onClose: () => setToast(null) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      {toast && <Toast {...toast} />}
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Code className="h-12 w-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">Sign in to CodeX</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email or Username</label>
            <input
              type="text"
              required
              value={formData.login}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, login: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
