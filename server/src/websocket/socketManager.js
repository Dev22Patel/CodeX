const { Server } = require('socket.io');
const jwt = require('jsonwebtoken'); // Add this for token verification

class SocketManager {
  constructor() {
    this.io = null;
    this.contestRooms = new Map(); // Track users in contest rooms
    this.userSockets = new Map(); // Track user socket mappings
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId || decoded.id;
        socket.user = decoded;

        // Track user-socket mapping
        this.userSockets.set(socket.userId, socket.id);

        next();
      } catch (err) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id, 'User ID:', socket.userId);

      // Join contest leaderboard room
      socket.on('join-contest', (contestId) => {
        const room = `contest-${contestId}`;
        socket.join(room);

        // Track user in contest room
        if (!this.contestRooms.has(contestId)) {
          this.contestRooms.set(contestId, new Set());
        }
        this.contestRooms.get(contestId).add(socket.userId);

        console.log(`User ${socket.userId} (socket: ${socket.id}) joined contest ${contestId}`);
      });

      // Leave contest leaderboard room
      socket.on('leave-contest', (contestId) => {
        const room = `contest-${contestId}`;
        socket.leave(room);

        // Remove user from contest room tracking
        if (this.contestRooms.has(contestId)) {
          this.contestRooms.get(contestId).delete(socket.userId);
        }

        console.log(`User ${socket.userId} (socket: ${socket.id}) left contest ${contestId}`);
      });

      socket.on('disconnect', () => {
        // Clean up user from all contest rooms
        this.contestRooms.forEach((users, contestId) => {
          users.delete(socket.userId);
        });

        // Remove user-socket mapping
        this.userSockets.delete(socket.userId);

        console.log('User disconnected:', socket.id, 'User ID:', socket.userId);
      });
    });
  }

  // Emit leaderboard update to all users in a contest
  emitLeaderboardUpdate(contestId, leaderboardData) {
    const room = `contest-${contestId}`;
    this.io.to(room).emit('leaderboard-update', {
      contestId,
      leaderboard: leaderboardData,
      timestamp: new Date().toISOString()
    });
    console.log(`Emitted leaderboard update for contest ${contestId} to room ${room}`);
  }

  // Emit user rank change to all users in contest
  emitUserRankUpdate(contestId, userId, rankData) {
    const room = `contest-${contestId}`;
    this.io.to(room).emit('user-rank-update', {
      contestId,
      userId,
      ...rankData,
      timestamp: new Date().toISOString()
    });
    console.log(`Emitted user rank update for user ${userId} in contest ${contestId}`);
  }

  // Get active users count in a contest
  getActiveUsersCount(contestId) {
    return this.contestRooms.get(contestId)?.size || 0;
  }

  // Get all connected users in a contest
  getActiveUsers(contestId) {
    return Array.from(this.contestRooms.get(contestId) || []);
  }
}

module.exports = new SocketManager();
