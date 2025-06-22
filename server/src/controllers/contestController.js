const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const {
  submitContestSolution,
  getContestLeaderboardData,
  getContestRank
} = require('./submissionController');

// Helper function to calculate user contest statistics
const calculateUserContestStats = async (contestId, userId, contestStartTime) => {
  const userSubmissions = await prisma.contestSubmission.findMany({
    where: {
      contestId,
      userId,
      status: 'ACCEPTED'
    },
    include: {
      contestProblem: {
        select: { points: true, id: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  if (userSubmissions.length === 0) {
    return {
      totalPoints: 0,
      totalTime: 0,
      problemsSolved: 0,
      totalPenalty: 0
    };
  }

  // Group by problem to get first accepted submission for each
  const problemSolutions = {};
  userSubmissions.forEach(submission => {
    const problemId = submission.contestProblemId;
    if (!problemSolutions[problemId]) {
      problemSolutions[problemId] = submission;
    }
  });

  let totalPoints = 0;
  let totalTime = 0;
  let problemsSolved = Object.keys(problemSolutions).length;

  // Calculate penalty for wrong submissions before acceptance
  let totalPenalty = 0;

  for (const [problemId, acceptedSubmission] of Object.entries(problemSolutions)) {
    totalPoints += acceptedSubmission.contestProblem.points;

    // Calculate solve time in minutes
    const solveTime = Math.max(1, Math.round(
      (new Date(acceptedSubmission.createdAt).getTime() - contestStartTime.getTime()) / (1000 * 60)
    ));
    totalTime += solveTime;

    // Count wrong submissions before this accepted one for penalty
    const wrongSubmissions = await prisma.contestSubmission.count({
      where: {
        contestId,
        userId,
        contestProblemId: problemId,
        status: { not: 'ACCEPTED' },
        createdAt: { lt: acceptedSubmission.createdAt }
      }
    });

    totalPenalty += wrongSubmissions * 20; // 20 minutes penalty per wrong submission
  }

  return {
    totalPoints,
    totalTime,
    problemsSolved,
    totalPenalty
  };
};

// Function to update/create contest rank in database
const updateContestRankInDB = async (contestId, userId) => {
  try {
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { startTime: true }
    });

    if (!contest) return;

    const stats = await calculateUserContestStats(contestId, userId, contest.startTime);

    // Upsert contest rank
    await prisma.contestRank.upsert({
      where: {
        contestId_userId: {
          contestId,
          userId
        }
      },
      update: {
        totalPoints: stats.totalPoints,
        totalTime: stats.totalTime,
        problemsSolved: stats.problemsSolved,
        totalPenalty: stats.totalPenalty,
        updatedAt: new Date()
      },
      create: {
        contestId,
        userId,
        totalPoints: stats.totalPoints,
        totalTime: stats.totalTime,
        problemsSolved: stats.problemsSolved,
        totalPenalty: stats.totalPenalty,
        rank: 0 // Will be calculated later
      }
    });

    // Recalculate ranks for all participants
    await recalculateContestRanks(contestId);

  } catch (error) {
    console.error('Error updating contest rank in DB:', error);
  }
};

// Function to recalculate ranks based on scoring system
const recalculateContestRanks = async (contestId) => {
  try {
    // Get all contest ranks sorted by score
    const contestRanks = await prisma.contestRank.findMany({
      where: { contestId },
      orderBy: [
        { totalPoints: 'desc' },    // Higher points first
        { totalTime: 'asc' },       // Lower time second
        { totalPenalty: 'asc' }     // Lower penalty third
      ]
    });

    // Update ranks
    for (let i = 0; i < contestRanks.length; i++) {
      await prisma.contestRank.update({
        where: { id: contestRanks[i].id },
        data: { rank: i + 1 }
      });
    }
  } catch (error) {
    console.error('Error recalculating contest ranks:', error);
  }
};

// Enhanced function to get leaderboard with both Redis and DB data
const getEnhancedLeaderboard = async (contestId, limit = 50) => {
  try {
    // Get from database with user details
    const dbLeaderboard = await prisma.contestRank.findMany({
      where: { contestId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { rank: 'asc' }
      ],
      take: limit
    });

    // Try to get Redis data as well for comparison/backup
    let redisLeaderboard = [];
    try {
      redisLeaderboard = await getContestLeaderboardData(contestId, limit);
    } catch (error) {
      console.warn('Redis leaderboard unavailable, using DB only:', error.message);
    }

    return {
      leaderboard: dbLeaderboard.map(entry => ({
        rank: entry.rank,
        userId: entry.userId,
        user: entry.user,
        totalPoints: entry.totalPoints,
        totalTime: entry.totalTime,
        problemsSolved: entry.problemsSolved,
        totalPenalty: entry.totalPenalty,
        lastUpdated: entry.updatedAt
      })),
      source: 'database',
      redisBackup: redisLeaderboard
    };
  } catch (error) {
    console.error('Error getting enhanced leaderboard:', error);
    // Fallback to Redis only
    const redisLeaderboard = await getContestLeaderboardData(contestId, limit);
    return {
      leaderboard: redisLeaderboard,
      source: 'redis_fallback',
      redisBackup: []
    };
  }
};

const getAllContests = async (req, res) => {
  try {
    const contests = await prisma.contest.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        startTime: true,
        endTime: true,
        isActive: true,
        _count: {
          select: {
            contestProblems: true,
            submissions: true,
            ranks: true // Include participant count
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });
    res.json({ success: true, data: contests });
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contests' });
  }
};

const getContestBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    const contest = await prisma.contest.findUnique({
      where: { slug },
      include: {
        contestProblems: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            difficulty: true,
            points: true,
            problemOrder: true,
            isVisible: true,
            releaseTime: true,
            timeLimit: true,
            memoryLimit: true
          },
          orderBy: { problemOrder: 'asc' }
        },
        _count: {
          select: {
            submissions: true,
            ranks: true
          }
        }
      }
    });

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    const now = new Date();
    const contestStart = new Date(contest.startTime);
    const contestEnd = new Date(contest.endTime);

    if (now < contestStart) {
      return res.status(403).json({
        success: false,
        message: 'Contest is not currently accessible',
        data: { startTime: contest.startTime, endTime: contest.endTime }
      });
    }

    let userSubmissionStatus = {};
    let userContestStats = null;

    if (userId) {
      // Get user submissions
      const userSubmissions = await prisma.contestSubmission.findMany({
        where: { userId, contestId: contest.id },
        select: { contestProblemId: true, status: true, points: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      });

      // Group submissions by problemId and get best submission for each
      const submissionsByProblem = userSubmissions.reduce((acc, submission) => {
        const problemId = submission.contestProblemId;
        if (!acc[problemId]) acc[problemId] = [];
        acc[problemId].push(submission);
        return acc;
      }, {});

      // Process status for each problem
      userSubmissionStatus = Object.keys(submissionsByProblem).reduce((acc, problemId) => {
        const submissions = submissionsByProblem[problemId];
        const acceptedSubmission = submissions.find(s => s.status === 'ACCEPTED');
        const bestSubmission = acceptedSubmission || submissions[submissions.length - 1];

        let solveTimeMinutes = null;
        if (acceptedSubmission) {
          const submissionTime = new Date(acceptedSubmission.createdAt);
          const timeDiffMs = submissionTime.getTime() - contestStart.getTime();
          solveTimeMinutes = Math.max(1, Math.round(timeDiffMs / (1000 * 60)));
        }

        acc[problemId] = {
          status: bestSubmission.status,
          points: bestSubmission.points || 0,
          isAccepted: bestSubmission.status === 'ACCEPTED',
          hasSubmitted: true,
          solveTimeMinutes
        };
        return acc;
      }, {});

      // Get user's contest stats from database first, fallback to Redis
      try {
        const userRank = await prisma.contestRank.findUnique({
          where: {
            contestId_userId: {
              contestId: contest.id,
              userId
            }
          }
        });

        if (userRank) {
          userContestStats = {
            rank: userRank.rank,
            totalPoints: userRank.totalPoints,
            totalProblemsAttempted: Object.keys(userSubmissionStatus).length,
            totalProblemsSolved: userRank.problemsSolved,
            totalTime: userRank.totalTime,
            totalPenalty: userRank.totalPenalty
          };
        } else {
          // Fallback to Redis
          const redisRank = await getContestRank(contest.id, userId);
          userContestStats = {
            rank: redisRank,
            totalProblemsAttempted: Object.keys(userSubmissionStatus).length,
            totalProblemsSolved: Object.values(userSubmissionStatus).filter(s => s.isAccepted).length
          };
        }
      } catch (error) {
        console.error('Error fetching user contest stats:', error);
        userContestStats = {
          rank: null,
          totalProblemsAttempted: 0,
          totalProblemsSolved: 0,
          totalPoints: 0,
          totalTime: 0,
          totalPenalty: 0
        };
      }
    }

    const problemsWithStatus = contest.contestProblems.map(problem => ({
      ...problem,
      userStatus: userSubmissionStatus[problem.id] || {
        status: null,
        points: 0,
        isAccepted: false,
        hasSubmitted: false,
        solveTimeMinutes: null
      }
    }));

    res.json({
      success: true,
      data: {
        ...contest,
        contestProblems: problemsWithStatus,
        userContestStats
      }
    });
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contest' });
  }
};

