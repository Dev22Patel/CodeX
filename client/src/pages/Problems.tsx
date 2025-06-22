import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Filter, Trophy, TrendingUp, CheckCircle, XCircle, Circle } from 'lucide-react';
import { api } from '../service/api';
import Loading from '../components/common/Loading';
import type { Problem } from '../types/index';

const Problems: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    api.getProblems().then((response) => {
      if (response.success) {
        setProblems(response.data.problems);
        setFilteredProblems(response.data.problems);
        console.log('Problems fetched successfully:', response.data);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let filtered = problems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(problem =>
        problem.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Difficulty filter
    if (difficultyFilter !== 'ALL') {
      filtered = filtered.filter(problem => problem.difficulty === difficultyFilter);
    }

    // Status filter
    if (statusFilter === 'SOLVED') {
      filtered = filtered.filter(problem => problem.solved);
    } else if (statusFilter === 'UNSOLVED') {
      filtered = filtered.filter(problem => !problem.solved);
    }

    setFilteredProblems(filtered);
  }, [problems, searchTerm, difficultyFilter, statusFilter]);

  const getDifficultyColor = (difficulty: Problem['difficulty']): string => {
    switch (difficulty) {
      case 'EASY':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'HARD':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  // Helper function to parse tags safely
  const parseTags = (tagsString: string): string[] => {
    try {
      if (!tagsString) return [];
      return JSON.parse(tagsString);
    } catch (error) {
      console.error('Error parsing tags:', error);
      return [];
    }
  };

  const getStats = () => {
    const total = problems.length;
    const solved = problems.filter(p => p.solved).length;
    const easy = problems.filter(p => p.difficulty === 'EASY').length;
    const medium = problems.filter(p => p.difficulty === 'MEDIUM').length;
    const hard = problems.filter(p => p.difficulty === 'HARD').length;

    return { total, solved, easy, medium, hard };
  };

  if (loading) return <Loading />;

  const stats = getStats();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Problems</h1>
              <p className="text-slate-400">Solve coding challenges to improve your skills</p>
            </div>
            {/* <div className="flex items-center space-x-4">
              <Link
                to="/contests"
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
              >
                <Trophy className="h-4 w-4" />
                <span>Contests</span>
              </Link>
            </div> */}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-400 uppercase">Total</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-xs font-medium text-slate-400 uppercase">Solved</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{stats.solved}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-medium text-slate-400 uppercase">Easy</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">{stats.easy}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className="text-xs font-medium text-slate-400 uppercase">Medium</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.medium}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-xs font-medium text-slate-400 uppercase">Hard</span>
              </div>
              <div className="text-2xl font-bold text-red-400">{stats.hard}</div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Difficulty Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="SOLVED">Solved</option>
                  <option value="UNSOLVED">Unsolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Problems Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Problem
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Submissions
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Acceptance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Tags
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredProblems.length > 0 ? (
                  filteredProblems.map((problem) => {
                    const parsedTags = parseTags(problem.tags);

                    return (
                      <tr key={problem.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            {problem.solved ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-red-400" />
                            )}
                            <Link
                              to={`/problems/${problem.slug}`}
                              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                              {problem.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(
                              problem.difficulty
                            )}`}
                          >
                            {problem.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {problem.totalSubmissions?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          <div className="flex items-center space-x-2">
                            <span>{problem.acceptanceRate ? `${problem.acceptanceRate}%` : 'N/A'}</span>
                            {(problem.acceptanceRate ?? 0) > 0 && (
                              <div className="w-12 bg-slate-700 rounded-full h-1.5">
                                <div
                                  className="bg-blue-400 h-1.5 rounded-full"
                                  style={{ width: `${problem.acceptanceRate}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              problem.solved
                                ? 'text-green-400 bg-green-500/10 border border-green-500/20'
                                : 'text-slate-400 bg-slate-500/10 border border-slate-500/20'
                            }`}
                          >
                            {problem.solved ? 'Accepted' : 'Not Solved'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            {parsedTags.length > 0 ? (
                              parsedTags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="text-xs font-medium text-slate-300 bg-slate-700 px-2 py-1 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">No tags</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-slate-400">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No problems found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Info */}
        {filteredProblems.length > 0 && (
          <div className="mt-4 text-center text-sm text-slate-400">
            Showing {filteredProblems.length} of {problems.length} problems
          </div>
        )}
      </div>
    </div>
  );
};

export default Problems;
