import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Medal, Award, Clock, User, Target } from 'lucide-react';

const ContestLeaderboard = () => {
  const { slug: contestSlug } = useParams(); // Extract slug from URL params
  const [leaderboard, setLeaderboard] = useState([]);
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    if (contestSlug) {
      fetchLeaderboard();
    }
  }, [contestSlug]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/contests/${contestSlug}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      if (data.success) {
        setLeaderboard(data.data.leaderboard);
        setContest(data.data.contest);
        setUserRank(data.data.userRank);
      } else {
        throw new Error(data.message || 'Failed to fetch leaderboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">#{rank}</span>;
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRowClassName = (rank, userId) => {
    let baseClass = "border-b border-gray-200 hover:bg-gray-50 transition-colors";

    if (rank <= 3) {
      baseClass += " bg-gradient-to-r";
      if (rank === 1) baseClass += " from-yellow-50 to-yellow-100";
      else if (rank === 2) baseClass += " from-gray-50 to-gray-100";
      else baseClass += " from-amber-50 to-amber-100";
    }

    return baseClass;
  };

  // Handle case when contestSlug is not available
  if (!contestSlug) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600">Contest not found</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading leaderboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-2">Error loading leaderboard</div>
        <div className="text-red-500 text-sm">{error}</div>
        <button
          onClick={fetchLeaderboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Contest Leaderboard</h2>
            {contest && (
              <p className="text-blue-100">{contest.title}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Total Participants</div>
            <div className="text-xl font-bold">{leaderboard.length}</div>
          </div>
        </div>

        {userRank && (
          <div className="mt-4 bg-white/10 rounded-lg p-3">
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-2" />
              Your Rank: <span className="font-bold ml-1">#{userRank}</span>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  Points
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Problems Solved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Time
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard.map((participant, index) => (
              <tr key={participant.user.id} className={getRowClassName(participant.rank, participant.user.id)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getRankIcon(participant.rank)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {participant.user.avatar ? (
                      <img
                        className="h-10 w-10 rounded-full mr-3"
                        src={participant.user.avatar}
                        alt={participant.user.username}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {participant.user.name || participant.user.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{participant.user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-lg font-bold text-gray-900">
                    {participant.totalPoints}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {participant.problemsSolved}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(participant.totalTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {leaderboard.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
          <p className="text-gray-500">Be the first to submit a solution!</p>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleTimeString()}
        <button
          onClick={fetchLeaderboard}
          className="ml-4 text-blue-600 hover:text-blue-800 font-medium"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default ContestLeaderboard;
