// client/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import Header from './components/common/Header';
import ProtectedRoute from './components/common/ProtectedRoutes';
import { AdminProtectedRoute } from './pages/admin/AdminProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Profile from './pages/Profile';
import ContestList from './components/contest/contestList';
import ContestDetailComponent from './components/contest/contestDetail';
import ContestProblemDetail from './components/contest/contestProblemDetail';
import ContestLeaderboard from './pages/LeaderBoardPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProblems } from './pages/admin/Problems';
import { NewProblem } from './pages/admin/NewProblem';
import ProblemDetails from './pages/admin/ProblemDetails';
import EditProblem from './pages/admin/EditProblems';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-white">
      {!isAdminRoute && <Header />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/problems" element={<Problems />} />
          <Route path="/problems/:slug" element={<ProblemDetail />} />
          <Route path="/contests" element={<ContestList />} />
          <Route path="/contests/:slug" element={<ContestDetailComponent />} />
          <Route path="/contests/:contestSlug/problem/:problemSlug" element={<ContestProblemDetail />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/contests/:slug/leaderboard" element={<ContestLeaderboard />} />

          {/* Admin Routes - Protected */}
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<div className="text-white">Welcome to Admin Dashboard</div>} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="problems/new" element={<NewProblem />} />
            <Route path="problems/:id" element={<ProblemDetails />} />
            <Route path="problems/:id/edit" element={<EditProblem />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AdminAuthProvider>
    </AuthProvider>
  );
};

export default App;