const getContestLeaderboard = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const userId = req.user?.id;

    const contest = await prisma.contest.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        isActive: true
      }
    });

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    // Get enhanced leaderboard (DB + Redis)
    const leaderboardData = await getEnhancedLeaderboard(contest.id, limit);

    // Get current user's rank from database
    let userRank = null;
    if (userId) {
      try {
        const userRankData = await prisma.contestRank.findUnique({
          where: {
            contestId_userId: {
              contestId: contest.id,
              userId
            }
          }
        });
        userRank = userRankData ? userRankData.rank : null;

        // Fallback to Redis if not in DB
        if (!userRank) {
          userRank = await getContestRank(contest.id, userId);
        }
      } catch (error) {
        console.error('Error fetching user rank:', error);
      }
    }

    // Get total participants count from database
    const totalParticipants = await prisma.contestRank.count({
      where: { contestId: contest.id }
    });

    res.json({
      success: true,
      data: {
        contest: {
          id: contest.id,
          title: contest.title,
          startTime: contest.startTime,
          endTime: contest.endTime,
          isActive: contest.isActive
        },
        leaderboard: leaderboardData.leaderboard,
        userRank,
        totalParticipants,
        lastUpdated: Date.now(),
        dataSource: leaderboardData.source
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
};

// Enhanced submit function that also updates database
const submitContestSolutionEnhanced = async (req, res) => {
  try {
    // Call the original submit function
    const result = await submitContestSolution(req, res);

    // If submission was successful, update database leaderboard
    if (result && result.success !== false) {
      const { contestSlug } = req.params;
      const userId = req.user?.id;

      if (userId && contestSlug) {
        const contest = await prisma.contest.findUnique({
          where: { slug: contestSlug },
          select: { id: true }
        });

        if (contest) {
          // Update leaderboard in background (don't wait)
          updateContestRankInDB(contest.id, userId).catch(console.error);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error in enhanced submit:', error);
    throw error;
  }
};

const getProblemBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const problem = await prisma.problem.findUnique({
      where: { slug },
      include: {
        testCases: {
          where: { isPublic: true },
          select: { id: true, input: true, expectedOutput: true }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    let tags = [];
    if (problem.tags) {
      try {
        tags = JSON.parse(problem.tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    res.json({ success: true, data: { ...problem, tags } });
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch problem' });
  }
};

const getContestProblemBySlug = async (req, res) => {
  try {
    const { contestSlug, problemSlug } = req.params;
    const userId = req.user?.id;

    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      select: { id: true, title: true, startTime: true, endTime: true, isActive: true }
    });

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    const now = new Date();
    const contestStart = new Date(contest.startTime);
    const contestEnd = new Date(contest.endTime);

    if (now < contestStart || now > contestEnd || !contest.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Contest is not currently active',
        data: { startTime: contest.startTime, endTime: contest.endTime }
      });
    }

    const problem = await prisma.contestProblem.findFirst({
      where: { slug: problemSlug, contestId: contest.id },
      include: {
        testCases: {
          where: { isPublic: true },
          select: { id: true, input: true, expectedOutput: true, isPublic: true, points: true }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Contest problem not found' });
    }

    if (!problem.isVisible || (problem.releaseTime && now < new Date(problem.releaseTime))) {
      return res.status(403).json({
        success: false,
        message: 'Problem is not currently accessible',
        data: { releaseTime: problem.releaseTime }
      });
    }

    let userSubmissions = [];
    let userStatus = null;

    if (userId) {
      userSubmissions = await prisma.contestSubmission.findMany({
        where: { userId, contestId: contest.id, contestProblemId: problem.id },
        select: {
          id: true,
          status: true,
          points: true,
          runtime: true,
          passedTests: true,
          totalTests: true,
          attempts: true,
          createdAt: true,
          language: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (userSubmissions.length > 0) {
        const acceptedSubmission = userSubmissions.find(s => s.status === 'ACCEPTED');
        const bestSubmission = acceptedSubmission || userSubmissions[0];

        let solveTimeMinutes = null;
        if (acceptedSubmission) {
          const submissionTime = new Date(acceptedSubmission.createdAt);
          const timeDiffMs = submissionTime.getTime() - contestStart.getTime();
          solveTimeMinutes = Math.max(1, Math.round(timeDiffMs / (1000 * 60)));
        }

        userStatus = {
          status: bestSubmission.status,
          points: bestSubmission.points || 0,
          hasSubmitted: true,
          isAccepted: bestSubmission.status === 'ACCEPTED',
          totalAttempts: userSubmissions.length,
          bestPoints: Math.max(...userSubmissions.map(s => s.points || 0)),
          solveTimeMinutes
        };
      } else {
        userStatus = {
          status: null,
          points: 0,
          hasSubmitted: false,
          isAccepted: false,
          totalAttempts: 0,
          bestPoints: 0,
          solveTimeMinutes: null
        };
      }
    }

    let tags = [];
    if (problem.tags) {
      try {
        tags = JSON.parse(problem.tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    res.json({
      success: true,
      data: {
        ...problem,
        tags,
        contest: { id: contest.id, title: contest.title, slug: contestSlug },
        userStatus,
        userSubmissions
      }
    });
  } catch (error) {
    console.error('Error fetching contest problem:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contest problem' });
  }
};

const getContestSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const submission = await prisma.contestSubmission.findFirst({
      where: { id: submissionId, userId },
      include: {
        contestProblem: { select: { title: true, points: true, contestId: true } },
        language: { select: { name: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Contest submission not found' });
    }

    // Update leaderboard after getting submission status (for accepted submissions)
    if (submission.status === 'ACCEPTED') {
      updateContestRankInDB(submission.contestProblem.contestId, userId).catch(console.error);
    }

    let detailedResults = [];
    if (submission.testCaseResults) {
      try {
        detailedResults = JSON.parse(submission.testCaseResults);
      } catch (e) {
        console.error('Error parsing test case results:', e);
      }
    }

    const results = detailedResults.map((result, index) => ({
      testCase: index + 1,
      passed: result.passed,
      isPublic: result.isPublic,
      input: result.input,
      expectedOutput: result.expectedOutput,
      actualOutput: result.actualOutput,
      runtime: result.runtime,
      memory: result.memory,
      statusDescription: result.statusDescription,
      stderr: result.stderr,
      points: result.points
    }));

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: submission.status,
        points: submission.points,
        runtime: submission.runtime,
        memory: submission.memory,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
        results,
        errorMessage: submission.errorMessage,
        createdAt: submission.createdAt,
        language: submission.language,
        contestProblem: submission.contestProblem
      }
    });
  } catch (error) {
    console.error('Get contest submission status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getUserContestSubmissions = async (req, res) => {
  try {
    const { contestSlug, problemSlug } = req.params;
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const contest = await prisma.contest.findUnique({
      where: { slug: contestSlug },
      select: { id: true, startTime: true }
    });

    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }

    const problem = await prisma.contestProblem.findFirst({
      where: { slug: problemSlug, contestId: contest.id },
      select: { id: true }
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Contest problem not found' });
    }

    const submissions = await prisma.contestSubmission.findMany({
      where: { contestId: contest.id, contestProblemId: problem.id, userId },
      select: {
        id: true,
        status: true,
        code: true,
        points: true,
        runtime: true,
        memory: true,
        passedTests: true,
        totalTests: true,
        attempts: true,
        createdAt: true,
        language: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const contestStart = new Date(contest.startTime);
    const submissionsWithSolveTime = submissions.map(submission => {
      let solveTimeMinutes = null;
      if (submission.status === 'ACCEPTED') {
        const submissionTime = new Date(submission.createdAt);
        const timeDiffMs = submissionTime.getTime() - contestStart.getTime();
        solveTimeMinutes = Math.max(1, Math.round(timeDiffMs / (1000 * 60)));
      }
      return { ...submission, solveTimeMinutes };
    });

    const totalSubmissions = await prisma.contestSubmission.count({
      where: { contestId: contest.id, contestProblemId: problem.id, userId }
    });

    res.json({
      success: true,
      data: {
        submissions: submissionsWithSolveTime,
        pagination: { page, limit, total: totalSubmissions, pages: Math.ceil(totalSubmissions / limit) }
      }
    });
  } catch (error) {
    console.error('Get user contest submissions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Utility function to sync Redis leaderboard to database (can be called periodically)
const syncLeaderboardToDatabase = async (contestId) => {
  try {
    console.log(`Syncing leaderboard for contest ${contestId}...`);

    // Get all users who have submissions in this contest
    const contestUsers = await prisma.contestSubmission.findMany({
      where: { contestId },
      select: { userId: true },
      distinct: ['userId']
    });

    // Update each user's rank in database
    for (const { userId } of contestUsers) {
      await updateContestRankInDB(contestId, userId);
    }

    console.log(`Leaderboard sync completed for contest ${contestId}`);
  } catch (error) {
    console.error('Error syncing leaderboard to database:', error);
  }
};

// Function to finalize contest (store final ranks)
const finalizeContest = async (contestId) => {
  try {
    console.log(`Finalizing contest ${contestId}...`);

    // Sync final leaderboard state
    await syncLeaderboardToDatabase(contestId);

    // Mark contest as inactive
    await prisma.contest.update({
      where: { id: contestId },
      data: { isActive: false }
    });

    console.log(`Contest ${contestId} finalized successfully`);
  } catch (error) {
    console.error('Error finalizing contest:', error);
  }
};

module.exports = {
  getAllContests,
  getContestBySlug,
  getContestLeaderboard,
  getProblemBySlug,
  getContestProblemBySlug,
  submitContestSolution: submitContestSolutionEnhanced,
  getContestSubmissionStatus,
  getUserContestSubmissions,
  // New utility functions
  updateContestRankInDB,
  syncLeaderboardToDatabase,
  finalizeContest,
  getEnhancedLeaderboard,
  recalculateContestRanks
};
