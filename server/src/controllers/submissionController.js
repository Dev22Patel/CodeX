const { PrismaClient } = require('../generated/prisma');
const axios = require('axios');

const prisma = new PrismaClient();

// Judge0 API configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = '5ce3fab409mshcc0ab3ef1b4bacap156916jsn8464c2d8f747';

// Process submission function
const processSubmission = async (submissionId, code, language, testCases, timeLimit, memoryLimit) => {
  console.log(`Processing submission ${submissionId} for language ${language.name}`);
  try {
    let passedTests = 0;
    let totalTests = testCases.length;
    let status = 'ACCEPTED';
    let maxRuntime = 0;
    let maxMemory = 0;
    let errorMessage = null;
    let testCaseResults = []; // Store detailed results for each test case

    // Process each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        // Submit code to Judge0
        const submissionData = {
          source_code: Buffer.from(code).toString('base64'),
          language_id: language.judge0Id,
          stdin: Buffer.from(testCase.input).toString('base64'),
          expected_output: Buffer.from(testCase.expectedOutput.trim()).toString('base64'),
          cpu_time_limit: (timeLimit || 1000) / 1000,
          memory_limit: (memoryLimit || 256) * 1024,
        };

        const headers = {
          'Content-Type': 'application/json',
        };

        if (JUDGE0_API_KEY) {
          headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
          headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
        }

        const createResponse = await axios.post(
          `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`,
          submissionData,
          { headers, timeout: 30000 }
        );

        const result = createResponse.data;
        console.log(`Test case ${i + 1} result:`, result);

        // Decode outputs for storage
        const actualOutput = result.stdout ?
          Buffer.from(result.stdout, 'base64').toString('utf-8').trim() : '';
        const expectedOutput = testCase.expectedOutput.trim();
        const stderr = result.stderr ?
          Buffer.from(result.stderr, 'base64').toString('utf-8') : null;
        const compileOutput = result.compile_output ?
          Buffer.from(result.compile_output, 'base64').toString('utf-8') : null;

        // Update runtime and memory stats
        if (result.time) {
          maxRuntime = Math.max(maxRuntime, parseFloat(result.time) * 1000);
        }
        if (result.memory) {
          maxMemory = Math.max(maxMemory, result.memory);
        }

        // Determine if test case passed
        const testPassed = result.status?.id === 3; // Accepted
        if (testPassed) {
          passedTests++;
        }

        // Store detailed test case result
        const testCaseResult = {
          testCaseIndex: i,
          testCaseId: testCase.id,
          passed: testPassed,
          input: testCase.input,
          expectedOutput: expectedOutput,
          actualOutput: actualOutput,
          runtime: result.time ? parseFloat(result.time) * 1000 : 0,
          memory: result.memory || 0,
          statusId: result.status?.id || 0,
          statusDescription: result.status?.description || 'Unknown',
          stderr: stderr,
          compileOutput: compileOutput,
          isPublic: testCase.isPublic || false
        };

        testCaseResults.push(testCaseResult);

        // Set overall status based on the error type
        if (!testPassed && status === 'ACCEPTED') {
          switch (result.status?.id) {
            case 4: // Wrong Answer
              status = 'WRONG_ANSWER';
              break;
            case 5: // Time Limit Exceeded
              status = 'TLE';
              break;
            case 6: // Compilation Error
              status = 'CE';
              errorMessage = compileOutput || 'Compilation error';
              break;
            case 7: case 8: case 9: case 10: case 11: case 12: // Runtime Errors
              status = 'RE';
              errorMessage = stderr || 'Runtime error';
              break;
            case 13: case 14: // System Errors
              status = 'RE';
              errorMessage = 'System error occurred';
              break;
            default:
              status = 'WRONG_ANSWER';
          }

          // If it's a compilation error, stop processing further test cases
          if (result.status?.id === 6) {
            break;
          }
        }

      } catch (testError) {
        console.error(`Error processing test case ${i + 1}:`, testError);
        status = 'RE';
        errorMessage = 'Error executing code';

        // Add error result for this test case
        testCaseResults.push({
          testCaseIndex: i,
          testCaseId: testCase.id,
          passed: false,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput.trim(),
          actualOutput: '',
          runtime: 0,
          memory: 0,
          statusId: 0,
          statusDescription: 'System Error',
          stderr: 'Error executing code',
          compileOutput: null,
          isPublic: testCase.isPublic || false
        });
        break;
      }
    }

    // Calculate score
    const score = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    // Update submission in database with detailed results
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        score,
        runtime: Math.round(maxRuntime),
        memory: maxMemory,
        passedTests,
        totalTests,
        errorMessage,
        // Store test case results as JSON
        testCaseResults: JSON.stringify(testCaseResults)
      }
    });

    // Update problem statistics
    if (status === 'ACCEPTED') {
      await prisma.problem.update({
        where: { id: (await prisma.submission.findUnique({ where: { id: submissionId } })).problemId },
        data: {
          solved: { increment: 1 },
          totalSubmissions: { increment: 1 }
        }
      });
    } else {
      await prisma.problem.update({
        where: { id: (await prisma.submission.findUnique({ where: { id: submissionId } })).problemId },
        data: {
          totalSubmissions: { increment: 1 }
        }
      });
    }

    console.log(`Submission ${submissionId} processed: ${status}, Score: ${score}%`);

  } catch (error) {
    console.error('Error processing submission:', error);

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'RE',
        errorMessage: 'System error occurred while processing submission'
      }
    });
  }
};

// Get submission status - UPDATED to include detailed test case results
const getSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user.id;

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        userId
      },
      include: {
        problem: {
          select: {
            title: true,
            testCases: {
              select: {
                id: true,
                isPublic: true
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Parse stored test case results
    let detailedResults = [];
    if (submission.testCaseResults) {
      try {
        detailedResults = JSON.parse(submission.testCaseResults);
      } catch (e) {
        console.error('Error parsing test case results:', e);
      }
    }

    // Create results array for frontend with detailed information
    const results = submission.problem.testCases.map((testCase, index) => {
      const detailedResult = detailedResults.find(r => r.testCaseIndex === index);

      return {
        testCase: index + 1,
        passed: index < submission.passedTests,
        isPublic: testCase.isPublic,
        // Include detailed results if available
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
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Rest of the code remains the same...
const submitSolution = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, languageId } = req.body;
    const userId = req.user.id;

    if (!code || !languageId) {
      return res.status(400).json({
        success: false,
        message: 'Code and language are required'
      });
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCases: true
      }
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: 'Problem not found'
      });
    }

    const language = await prisma.language.findUnique({
      where: { id: languageId }
    });

    if (!language) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language'
      });
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
      processSubmission(submission.id, code, language, problem.testCases, problem.timeLimit, problem.memoryLimit)
        .catch(error => {
          console.error('Async processing error:', error);
        });
    });

    res.json({
      success: true,
      data: {
        submissionId: submission.id,
        status: 'PENDING'
      }
    });

  } catch (error) {
    console.error('Submit solution error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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
      where: {
        problemId,
        userId
      },
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
        language: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalSubmissions = await prisma.submission.count({
      where: {
        problemId,
        userId
      }
    });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total: totalSubmissions,
          pages: Math.ceil(totalSubmissions / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitSolution,
  getSubmissionStatus,
  getUserSubmissions
};
