import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Code, Trophy, CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../service/api';
import type { ProblemStats } from '../types/index';

const Home: React.FC = () => {
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.getProblemStats().then((response) => {
      if (response.success) {
        setStats(response.data);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Master Coding with <span className="text-blue-400">CodeX</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Enhance your coding skills with our collection of algorithmic challenges. Practice, learn, and prepare for
            technical interviews.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/problems"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group"
            >
              Start Solving <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            {!user && (
              <Link
                to="/register"
                className="border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 px-8 py-3 rounded-lg transition-colors"
              >
                Sign Up Free
              </Link>
            )}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center">
                <Code className="h-8 w-8 text-blue-400 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalProblems}</p>
                  <p className="text-slate-400">Total Problems</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-emerald-400 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalSolved || 0}</p>
                  <p className="text-slate-400">Problems Solved</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-400 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalSubmissions || 0}</p>
                  <p className="text-slate-400">Total Submissions</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl hover:bg-slate-900/70 transition-colors">
              <div className="flex items-center">
                <Trophy className="h-8 w-8 text-amber-400 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.averageAcceptanceRate ? Math.round(stats.averageAcceptanceRate) : 0}%
                  </p>
                  <p className="text-slate-400">Acceptance Rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Why Choose CodeX?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-xl hover:bg-slate-900/70 transition-colors">
              <Code className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Quality Problems</h3>
              <p className="text-slate-400">Carefully curated problems ranging from easy to hard difficulty levels.</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-xl hover:bg-slate-900/70 transition-colors">
              <ChevronRight className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Interactive Editor</h3>
              <p className="text-slate-400">Code directly in your browser with syntax highlighting and auto-completion.</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-xl hover:bg-slate-900/70 transition-colors">
              <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">Track Progress</h3>
              <p className="text-slate-400">Monitor your solving progress and improve your algorithmic thinking.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
