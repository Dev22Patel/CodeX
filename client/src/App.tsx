import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/common/Header';
import ProtectedRoute from './components/common/ProtectedRoutes';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Problems from './pages/Problems';
import ProblemDetail from './pages/ProblemDetail';
import Profile from './pages/Profile';
import TestPage from './pages/TestPage';
import Contests from './pages/ContestPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#0d1117] text-white">
          <Header />
          <main className='flex-grow'>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/problems" element={<Problems />} />
              <Route path="/problems/:slug" element={<ProblemDetail />} />
              <Route path="/contests" element={<Contests />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="problems/:problemId/submissions/history" element={<TestPage />} />
            </Routes>
          </main>

        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
