import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ContestDetail } from '../../types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Trophy,
  Code2,
  Timer,
  CheckCircle2,
  AlertTriangle,
  Target,
  Zap,
  Award,
  TrendingUp,
} from 'lucide-react';

const ContestDetailComponent: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchContest(slug);
    }
  }, [slug]);

  const fetchContest = async (contestSlug: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const response = await fetch(`http://localhost:3000/api/contests/${contestSlug}`, { headers });
      const result = await response.json();

      if (response.ok && result.success) {
        setContest(result.data);
        setStartTime(null);
      } else {
        if (response.status === 403 && result.message === 'Contest is not currently accessible') {
          setError('Contest is not currently active');
          setStartTime(result.data?.startTime || null);
        } else {
          setError(result.message || 'Contest not found');
        }
      }
    } catch (err) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return {
          color: 'text-green-300 bg-green-900/50 border-green-700/50',
          icon: '🟢',
          gradient: 'from-green-600 to-green-800',
        };
      case 'medium':
        return {
          color: 'text-yellow-300 bg-yellow-900/50 border-yellow-700/50',
          icon: '🟡',
          gradient: 'from-yellow-600 to-yellow-800',
        };
      case 'hard':
        return {
          color: 'text-red-300 bg-red-900/50 border-red-700/50',
          icon: '🔴',
          gradient: 'from-red-600 to-red-800',
        };
      default:
        return {
          color: 'text-zinc-300 bg-zinc-900/50 border-zinc-700/50',
          icon: '⚪',
          gradient: 'from-zinc-600 to-zinc-800',
        };
    }
  };

  const getContestStatus = () => {
    if (!contest) return { status: 'Unknown', color: 'zinc', isActive: false };

    const now = new Date();
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);

    if (now < start) return { status: 'Upcoming', color: 'purple', isActive: false };
    if (now > end) return { status: 'Ended', color: 'zinc', isActive: false };
    return { status: 'Active', color: 'green', isActive: true };
  };

  const getUserStats = () => {
    if (!contest) return {
      solvedCount: 0,
      totalProblems: 0,
      remainingProblems: 0,
      totalPoints: 0,
      maxPoints: 0,
      averageTime: 0,
      fastestSolve: null,
      solvedProblems: []
    };

    // Debug: Log contestProblems to check data
    console.log('Contest Problems:', contest.contestProblems);

    const solvedProblems = contest.contestProblems.filter(problem => {
      console.log(`Problem: ${problem.title}, userStatus:`, problem.userStatus);
      return problem.userStatus?.isAccepted;
    });

    console.log('Solved Problems:', solvedProblems);

    const totalPoints = solvedProblems.reduce((sum, problem) =>
      sum + (problem.userStatus?.points || 0), 0
    );

    const maxPoints = contest.contestProblems.reduce((sum, problem) =>
      sum + problem.points, 0
    );

    const solveTimesMinutes = solvedProblems.map(problem => {
      const solveTime = problem.userStatus?.solveTimeMinutes;
      return solveTime || 0;
    }).filter(time => time > 0);

    const averageTime = solveTimesMinutes.length > 0
      ? Math.round(solveTimesMinutes.reduce((sum, time) => sum + time, 0) / solveTimesMinutes.length)
      : 0;

    const fastestSolve = solveTimesMinutes.length > 0 ? Math.min(...solveTimesMinutes) : null;

    return {
      solvedCount: solvedProblems.length,
      totalProblems: contest.contestProblems.length,
      remainingProblems: contest.contestProblems.length - solvedProblems.length,
      totalPoints,
      maxPoints,
      averageTime,
      fastestSolve,
      solvedProblems: solvedProblems.map(problem => ({
        ...problem,
        solveTime: problem.userStatus?.solveTimeMinutes || 0
      }))
    };
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? 'Invalid date'
      : date.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short',
        });
  };

  const calculateDuration = () => {
    if (!contest) return '';
    const start = new Date(contest.startTime);
    const end = new Date(contest.endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) return `${diffHours} hours`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1C2D]">
        <div className="max-w-6xl mx-auto p-6 pt-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-xl text-zinc-300">Loading contest details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div className="min-h-screen bg-[#1C1C2D]">
        <div className="max-w-6xl mx-auto p-6 pt-20">
          <div className="text-center">
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-6 py-4 rounded-lg inline-block">
              <strong>Error:</strong> {error}
              {startTime && error === 'Contest is not currently active' && (
                <p className="mt-2 text-sm">
                  Contest will start at {formatDateTime(startTime)}.
                </p>
              )}
            </div>
            <Link
              to="/contests"
              className="mt-6 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium bg-zinc-800/50 px-4 py-2 rounded-lg hover:bg-zinc-700/50 transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Contests
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const contestStatus = getContestStatus();
  const userStats = getUserStats();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <Link
            to="/contests"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 bg-zinc-800/50 px-4 py-2 rounded-lg hover:bg-zinc-700/50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contests
          </Link>
        </div>

        <div className="bg-zinc-800/70 backdrop-blur-sm rounded-3xl border border-zinc-700/50 shadow-xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl font-bold text-zinc-100">{contest.title}</h1>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide ${
                    contestStatus.color === 'green'
                      ? 'bg-gradient-to-r from-green-600 to-green-800 text-green-100 animate-pulse'
                      : contestStatus.color === 'purple'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-purple-100'
                      : 'bg-gradient-to-r from-zinc-600 to-zinc-800 text-zinc-100'
                  }`}
                >
                  {contestStatus.status}
                </span>
              </div>

              {contest.description && (
                <p className="text-lg text-zinc-300 leading-relaxed mb-6">{contest.description}</p>
              )}

              {/* Display upcoming contest warning */}
              {!contestStatus.isActive && contestStatus.status === 'Upcoming' && (
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-6 py-4 rounded-lg mb-6 flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Contest Not Started:</strong> This contest will start at{' '}
                    {formatDateTime(contest.startTime)}. Problems will be available once the contest begins.
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 p-4 rounded-xl border border-purple-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-purple-300">Start Time</span>
                  </div>
                  <p className="text-sm text-purple-200">{formatDateTime(contest.startTime)}</p>
                </div>

                <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 p-4 rounded-xl border border-red-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-red-300">End Time</span>
                  </div>
                  <p className="text-sm text-red-200">{formatDateTime(contest.endTime)}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 p-4 rounded-xl border border-blue-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Timer className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-blue-300">Duration</span>
                  </div>
                  <p className="text-sm text-blue-200">{calculateDuration()}</p>
                </div>

                <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 p-4 rounded-xl border border-green-700/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-green-400" />
                    <span className="font-semibold text-green-300">Submissions</span>
                  </div>
                  <p className="text-2xl font-bold text-green-200">{contest._count.submissions}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Progress Stats - Only show if contest is active and user has data */}
        {contestStatus.isActive && (
          <div className="bg-zinc-800/70 backdrop-blur-sm rounded-3xl border border-zinc-700/50 shadow-xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl">
                <TrendingUp className="w-6 h-6 text-zinc-100" />
              </div>
              <h2 className="text-3xl font-bold text-zinc-100">Your Progress</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/50 p-4 rounded-xl border border-emerald-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">Solved</span>
                </div>
                <p className="text-2xl font-bold text-emerald-200">
                  {userStats.solvedCount} / {userStats.totalProblems}
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 p-4 rounded-xl border border-orange-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  <span className="font-semibold text-orange-300">Remaining</span>
                </div>
                <p className="text-2xl font-bold text-orange-200">{userStats.remainingProblems}</p>
              </div>


              {/* <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/50 p-4 rounded-xl border border-cyan-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span className="font-semibold text-cyan-300">Avg. Time</span>
                </div>
                <p className="text-2xl font-bold text-cyan-200">
                  {userStats.averageTime > 0 ? formatTime(userStats.averageTime) : 'N/A'}
                </p>
              </div> */}
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-zinc-300">Contest Progress</span>
                <span className="text-sm font-medium text-zinc-300">
                  {Math.round((userStats.solvedCount / userStats.totalProblems) * 100)}%
                </span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(userStats.solvedCount / userStats.totalProblems) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-zinc-800/70 backdrop-blur-sm rounded-3xl border border-zinc-700/50 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl">
              <Code2 className="w-6 h-6 text-zinc-100" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-100">Contest Problems</h2>
            <span className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">
              {contest.contestProblems.length} Problems
            </span>
          </div>

          {!contestStatus.isActive && contestStatus.status === 'Upcoming' ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-zinc-700/50 rounded-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">Contest Not Started</h3>
              <p className="text-zinc-400">
                Problems will be available when the contest starts at {formatDateTime(contest.startTime)}.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {contest.contestProblems.map((contestProblem) => {
                const difficultyConfig = getDifficultyConfig(contestProblem.difficulty);
                const isSolved = contestProblem.userStatus?.isAccepted;
                const hasSubmitted = contestProblem.userStatus?.hasSubmitted;
                const solveTime = contestProblem.userStatus?.solveTimeMinutes;

                return (
                  <div
                    key={contestProblem.id}
                    className={`group bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-md transition-all duration-300 p-6 border ${
                      isSolved
                        ? 'border-emerald-500/50 bg-emerald-900/10'
                        : hasSubmitted
                        ? 'border-yellow-500/50 bg-yellow-900/10'
                        : 'border-zinc-700/50'
                    } ${
                      contestStatus.isActive
                        ? 'hover:shadow-xl hover:scale-[1.02] hover:bg-zinc-700/80'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {contestStatus.isActive ? (
                      <Link
                        to={`/contests/${contest.slug}/problem/${contestProblem.slug}`}
                        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-xl font-bold text-lg transition-all duration-200 ${
                            isSolved
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-emerald-100'
                              : hasSubmitted
                              ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-yellow-100'
                              : 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 group-hover:from-purple-700 group-hover:to-purple-800 group-hover:text-purple-200'
                          }`}>
                            {isSolved ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : (
                              contestProblem.problemOrder || contestProblem.id.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className={`text-xl font-bold transition-colors duration-200 ${
                                isSolved
                                  ? 'text-emerald-300'
                                  : hasSubmitted
                                  ? 'text-yellow-300'
                                  : 'text-zinc-100 group-hover:text-purple-400'
                              }`}>
                                {contestProblem.title}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-bold border ${difficultyConfig.color} flex items-center gap-1`}
                              >
                                <span>{difficultyConfig.icon}</span>
                                {contestProblem.difficulty}
                              </span>
                              {isSolved && (
                                <span className="bg-emerald-600 text-emerald-100 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  SOLVED
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-400" />
                                <span className="font-medium">Points:</span>
                                <span className="font-bold text-yellow-300">{contestProblem.points}</span>
                                {/* {isSolved && (
                                  <span className="text-emerald-300 font-bold">
                                    (+{contestProblem.userStatus.points})
                                  </span>
                                )} */}
                              </div>

                              {isSolved && solveTime && (
                                <div className="flex items-center gap-2">
                                  <Timer className="w-4 h-4 text-cyan-400" />
                                  <span className="font-medium">Solved in:</span>
                                  <span className="font-bold text-cyan-300">
                                    {formatTime(solveTime)}
                                  </span>
                                </div>
                              )}

                              {contestProblem.isVisible ? (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  <span className="font-bold text-green-300">Available</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-orange-400" />
                                  <span className="font-bold text-orange-300">
                                    {contestProblem.releaseTime
                                      ? `Available at ${new Date(contestProblem.releaseTime).toLocaleTimeString()}`
                                      : 'Not yet available'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`px-4 py-2 rounded-xl font-bold text-lg flex items-center gap-2 shadow-md ${
                            isSolved
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-emerald-200'
                              : 'bg-gradient-to-r from-yellow-600 to-yellow-800 text-yellow-200'
                          }`}>
                            <Trophy className="w-5 h-5" />
                            {contestProblem.points} pts
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-xl font-bold text-zinc-100">
                            {contestProblem.problemOrder || contestProblem.id.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-zinc-100">{contestProblem.title}</h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-bold border ${difficultyConfig.color} flex items-center gap-1`}
                              >
                                <span>{difficultyConfig.icon}</span>
                                {contestProblem.difficulty}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-400" />
                                <span className="font-medium">Points:</span>
                                <span className="font-bold text-yellow-300">{contestProblem.points}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-400" />
                                <span className="font-bold text-orange-300">Locked until contest starts</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 text-yellow-200 px-4 py-2 rounded-xl font-bold text-lg flex items-center gap-2 shadow-md">
                            <Trophy className="w-5 h-5" />
                            {contestProblem.points} pts
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {contest.contestProblems.length > 0 && contestStatus.isActive && (
            <div className="mt-8 text-center">
              <Link
                to={`/contests/${contest.slug}/leaderboard`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-zinc-100 font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Trophy className="w-5 h-5" />
                View Leaderboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContestDetailComponent;
