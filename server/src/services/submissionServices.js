const { PrismaClient } = require('../generated/prisma');

const axios = require('axios');
const redisClient = require('../redis/redisclient');
const prisma = new PrismaClient();
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = '5ce3fab409mshcc0ab3ef1b4bacap156916jsn8464c2d8f747';

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


module.exports = {
  processSubmission
};
