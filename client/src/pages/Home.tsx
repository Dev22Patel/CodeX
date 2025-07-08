import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Code, Trophy, CheckCircle, BarChart3, Zap, Users, Calendar, Timer, Star, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../service/api';
import type { ProblemStats } from '../types/index';

const Home: React.FC = () => {
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    api.getProblemStats().then((response) => {
      if (response.success) {
        setStats(response.data);
      }
    });
  }, []);

  const features = [
    { icon: Code, title: "AI-Powered Hints", desc: "Get intelligent hints without spoiling the solution" },
    { icon: Users, title: "Live Contests", desc: "Compete with developers worldwide in real-time" },
    { icon: TrendingUp, title: "Smart Analytics", desc: "Track your progress with detailed performance insights" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-24">
          <div className="inline-flex items-center bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm border border-purple-500/20 rounded-full px-6 py-2 mb-8">
            <Zap className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-300">Join 50,000+ developers worldwide</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200 mb-8 leading-tight">
            Code.<br />
            <span className="text-purple-400">Compete.</span><br />
            <span className="text-cyan-400">Conquer.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
            The ultimate competitive programming platform where algorithms meet ambition.
            <span className="text-purple-300"> Battle in live contests</span>, solve mind-bending challenges, and
            <span className="text-cyan-300"> climb the global leaderboard</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to="/problems"
              className="group relative bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 flex items-center font-semibold text-lg"
            >
              <span className="mr-3">Start Your Journey</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-75 group-hover:opacity-100 transition-opacity -z-10"></div>
            </Link>

            <Link
              to="/contests"
              className="group border-2 border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-white px-10 py-4 rounded-2xl transition-all duration-300 hover:bg-purple-500/10 flex items-center font-semibold text-lg backdrop-blur-sm"
            >
              <Calendar className="w-5 h-5 mr-3" />
              Live Contests
            </Link>

            {!user && (
              <Link
                to="/register"
                className="text-slate-400 hover:text-white underline underline-offset-4 hover:underline-offset-8 transition-all duration-300"
              >
                Create free account
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-24">
            <div className="group bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl hover:border-purple-500/50 transition-all duration-500 hover:transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <Code className="h-10 w-10 text-purple-400 group-hover:text-purple-300 transition-colors" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">{stats.totalProblems}</p>
              <p className="text-slate-400 font-medium">Coding Challenges</p>
            </div>

            <div className="group bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl hover:border-cyan-500/50 transition-all duration-500 hover:transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <Users className="h-10 w-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">24</p>
              <p className="text-slate-400 font-medium">Active Contests</p>
            </div>

            <div className="group bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl hover:border-emerald-500/50 transition-all duration-500 hover:transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="h-10 w-10 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">50K+</p>
              <p className="text-slate-400 font-medium">Global Coders</p>
            </div>

            <div className="group bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl hover:border-amber-500/50 transition-all duration-500 hover:transform hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <Star className="h-10 w-10 text-amber-400 group-hover:text-amber-300 transition-colors" />
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
              </div>
              <p className="text-3xl font-bold text-white mb-2">99.9%</p>
              <p className="text-slate-400 font-medium">Success Rate</p>
            </div>
          </div>
        )}

        {/* Contest Spotlight */}
        <div className="mb-24">
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-semibold uppercase tracking-wide text-sm">Live Now</span>
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">codeforces-contest-spring</h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl">
                Join 5 developers in our flagship contest. Solve 6 algorithmic problems in 3 hours.
                Winner takes home 1,000rs and eternal glory.
              </p>
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2 text-slate-300">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <span className="font-semibold">2h 34m remaining</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold">5 participants</span>
                </div>
                <Link
                  to="/contest/codeforces-contest-spring"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  Join Battle
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Why Elite Developers Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">CodeX</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`p-6 rounded-2xl transition-all duration-500 cursor-pointer ${
                    activeFeature === index
                      ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-l-4 border-purple-400 transform scale-105'
                      : 'bg-slate-900/30 hover:bg-slate-900/50 border-l-4 border-transparent'
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${activeFeature === index ? 'bg-purple-500/20' : 'bg-slate-800/50'}`}>
                      <feature.icon className={`w-6 h-6 ${activeFeature === index ? 'text-purple-400' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-slate-300">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 h-80 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    {React.createElement(features[activeFeature].icon, { className: "w-10 h-10 text-white" })}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">{features[activeFeature].title}</h3>
                  <p className="text-slate-300 text-lg leading-relaxed">{features[activeFeature].desc}</p>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-50"></div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Level Up Your Coding Game?</h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already sharpening their skills and competing for glory.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/problems"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 font-semibold text-lg"
            >
              Start Coding Now
            </Link>
            <Link
              to="/contests"
              className="border-2 border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-10 py-4 rounded-2xl transition-all duration-300 hover:bg-slate-800/50 font-semibold text-lg"
            >
              View All Contests
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
