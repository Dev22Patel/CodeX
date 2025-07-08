// Modified contest submission service to trigger WebSocket updates
const { PrismaClient } = require('../generated/prisma');
const axios = require('axios');
const LeaderboardService = require('../services/leaderboardService');
const ScoreCalculator = require('../services/scoreCalculatorService');

const prisma = new PrismaClient();
const leaderboardService = new LeaderboardService();
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = '5ce3fab409mshcc0ab3ef1b4bacap156916jsn8464c2d8f747';

const processContestSubmission = async (submissionId, code, language, contestProblemId, timeLimit) => {
  console.log(`Processing contest submission ${submissionId} for contestProblemId ${contestProblemId}`);
  try {
    const submission = await prisma.contestSubmission.findUnique({
      where: { id: submissionId },
      select: { contestProblemId: true, contestId: true, userId: true, createdAt: true }
    });

    if (!submission) throw new Error('Contest submission not found');
    if (submission.contestProblemId !== contestProblemId) throw new Error('Contest problem ID mismatch');

    const contestProblem = await prisma.contestProblem.findUnique({
      where: { id: contestProblemId },
      include: {
        testCases: { orderBy: { createdAt: 'asc' } },
        contest: {
          select: {
            id: true,
            startTime: true
          }
        }
      }
    });

    if (!contestProblem) throw new Error(`Contest problem not found for ID: ${contestProblemId}`);
    if (!contestProblem.testCases?.length) throw new Error(`No test cases found for contest problem ${contestProblemId}`);

    // Get user's previous attempts for this problem (count all attempts including current)
    const previousAttempts = await prisma.contestSubmission.count({
      where: {
        contestId: submission.contestId,
        userId: submission.userId,
        contestProblemId: contestProblemId,
        id: { lte: submissionId }
      }
    });

    // Get user's failed attempts for this problem (excluding current submission)
    const failedAttempts = await prisma.contestSubmission.count({
      where: {
        contestId: submission.contestId,
        userId: submission.userId,
        contestProblemId: contestProblemId,
        id: { lt: submissionId },
        status: { notIn: ['ACCEPTED', 'PENDING'] }
      }
    });

    let passedTests = 0;
    let totalTests = contestProblem.testCases.length;
    let status = 'ACCEPTED';
    let maxRuntime = 0;
    let errorMessage = null;
    let testCaseResults = [];

    const batchData = contestProblem.testCases.map((testCase, index) => ({
      source_code: Buffer.from(code).toString('base64'),
      language_id: language.judge0Id,
      stdin: Buffer.from(testCase.input).toString('base64'),
      expected_output: Buffer.from(testCase.expectedOutput.trim()).toString('base64'),
      cpu_time_limit: (testCase.timeLimit || timeLimit || 1000) / 1000,
      memory_limit: (testCase.memoryLimit || contestProblem.memoryLimit || 256) * 1024,
      testCaseIndex: index,
      testCaseId: testCase.id
    }));

    const headers = {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': JUDGE0_API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    };

    const batchResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`,
      { submissions: batchData },
      { headers, timeout: 30000 }
    );

    const tokens = batchResponse.data.map(result => result.token);
    let results = [];
    let attempts = 0;
    const maxAttempts = 30;
    const pollInterval = 1000;

    while (attempts < maxAttempts) {
      const batchResultResponse = await axios.get(
        `${JUDGE0_API_URL}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=true`,
        { headers, timeout: 30000 }
      );
      results = batchResultResponse.data.submissions;
      if (results.every(result => result.status?.id !== 1 && result.status?.id !== 2)) break;
      attempts++;
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    if (attempts >= maxAttempts) throw new Error('Timeout waiting for batch results');

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const testCase = contestProblem.testCases[i];
      const actualOutput = result.stdout ? Buffer.from(result.stdout, 'base64').toString('utf-8').trim() : '';
      const expectedOutput = testCase.expectedOutput.trim();
      const stderr = result.stderr ? Buffer.from(result.stderr, 'base64').toString('utf-8') : null;
      const compileOutput = result.compile_output ? Buffer.from(result.compile_output, 'base64').toString('utf-8') : null;

      if (result.time) maxRuntime = Math.max(maxRuntime, parseFloat(result.time) * 1000);

      const testPassed = result.status?.id === 3;
      if (testPassed) passedTests++;

      const testCaseResult = {
        testCaseIndex: i,
        testCaseId: testCase.id,
        passed: testPassed,
        input: testCase.input,
        expectedOutput,
        actualOutput,
        runtime: result.time ? parseFloat(result.time) * 1000 : 0,
        memory: result.memory ? parseInt(result.memory) : 0,
        statusId: result.status?.id || 0,
        statusDescription: result.status?.description || 'Unknown',
        stderr,
        compileOutput,
        isPublic: testCase.isPublic || false,
        points: testCase.points || 0
      };
      testCaseResults.push(testCaseResult);

      if (!testPassed && status === 'ACCEPTED') {
        switch (result.status?.id) {
          case 4: status = 'WRONG_ANSWER'; break;
          case 5: status = 'TLE'; break;
          case 6: status = 'CE'; errorMessage = compileOutput || 'Compilation error'; break;
          case 7: case 8: case 9: case 10: case 11: case 12: status = 'RE'; errorMessage = stderr || 'Runtime error'; break;
          case 13: case 14: status = 'RE'; errorMessage = 'System error occurred'; break;
          default: status = 'WRONG_ANSWER';
        }
        if (result.status?.id === 6) break;
      }
    }

    const problemPoints = contestProblem.points || 100;
    const score = ScoreCalculator.calculateAdvancedPenalty(
      passedTests,
      totalTests,
      previousAttempts,
      problemPoints
    );

    // Update submission in database
    await prisma.contestSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        runtime: Math.round(maxRuntime),
        passedTests,
        totalTests,
        points: score,
        errorMessage,
        testCaseResults: JSON.stringify(testCaseResults),
        attempts: previousAttempts,
        ...(status === 'ACCEPTED' && { solvedAt: new Date() })
      }
    });

    console.log(`Submission ${submissionId} processed: ${passedTests}/${totalTests} tests passed, Score: ${score}/${problemPoints}, Attempts: ${previousAttempts}`);

    // Update leaderboard and trigger WebSocket updates
    await updateUserLeaderboard(submission.contestId, submission.userId, contestProblemId, score);

  } catch (error) {
    console.error('Error processing contest submission:', error);
    await prisma.contestSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'RE',
        errorMessage: error.message || 'System error occurred while processing submission',
        points: 0
      }
    });
  }
};

// Modified updateUserLeaderboard to trigger WebSocket updates
const updateUserLeaderboard = async (contestId, userId, contestProblemId, newScore) => {
  try {
    // Get user's best score for this problem
    const bestSubmission = await prisma.contestSubmission.findFirst({
      where: {
        contestId,
        userId,
        contestProblemId
      },
      orderBy: { points: 'desc' },
      select: { points: true }
    });

    // Get user's total score across all problems in this contest
    const userTotalScore = await prisma.contestSubmission.groupBy({
      by: ['contestProblemId'],
      where: {
        contestId,
        userId
      },
      _max: {
        points: true
      }
    });

    // Calculate total score (sum of best scores for each problem)
    const totalScore = userTotalScore.reduce((sum, problem) => {
      return sum + (problem._max.points || 0);
    }, 0);

    // Update leaderboard - this will trigger WebSocket events
    await leaderboardService.updateScore(contestId, userId, totalScore);

    console.log(`Updated leaderboard for user ${userId} in contest ${contestId}: Total score = ${totalScore}`);

  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
};

module.exports = {
  processContestSubmission
};
