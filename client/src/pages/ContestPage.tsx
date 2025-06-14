import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  Award,
  TrendingUp,
  Filter,
  Search,
  ChevronRight,
  Star,
  Medal
} from 'lucide-react';
import { api } from '../service/api';
import Loading from '../components/common/Loading';

interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  participants: number;
  problems: number;
  status: 'UPCOMING' | 'LIVE' | 'ENDED';
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  prize?: string;
  registered?: boolean;
}

const Contests: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [filteredContests, setFilteredContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('ALL');

  // Mock data - replace with actual API call
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockContests: Contest[] = [
        {
          id: '1',
          title: 'Weekly Challenge #45',
          description: 'Test your algorithmic skills with dynamic programming and graph theory problems.',
          startTime: '2025-06-15T10:00:00Z',
          endTime: '2025-06-15T12:00:00Z',
          duration: 120,
          participants: 1247,
          problems: 4,
          status: 'UPCOMING',
          difficulty: 'INTERMEDIATE',
          registered: true
        },
        {
          id: '2',
          title: 'CodeX Championship 2025',
          description: 'Annual championship featuring the most challenging problems. Compete for prizes and glory!',
          startTime: '2025-06-20T14:00:00Z',
          endTime: '2025-06-20T17:00:00Z',
          duration: 180,
          participants: 3542,
          problems: 6,
          status: 'UPCOMING',
          difficulty: 'ADVANCED',
          prize: '$5000'
        },
        {
          id: '3',
          title: 'Beginner Bootcamp',
          description: 'Perfect for newcomers! Learn the basics with easy to medium problems.',
          startTime: '2025-06-14T16:00:00Z',
          endTime: '2025-06-14T18:00:00Z',
          duration: 120,
          participants: 892,
          problems: 5,
          status: 'LIVE',
          difficulty: 'BEGINNER'
        },
        {
          id: '4',
          title: 'Speed Coding Sprint',
          description: 'Fast-paced contest focusing on implementation and speed. Can you solve all problems in time?',
          startTime: '2025-06-10T09:00:00Z',
          endTime: '2025-06-10T10:30:00Z',
          duration: 90,
          participants: 2156,
          problems: 8,
          status: 'ENDED',
          difficulty: 'INTERMEDIATE'
        },
        {
          id: '5',
          title: 'Data Structures Deep Dive',
          description: 'Advanced problems focusing on complex data structures and algorithms.',
          startTime: '2025-06-12T12:00:00Z',
          endTime: '2025-06-12T15:00:00Z',
          duration: 180,
          participants: 1689,
          problems: 5,
          status: 'ENDED',
          difficulty: 'ADVANCED'
        }
      ];

      setContests(mockContests);
      setFilteredContests(mockContests);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = contests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(contest =>
        contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contest.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(contest => contest.status === statusFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== 'ALL') {
      filtered = filtered.filter(contest => contest.difficulty === difficultyFilter);
    }

    setFilteredContests(filtered);
  }, [contests, searchTerm, statusFilter, difficultyFilter]);

  const getStatusColor = (status: Contest['status']): string => {
    switch (status) {
      case 'LIVE':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'UPCOMING':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'ENDED':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getDifficultyColor = (difficulty: Contest['difficulty']): string => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'INTERMEDIATE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'ADVANCED':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStats = () => {
    const total = contests.length;
    const live = contests.filter(c => c.status === 'LIVE').length;
    const upcoming = contests.filter(c => c.status === 'UPCOMING').length;
    const totalParticipants = contests.reduce((sum, c) => sum + c.participants, 0);

    return { total, live, upcoming, totalParticipants };
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
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                <Trophy className="h-8 w-8 text-purple-400" />
                <span>Contests</span>
              </h1>
              <p className="text-slate-400">Compete with developers worldwide and test your skills</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/problems"
                className="flex items-center space-x-2 bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all duration-200"
              >
                <span>Practice Problems</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-medium text-slate-400 uppercase">Total Contests</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-medium text-slate-400 uppercase">Live Now</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{stats.live}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-400 uppercase">Upcoming</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{stats.upcoming}</div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Users className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-400 uppercase">Participants</span>
              </div>
              <div className="text-2xl font-bold text-amber-400">{stats.totalParticipants.toLocaleString()}</div>
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
                  placeholder="Search contests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="LIVE">Live</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ENDED">Ended</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">All Levels</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contests Grid */}
        <div className="space-y-6">
          {filteredContests.length > 0 ? (
            filteredContests.map((contest) => (
              <div
                key={contest.id}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 mb-4 lg:mb-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-xl font-bold text-white hover:text-purple-300 transition-colors">
                        {contest.title}
                      </h3>
                      {contest.prize && (
                        <div className="flex items-center space-x-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full px-2 py-1">
                          <Medal className="h-3 w-3 text-yellow-400" />
                          <span className="text-xs font-medium text-yellow-400">{contest.prize}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-400 mb-4 max-w-2xl">{contest.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span>{formatDate(contest.startTime)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300">
                        <Clock className="h-4 w-4 text-green-400" />
                        <span>{formatDuration(contest.duration)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span>{contest.participants.toLocaleString()} participants</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300">
                        <TrendingUp className="h-4 w-4 text-amber-400" />
                        <span>{contest.problems} problems</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:items-end space-y-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(contest.status)}`}
                      >
                        {contest.status}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(contest.difficulty)}`}
                      >
                        {contest.difficulty}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      {contest.status === 'LIVE' && (
                        <Link
                          to={`/contests/${contest.id}`}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-green-500/25 font-medium"
                        >
                          Join Now
                        </Link>
                      )}
                      {contest.status === 'UPCOMING' && (
                        <>
                          {contest.registered ? (
                            <button className="bg-slate-700 text-green-400 px-4 py-2 rounded-lg font-medium cursor-default flex items-center space-x-2">
                              <Award className="h-4 w-4" />
                              <span>Registered</span>
                            </button>
                          ) : (
                            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 font-medium">
                              Register
                            </button>
                          )}
                        </>
                      )}
                      {contest.status === 'ENDED' && (
                        <Link
                          to={`/contests/${contest.id}/results`}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                        >
                          View Results
                        </Link>
                      )}
                      <Link
                        to={`/contests/${contest.id}`}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-400">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No contests found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        {filteredContests.length > 0 && (
          <div className="mt-8 text-center text-sm text-slate-400">
            Showing {filteredContests.length} of {contests.length} contests
          </div>
        )}
      </div>
    </div>
  );
};

export default Contests;
