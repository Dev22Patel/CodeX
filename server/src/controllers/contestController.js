const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Function to get all contests
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
            submissions: true
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

// Function to get contest by slug
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
            submissions: true
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
    let solvedCount = 0;

    if (userId) {
      // Get user submissions, grouped by problem to find best submission
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

      // Count unique solved problems
      solvedCount = Object.values(submissionsByProblem).filter(submissions =>
        submissions.some(s => s.status === 'ACCEPTED')
      ).length;
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
        solvedCount // Include solvedCount for clarity
      }
    });
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contest' });
  }
};

// Function to get contest problem by slug
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

// Function to get contest submission status
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

// Function to get user contest submissions
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

module.exports = {
  getAllContests,
  getContestBySlug,
  getContestProblemBySlug,
  getContestSubmissionStatus,
  getUserContestSubmissions
};
