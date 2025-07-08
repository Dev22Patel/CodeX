const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { processSubmission } = require('../services/submissionServices');
const { processContestSubmission } = require('../services/contestSubmissionService');

// Function to submit a contest solution
const submitContestSolution = async (req, res) => {
  try {
    const { contestSlug, problemSlug } = req.params;
    const { code, languageId } = req.body;
    const userId = req.user.id;

    console.log(`Contest submission request: contestSlug=${contestSlug}, problemSlug=${problemSlug}, userId=${userId}`);

    if (!code || !languageId) {
      return res.status(400).json({ success: false, message: 'Code and language are required' });
    }

    if (!contestSlug) {
      return res.status(400).json({ success: false, message: 'Contest slug is required' });
    }

    // Find contest problem by slug
    const contestProblem = await prisma.contestProblem.findFirst({
      where: {
        slug: problemSlug,
        contest: {
          slug: contestSlug
        }
      },
      include: {
        contest: { select: { id: true, title: true, startTime: true, endTime: true, isActive: true } }
      }
    });

    if (!contestProblem) {
      console.error(`Contest problem not found: contestSlug=${contestSlug}, problemSlug=${problemSlug}`);
      return res.status(404).json({ success: false, message: 'Contest problem not found' });
    }

    const now = new Date();
    if (
      !contestProblem.contest.isActive ||
      now < new Date(contestProblem.contest.startTime) ||
      now > new Date(contestProblem.contest.endTime)
    ) {
      return res.status(403).json({ success: false, message: 'Contest is not currently active' });
    }

    if (!contestProblem.isVisible || (contestProblem.releaseTime && now < new Date(contestProblem.releaseTime))) {
      return res.status(403).json({ success: false, message: 'Problem is not currently accessible' });
    }

    const language = await prisma.language.findUnique({ where: { id: languageId } });
    if (!language) {
      return res.status(400).json({ success: false, message: 'Invalid language' });
    }

    const submission = await prisma.contestSubmission.create({
      data: {
        code,
        userId,
        contestId: contestProblem.contest.id,
        contestProblemId: contestProblem.id,
        languageId,
        status: 'PENDING',
        points: 0
      }
    });

    console.log(`Created contest submission ${submission.id} for problem ${contestProblem.title}`);

    process.nextTick(() => {
      processContestSubmission(submission.id, code, language, contestProblem.id, contestProblem.timeLimit)
        .catch(error => console.error('Async contest processing error:', error));
    });

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: 'PENDING',
        contestProblemId: contestProblem.id,
        problemTitle: contestProblem.title
      }
    });
  } catch (error) {
    console.error('Submit contest solution error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Function to get submission status
const getSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, userId },
      include: {
        problem: { select: { title: true, testCases: { select: { id: true, isPublic: true } } } }
      }
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    let detailedResults = [];
    if (submission.testCaseResults) {
      try {
        detailedResults = JSON.parse(submission.testCaseResults);
      } catch (e) {
        console.error('Error parsing test case results:', e);
      }
    }

    const results = submission.problem.testCases.map((testCase, index) => {
      const detailedResult = detailedResults.find(r => r.testCaseIndex === index);
      return {
        testCase: index + 1,
        passed: index < submission.passedTests,
        isPublic: testCase.isPublic,
        ...(detailedResult && {
          input: detailedResult.input,
          expectedOutput: detailedResult.expectedOutput,
          actualOutput: detailedResult.actualOutput,
          runtime: detailedResult.runtime,
          memory: detailedResult.memory,
          statusDescription: detailedResult.statusDescription,
          stderr: detailedResult.stderr
        })
      };
    });

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: submission.status,
        score: submission.score,
        runtime: submission.runtime,
        memory: submission.memory,
        passedTests: submission.passedTests,
        totalTests: submission.totalTests,
        results,
        errorMessage: submission.errorMessage,
        createdAt: submission.createdAt
      }
    });
  } catch (error) {
    console.error('Get submission status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Function to get contest submission status
const getContestSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

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

// Function to submit a solution
const submitSolution = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, languageId } = req.body;
    const userId = req.user.id;

    if (!code || !languageId) {
      return res.status(400).json({ success: false, message: 'Code and language are required' });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { testCases: true }
    });

    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }

    const language = await prisma.language.findUnique({ where: { id: languageId } });
    if (!language) {
      return res.status(400).json({ success: false, message: 'Invalid language' });
    }

    const submission = await prisma.submission.create({
      data: {
        code,
        userId,
        problemId,
        languageId,
        status: 'PENDING',
        totalTests: problem.testCases.length
      }
    });

    process.nextTick(() => {
      processSubmission(submission.id, code, language, problem.testCases, problem.timeLimit)
        .catch(error => console.error('Async processing error:', error));
    });

    res.json({ success: true, data: { submissionId: submission.id, status: 'PENDING' } });
  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Function to get user submissions
const getUserSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const submissions = await prisma.submission.findMany({
      where: { problemId, userId },
      select: {
        id: true,
        status: true,
        code: true,
        score: true,
        runtime: true,
        memory: true,
        passedTests: true,
        totalTests: true,
        createdAt: true,
        language: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    const totalSubmissions = await prisma.submission.count({ where: { problemId, userId } });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: { page, limit, total: totalSubmissions, pages: Math.ceil(totalSubmissions / limit) }
      }
    });
  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  submitSolution,
  getSubmissionStatus,
  getUserSubmissions,
  submitContestSolution,
  getContestSubmissionStatus
};
