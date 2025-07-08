const { PrismaClient } = require('../generated/prisma');
const LeaderboardService = require('../services/leaderboardService');

const prisma = new PrismaClient();
const leaderboardService = new LeaderboardService();

// Get contest leaderboard
const getContestLeaderboard = async (req, res) => {
  try {
    const { contestSlug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      select: { id: true, title: true }
    });

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    const leaderboard = await leaderboardService.getLeaderboard(contest.id, page, limit);
    const totalParticipants = await leaderboardService.getTotalParticipants(contest.id);

    // Get user details for leaderboard
    const userIds = leaderboard.map(entry => entry.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, avatar: true }
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    const leaderboardWithUsers = leaderboard.map(entry => ({
      ...entry,
      user: userMap[entry.userId] || { username: 'Unknown', name: 'Unknown User', avatar: null }
    }));

    res.json({
      success: true,
      data: {
        leaderboard: leaderboardWithUsers,
        pagination: {
          page,
          limit,
          total: totalParticipants,
          pages: Math.ceil(totalParticipants / limit)
        },
        contest: { id: contest.id, title: contest.title }
      }
    });
  } catch (error) {
    console.error('Get contest leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get user's position in leaderboard
const getUserLeaderboardPosition = async (req, res) => {
  try {
    const { contestSlug } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      select: { id: true, title: true }
    });

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    const userRank = await leaderboardService.getUserRank(contest.id, userId);
    const totalParticipants = await leaderboardService.getTotalParticipants(contest.id);

    res.json({
      success: true,
      data: {
        ...userRank,
        totalParticipants,
        contest: { id: contest.id, title: contest.title }
      }
    });
  } catch (error) {
    console.error('Get user leaderboard position error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getContestLeaderboard,
  getUserLeaderboardPosition
};
