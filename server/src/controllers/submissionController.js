const { PrismaClient } = require('../generated/prisma');
const axios = require('axios');
const redisClient = require('../redis/redisclient');
const prisma = new PrismaClient();
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = '5ce3fab409mshcc0ab3ef1b4bacap156916jsn8464c2d8f747';

// Add the missing getContestRank function
const getContestRank = async (contestId, userId) => {
  try {
    const leaderboardKey = `contest:${contestId}:leaderboard`;
    const rank = await redisClient.zrevrank(leaderboardKey, userId);
    return rank !== null ? rank + 1 : null; // Convert to 1-based ranking
  } catch (error) {
    console.error('Error getting contest rank:', error);
    return null;
  }
};

const processSubmission = async (submissionId, code, language, testCases, timeLimit) => {
  console.log(`Processing submission ${submissionId} for language ${language.name}`);
  try {
    let passedTests = 0;
    let totalTests = testCases.length;
    let status = 'ACCEPTED';
    let maxRuntime = 0;
    let errorMessage = null;
    let testCaseResults = [];

    const batchData = testCases.map((testCase, index) => ({
      source_code: Buffer.from(code).toString('base64'),
      language_id: language.judge0Id,
      stdin: Buffer.from(testCase.input).toString('base64'),
      expected_output: Buffer.from(testCase.expectedOutput.trim()).toString('base64'),
      cpu_time_limit: (timeLimit || 1000) / 1000,
      testCaseIndex: index,
      testCaseId: testCase.id
    }));

    const headers = {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': JUDGE0_API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
    };


    // main call the judge0 api to get the response for the batch of testcases
    
    const batchResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`,
      { submissions: batchData },
      { headers, timeout: 30000 }
    );

     // const batchResponse = await axios.post(
    //   `${JUDGE0_API_URL}/submissions/batch?base64_encoded=true`,
    //   { submissions: batchData },
    //   { headers, timeout: 30000 },
    //   { callback_url: "<YOUR_CALLBACK_URL> since i have not hosted my backend the callback url is not exposed on the internet so it want find my server and give the response so for timebeing i am handling the response in the same function>" }
    // );

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
      const testCase = testCases[batchData[i].testCaseIndex];
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
        statusId: result.status?.id || 0,
        statusDescription: result.status?.description || 'Unknown',
        stderr,
        compileOutput,
        isPublic: testCase.isPublic || false
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

    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status, score, runtime: Math.round(maxRuntime), passedTests, totalTests, errorMessage, testCaseResults: JSON.stringify(testCaseResults) }
    });

    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    await prisma.problem.update({
      where: { id: submission.problemId },
      data: {
        solved: status === 'ACCEPTED' ? { increment: 1 } : undefined,
        totalSubmissions: { increment: 1 }
      }
    });

    if (status === 'ACCEPTED') redisClient.del(`solvedProblems:${submission.userId}`);
    console.log(`Submission ${submissionId} processed: ${status}, Score: ${score}%`);
  } catch (error) {
    console.error('Error processing submission:', error);
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'RE', errorMessage: 'System error occurred while processing submission' }
    });
  }
};

const calculateContestScore = (passedTests, totalTests, contestProblem, solveTimeMinutes, attempts = 1) => {
  if (totalTests === 0) return 0;

  const basePoints = contestProblem.points || 100;

  // Full points for 100% pass rate, partial points for partial completion
  const testCaseScore = Math.round((passedTests / totalTests) * basePoints);

  // Time bonus: faster solutions get slight bonus (max 10% of base points)
  const timeBonus = Math.max(0, Math.round(basePoints * 0.1 * (1 - Math.min(solveTimeMinutes / 120, 1))));

  // Penalty for multiple attempts (5% reduction per attempt after first)
  const attemptPenalty = Math.round(basePoints * 0.05 * Math.max(0, attempts - 1));

  return Math.max(0, testCaseScore + timeBonus - attemptPenalty);
};

// Enhanced Redis leaderboard management
const updateContestLeaderboard = async (contestId, userId, problemId, userScore, solveTimeMinutes) => {
  try {
    const leaderboardKey = `contest:${contestId}:leaderboard`;
    const userStatsKey = `contest:${contestId}:user:${userId}:stats`;
    const userProblemsKey = `contest:${contestId}:user:${userId}:problems`;

    // Get current user stats
    const currentStats = await redisClient.hgetall(userStatsKey);
    const currentTotalTime = parseInt(currentStats.totalTime || '0');

    // Get current score for this specific problem
    const currentProblemScore = await redisClient.hget(userProblemsKey, problemId.toString());
    const previousProblemScore = parseInt(currentProblemScore || '0');

    // Only update if this is a better score for this problem
    if (userScore <= previousProblemScore) {
      console.log(`Score ${userScore} not better than previous ${previousProblemScore} for problem ${problemId}`);
      return {
        totalPoints: parseInt(currentStats.totalPoints || '0'),
        totalTime: currentTotalTime,
        problemsSolved: parseInt(currentStats.problemsSolved || '0'),
        rank: await getContestRank(contestId, userId)
      };
    }

    // Store the new best score for this problem
    await redisClient.hset(userProblemsKey, problemId.toString(), userScore);

    // Calculate new total by summing all problem scores
    const allProblemScores = await redisClient.hgetall(userProblemsKey);
    const newTotalPoints = Object.values(allProblemScores).reduce((sum, score) => sum + parseInt(score), 0);

    // Count problems solved (problems with score > 0)
    const problemsSolved = Object.values(allProblemScores).filter(score => parseInt(score) > 0).length;

    // Update total time (this is cumulative for solve time tracking)
    const newTotalTime = currentTotalTime + (solveTimeMinutes || 0);

    console.log(`Updating leaderboard for contest ${contestId}, user ${userId}`);
    console.log(`Problem ${problemId}: ${previousProblemScore} -> ${userScore}`);
    console.log(`Total points: ${newTotalPoints}, Problems solved: ${problemsSolved}`);

    // Update user stats
    await redisClient.hset(userStatsKey, {
        totalPoints: newTotalPoints,
        totalTime: newTotalTime,
        problemsSolved: problemsSolved,
        lastUpdated: Date.now()
    });

    // Calculate Redis score for leaderboard
    // Higher score = better rank
    // Formula: (totalPoints * 1000000) - (totalTimeMinutes * 100)
    const redisScore = (newTotalPoints * 1000000) - (newTotalTime * 100);

    // Update leaderboard
    await redisClient.zadd(leaderboardKey, redisScore, userId);

    // Set expiry for contest data
    await redisClient.expire(leaderboardKey, 7 * 24 * 60 * 60); // 7 days
    await redisClient.expire(userStatsKey, 7 * 24 * 60 * 60);
    await redisClient.expire(userProblemsKey, 7 * 24 * 60 * 60);

    console.log(`Updated leaderboard for contest ${contestId}, user ${userId}: ${newTotalPoints} points, ${newTotalTime} minutes`);

    return {
      totalPoints: newTotalPoints,
      totalTime: newTotalTime,
      problemsSolved: problemsSolved,
      rank: await getContestRank(contestId, userId)
    };
  } catch (error) {
    console.error('Error updating contest leaderboard:', error);
    throw error;
  }
};

// Get contest leaderboard
const getContestLeaderboardData = async (contestId, limit = 50) => {
  try {
    const leaderboardKey = `contest:${contestId}:leaderboard`;

    // Get top users with scores
    const topUsers = await redisClient.zrevrange(leaderboardKey, 0, limit - 1, 'WITHSCORES');

    const leaderboard = [];
    for (let i = 0; i < topUsers.length; i += 2) {
      const userId = topUsers[i];
      const redisScore = parseInt(topUsers[i + 1]);

      // Decode the score
      const totalPoints = Math.floor(redisScore / 1000000);
      const totalTime = Math.floor((redisScore % 1000000) / 100);

      // Get user details and stats
      const userStatsKey = `contest:${contestId}:user:${userId}:stats`;
      const userStats = await redisClient.hgetall(userStatsKey);

      // Get user basic info from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, name: true, avatar: true }
      });

      if (user) {
        leaderboard.push({
          rank: Math.floor(i / 2) + 1,
          user,
          totalPoints,
          totalTime,
          problemsSolved: parseInt(userStats.problemsSolved || '0'),
          lastUpdated: parseInt(userStats.lastUpdated || '0')
        });
      }
    }

    return leaderboard;
  } catch (error) {
    console.error('Error getting contest leaderboard:', error);
    return [];
  }
};

const processContestSubmission = async (submissionId, code, language, contestProblemId, timeLimit) => {
  console.log(`Processing contest submission ${submissionId} for contestProblemId ${contestProblemId}`);
  try {
    const submission = await prisma.contestSubmission.findUnique({
      where: { id: submissionId },
      select: { contestProblemId: true, contestId: true, userId: true }
    });

    if (!submission) throw new Error('Contest submission not found');
    if (submission.contestProblemId !== contestProblemId) throw new Error('Contest problem ID mismatch');

    const contestProblem = await prisma.contestProblem.findUnique({
      where: { id: contestProblemId },
      include: {
        testCases: { orderBy: { createdAt: 'asc' } },
        contest: { select: { id: true, startTime: true } }
      }
    });

    if (!contestProblem) throw new Error(`Contest problem not found for ID: ${contestProblemId}`);
    if (!contestProblem.testCases?.length) throw new Error(`No test cases found for contest problem ${contestProblemId}`);

    // Get user's previous attempts for this problem
    const previousAttempts = await prisma.contestSubmission.count({
      where: {
        contestId: submission.contestId,
        userId: submission.userId,
        contestProblemId: contestProblemId,
        createdAt: { lt: new Date() }
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

    // Calculate solve time in minutes
    const contestStart = new Date(contestProblem.contest.startTime);
    const submissionTime = new Date();
    const solveTimeMinutes = Math.max(1, Math.round((submissionTime.getTime() - contestStart.getTime()) / (1000 * 60)));

    // Calculate score using enhanced scoring system
    const calculatedScore = calculateContestScore(
      passedTests,
      totalTests,
      contestProblem,
      solveTimeMinutes,
      previousAttempts + 1
    );

    // Update submission in database
    await prisma.contestSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        points: calculatedScore,
        runtime: Math.round(maxRuntime),
        passedTests,
        totalTests,
        errorMessage,
        testCaseResults: JSON.stringify(testCaseResults),
        attempts: previousAttempts + 1,
        ...(status === 'ACCEPTED' && { solvedAt: new Date() })
      }
    });

    // Always update leaderboard - the function will handle whether it's actually better
    console.log(`Updating leaderboard for contest ${submission.contestId}, user ${submission.userId}`);
    await updateContestLeaderboard(
      submission.contestId,
      submission.userId,
      contestProblemId, // Pass the problem ID
      calculatedScore,
      solveTimeMinutes
    );

    console.log(`Contest submission ${submissionId} processed: ${status}, Points: ${calculatedScore}`);
  } catch (error) {
    console.error('Error processing contest submission:', error);
    await prisma.contestSubmission.update({
      where: { id: submissionId },
      data: { status: 'RE', errorMessage: error.message || 'System error occurred while processing submission' }
    });
  }
};


// Helper function to get user's current contest standings
const getUserContestStandings = async (contestId, userId) => {
  try {
    const userStatsKey = `contest:${contestId}:user:${userId}:stats`;
    const userProblemsKey = `contest:${contestId}:user:${userId}:problems`;

    const [userStats, problemScores] = await Promise.all([
      redisClient.hgetall(userStatsKey),
      redisClient.hgetall(userProblemsKey)
    ]);

    const rank = await getContestRank(contestId, userId);

    return {
      rank,
      totalPoints: parseInt(userStats.totalPoints || '0'),
      totalTime: parseInt(userStats.totalTime || '0'),
      problemsSolved: parseInt(userStats.problemsSolved || '0'),
      problemScores: Object.entries(problemScores).reduce((acc, [problemId, score]) => {
        acc[problemId] = parseInt(score);
        return acc;
      }, {}),
      lastUpdated: parseInt(userStats.lastUpdated || '0')
    };
  } catch (error) {
    console.error('Error getting user contest standings:', error);
    return null;
  }
};


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

    // Find contest problem by slug, not ID
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
        // Removed the contest: { connect: ... } line
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
  processContestSubmission,
  submitContestSolution,
  getContestSubmissionStatus,
  getContestRank,
  getContestLeaderboardData,
  getUserContestStandings,
};
