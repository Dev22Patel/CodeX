// client/src/pages/admin/AdminDashboard.tsx
import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
// Adjust the import according to the actual export from adminApi
// If it's a default export:

export const AdminDashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { adminLogout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    adminLogout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 shadow-lg transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Admin Panel</h2>
          <button className="md:hidden text-gray-300" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="p-4 flex-1">
          <ul className="space-y-2">
            <li>
              <Link
                to="/admin"
                className="block p-2 rounded hover:bg-gray-700 text-gray-200 hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/admin/problems"
                className="block p-2 rounded hover:bg-gray-700 text-gray-200 hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                Problems
              </Link>
            </li>
            <li>
              <Link
                to="/admin/contests"
                className="block p-2 rounded hover:bg-gray-700 text-gray-200 hover:text-white"
                onClick={() => setIsSidebarOpen(false)}
              >
                Contests
              </Link>
            </li>
          </ul>
        </nav>
        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-900">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400 text-sm">Welcome, Admin</span>
            <button className="md:hidden text-gray-300" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
