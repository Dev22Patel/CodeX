const client = require('../redis/redisclient');
const socketManager = require('../websocket/socketManager');

class LeaderboardService {
  constructor() {
    this.client = client;
    this.prisma = require('../generated/prisma').PrismaClient;
    this.prismaClient = new this.prisma();
  }

  getLeaderboardKey(contestId) {
    return `leaderboard:contest:${contestId}`;
  }

  // Modified updateScore to emit WebSocket events
  async updateScore(contestId, userId, score) {
    const key = this.getLeaderboardKey(contestId);
    await this.client.zadd(key, score, userId);

    // Emit real-time updates
    await this.emitLeaderboardChanges(contestId, userId);
  }

  // New method to emit WebSocket events
  async emitLeaderboardChanges(contestId, updatedUserId) {
    try {
      // Get top 10 leaderboard with full user data
      const leaderboard = await this.getLeaderboard(contestId, 1, 10);

      // Get updated user's rank
      const userRank = await this.getUserRank(contestId, updatedUserId);

      // Emit updates
      socketManager.emitLeaderboardUpdate(contestId, leaderboard);
      socketManager.emitUserRankUpdate(contestId, updatedUserId, userRank);

      console.log(`Emitted leaderboard changes for contest ${contestId}, user ${updatedUserId}`);
    } catch (error) {
      console.error('Error emitting leaderboard changes:', error);
    }
  }

  // Updated to include user data
  async getLeaderboard(contestId, page = 1, limit = 10) {
    const key = this.getLeaderboardKey(contestId);
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const results = await this.client.zrevrange(key, start, end, 'WITHSCORES');

    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      const userId = results[i];
      const score = parseFloat(results[i + 1]);
      const rank = start + (i / 2) + 1;

      // Fetch user data
      const user = await this.prismaClient.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true
        }
      });

      // Count problems solved
      const problemsSolved = await this.prismaClient.contestSubmission.groupBy({
        by: ['contestProblemId'],
        where: {
          contestId,
          userId,
          status: 'ACCEPTED'
        },
        _count: {
          contestProblemId: true
        }
      }).then(groups => groups.length);

      leaderboard.push({
        userId,
        user: user || { id: userId, name: 'Unknown', username: 'unknown' },
        score,
        rank,
        problemsSolved
      });
    }

    return leaderboard;
  }

  async getUserRank(contestId, userId) {
    const key = this.getLeaderboardKey(contestId);
    const rank = await this.client.zrevrank(key, userId);
    const score = await this.client.zscore(key, userId);

    const problemsSolved = await this.prismaClient.contestSubmission.groupBy({
      by: ['contestProblemId'],
      where: {
        contestId,
        userId,
        status: 'ACCEPTED'
      },
      _count: {
        contestProblemId: true
      }
    }).then(groups => groups.length);

    return {
      userId,
      rank: rank !== null ? rank + 1 : null,
      score: score ? parseFloat(score) : 0,
      problemsSolved
    };
  }

  async getTotalParticipants(contestId) {
    const key = this.getLeaderboardKey(contestId);
    return await this.client.zcard(key);
  }

  async clearLeaderboard(contestId) {
    const key = this.getLeaderboardKey(contestId);
    await this.client.del(key);
  }
}

module.exports = LeaderboardService;
