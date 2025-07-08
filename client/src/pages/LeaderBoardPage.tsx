import { useState, useEffect, useCallback, useRef, type SetStateAction } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Award, User, Target, RefreshCw, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const ContestLeaderboard = () => {
  const { slug: contestSlug } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  interface UserRank {
    rank: number;
    score: number;
    problemsSolved: number;
  }

  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket handlers
  const handleLeaderboardUpdate = useCallback((data: any) => {
    console.log('Received leaderboard update:', data);
    if (data.leaderboard) {
      setLeaderboard(data.leaderboard);
    }
  }, []);

  const handleUserRankUpdate = useCallback((data: any) => {
    console.log('Received user rank update:', data);
    // Only update if this is for the current user
    const currentUserId = localStorage.getItem('userId'); // Assuming you store user ID
    if (data.userId === currentUserId) {
      setUserRank({
        rank: data.rank,
        score: data.score,
        problemsSolved: data.problemsSolved
      });
    }
  }, []);

  // Initialize WebSocket connection - moved to separate useEffect
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Initialize socket connection with authentication
    socketRef.current = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        token: token
      }
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);

      // Join contest room if contest is already loaded
      if (contest?.id) {
        socket.emit('join-contest', contest.id);
        console.log(`Joining contest room: ${contest.id}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Listen for leaderboard updates
    socket.on('leaderboard-update', handleLeaderboardUpdate);

    // Listen for user rank updates
    socket.on('user-rank-update', handleUserRankUpdate);

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
        console.log('Socket disconnected and cleaned up');
      }
    };
  }, [handleLeaderboardUpdate, handleUserRankUpdate]);

  // Join contest room when contest is loaded
  useEffect(() => {
    if (contest?.id && socketRef.current?.connected) {
      socketRef.current.emit('join-contest', contest.id);
      console.log(`Joining contest room: ${contest.id}`);
    }
  }, [contest?.id]);

  // Fetch initial data
  useEffect(() => {
    if (contestSlug) {
      fetchData();
    }
  }, [contestSlug]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchLeaderboard(),
        fetchUserRank()
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    const response = await fetch(`http://localhost:3000/api/leaderboard/contests/${contestSlug}/leaderboard`, {
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
      console.log('Fetched leaderboard:', data.data.leaderboard);
    } else {
      throw new Error(data.message || 'Failed to fetch leaderboard');
    }
  };

  const fetchUserRank = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/leaderboard/contests/${contestSlug}/leaderboard/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserRank(data.data);
        }
      }
    } catch (err) {
      console.log('Could not fetch user rank:', err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-gray-400 font-semibold text-sm">#{rank}</span>;
    }
  };

  // Rest of your component remains the same...
  if (!contestSlug) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="text-gray-300 font-medium">Contest not found</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="flex items-center text-gray-300">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-500 mr-2"></div>
          <span>Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <div className="text-gray-300 font-medium mb-2">Error loading leaderboard</div>
          <div className="text-gray-400 text-sm mb-4">{error}</div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="mr-4 p-2 text-gray-300 hover:text-gray-100 hover:bg-gray-700 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-gray-100">Contest Leaderboard</h1>
                {contest && (
                  <p className="text-gray-400 text-sm mt-1">{contest.title}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center text-sm">
                {isConnected ? (
                  <div className="flex items-center text-green-400">
                    <Wifi className="w-4 h-4 mr-1" />
                    <span className="text-xs">Live</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-400">
                    <WifiOff className="w-4 h-4 mr-1" />
                    <span className="text-xs">Offline</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Total Participants</div>
                <div className="text-xl font-semibold text-gray-100">{leaderboard.length}</div>
              </div>
            </div>
          </div>
          {userRank && (
            <div className="mt-4 bg-gray-700 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-300">
                <User className="w-4 h-4 mr-2" />
                <span>Your Position:</span>
                <span className="font-semibold ml-2 text-gray-100">#{userRank.rank}</span>
              </div>
              <div className="text-sm text-gray-300">
                <span>Points: <span className="font-semibold text-gray-100">{userRank.score}</span></span>
                <span className="ml-4">Problems Solved: <span className="font-semibold text-gray-100">{userRank.problemsSolved}</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-gray-300">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    Points
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Problems Solved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leaderboard.map((participant) => (
                <tr key={participant.userId} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getRankIcon(participant.rank)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-100">
                          {participant.user ? participant.user.name : `User ${participant.userId}`}
                        </div>
                        <div className="text-xs text-gray-400">
                          @{participant.user ? participant.user.username : `user${participant.userId}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-100">
                      {participant.score}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-100">
                      {participant.problemsSolved}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-100 mb-1">No participants yet</h3>
            <p className="text-gray-400 text-sm">Be the first to submit a solution!</p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-700 border-t border-gray-600 px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {isConnected ? 'Live updates enabled' : 'Offline mode'} • Last updated: {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-3 py-1 text-xs font-medium text-gray-300 hover:text-gray-100 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContestLeaderboard;
