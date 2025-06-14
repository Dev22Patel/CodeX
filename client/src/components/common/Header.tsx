import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Code, User, LogOut, Menu, X, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  return (
    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {user ? (
            <Link to="/problems" className="flex items-center space-x-2 group">
              <Code className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">CodeX</span>
            </Link>
          ) : (
            <Link to="/" className="flex items-center space-x-2 group">
              <Code className="h-8 w-8 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">CodeX</span>
            </Link>
          )}

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/problems"
              className="text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800/50"
            >
              Problems
            </Link>
            <Link
              to="/contests"
              className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800/50 group"
            >
              <Trophy className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
              <span>Contests</span>
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800/50"
                >
                  <User className="h-4 w-4" />
                  <span>{user.name}</span>
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center space-x-2 text-slate-300 hover:text-red-400 transition-colors px-3 py-2 rounded-md hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white transition-colors px-3 py-2 rounded-md hover:bg-slate-800/50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>

          <button
            className="md:hidden text-slate-300 hover:text-white p-2 rounded-md hover:bg-slate-800/50 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
          <div className="px-4 py-3 space-y-1">
            <Link
              to="/problems"
              className="block py-3 px-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Problems
            </Link>
            <Link
              to="/contests"
              className="flex items-center space-x-2 py-3 px-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <Trophy className="h-4 w-4 text-purple-400" />
              <span>Contests</span>
            </Link>
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 py-3 px-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 py-3 px-3 text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-3 px-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-3 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-2 text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
