import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Contest } from '../../types';
import { CalendarDays, Code2, CheckCircle, Trophy, Clock, Search, Filter } from 'lucide-react';

const ContestList: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    try {
        const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      const response = await fetch('http://localhost:3000/api/contests', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json();
        console.log("Fetched contests:", result);
      if (result.success) {
        setContests(result.data);
      } else {
        setError('Failed to fetch contests');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getContestStatus = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) return { status: 'Upcoming', color: 'purple' };
    if (now > end) return { status: 'Ended', color: 'zinc' };
    return { status: 'Active', color: 'green' };
  };

  const getStatusBadgeClass = (color: string) => {
    switch (color) {
      case 'purple':
        return 'bg-gradient-to-r from-purple-600 to-purple-800 text-purple-100 shadow-md';
      case 'zinc':
        return 'bg-gradient-to-r from-zinc-600 to-zinc-800 text-zinc-100 shadow-md';
      case 'green':
        return 'bg-gradient-to-r from-green-600 to-green-800 text-green-100 shadow-md animate-pulse';
      default:
        return '';
    }
  };

  const filteredContests = contests.filter(contest => {
    const matchesSearch = contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (contest.description && contest.description.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'all') return matchesSearch;

    const { status } = getContestStatus(contest.startTime, contest.endTime);
    return matchesSearch && status.toLowerCase() === statusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1C2D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-xl text-zinc-300">Loading amazing contests...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1C1C2D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-6 py-4 rounded-lg inline-block">
              <strong>Oops!</strong> {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-500 via-purple-400 to-purple-300 bg-clip-text text-transparent">
              Programming Contests
            </h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
            Challenge yourself with exciting programming competitions. Test your skills and compete with developers worldwide.
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search contests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-zinc-800/50 backdrop-blur-sm text-zinc-100 placeholder-zinc-400"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-zinc-800/50 backdrop-blur-sm text-zinc-100 appearance-none cursor-pointer"
            >
              <option value="all">All Contests</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>

        {/* Contest Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredContests.map((contest) => {
            const { status, color } = getContestStatus(contest.startTime, contest.endTime);

            return (
              <Link
                key={contest.id}
                to={`/contests/${contest.slug}`}
                className="group bg-zinc-800/70 backdrop-blur-sm rounded-3xl border border-zinc-700/50 shadow-lg hover:shadow-xl transition-all duration-300 p-8 flex flex-col gap-6 hover:scale-105 hover:bg-zinc-700/80"
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-zinc-100 group-hover:text-purple-400 transition-colors duration-200 line-clamp-2">
                    {contest.title}
                  </h2>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${getStatusBadgeClass(color)} transform transition-transform duration-200 group-hover:scale-110`}
                  >
                    {status}
                  </span>
                </div>

                {/* Description */}
                {contest.description && (
                  <p className="text-zinc-300 line-clamp-3 leading-relaxed">{contest.description}</p>
                )}

                {/* Contest Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-zinc-300">
                    <div className="p-2 bg-purple-900/50 rounded-lg">
                      <CalendarDays className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-purple-300">Starts:</span>
                      <p className="text-sm text-zinc-200">{formatDate(contest.startTime)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-zinc-300">
                    <div className="p-2 bg-red-900/50 rounded-lg">
                      <Clock className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-red-300">Ends:</span>
                      <p className="text-sm text-zinc-200">{formatDate(contest.endTime)}</p>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-700">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      <span className="text-2xl font-bold text-blue-300">{contest._count.contestProblems}</span>
                    </div>
                    <span className="text-xs text-zinc-400 uppercase tracking-wide">Problems</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-2xl font-bold text-green-300">{contest._count.submissions}</span>
                    </div>
                    <span className="text-xs text-zinc-400 uppercase tracking-wide">Submissions</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredContests.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-zinc-700/50 rounded-full flex items-center justify-center">
              <Trophy className="w-12 h-12 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No contests found</h3>
            <p className="text-zinc-400">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>

  );
};

export default ContestList;
