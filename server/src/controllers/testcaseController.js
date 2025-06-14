const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TestCaseController {
  // Get all test cases for a problem
  static async getTestCasesByProblem(req, res) {
    try {
      const { problemId } = req.params;
      const { includeHidden = false } = req.query;

      const where = {
        problemId,
        ...(includeHidden !== 'true' && { isPublic: true })
      };

      const testCases = await prisma.testCase.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: testCases
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching test cases',
        error: error.message
      });
    }
  }

  // Get single test case by ID
  static async getTestCase(req, res) {
    try {
      const { id } = req.params;

      const testCase = await prisma.testCase.findUnique({
        where: { id },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      if (!testCase) {
        return res.status(404).json({
          success: false,
          message: 'Test case not found'
        });
      }

      res.json({
        success: true,
        data: testCase
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching test case',
        error: error.message
      });
    }
  }

  // Create new test case
  static async createTestCase(req, res) {
    try {
      const {
        problemId,
        input,
        expectedOutput,
        isPublic = false,
        points = 1,
        timeLimit,
        memoryLimit
      } = req.body;

      // Validate required fields
      if (!problemId || !input || !expectedOutput) {
        return res.status(400).json({
          success: false,
          message: 'Problem ID, input, and expected output are required'
        });
      }

      // Check if problem exists
      const problem = await prisma.problem.findUnique({
        where: { id: problemId }
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      const testCase = await prisma.testCase.create({
        data: {
          problemId,
          input,
          expectedOutput,
          isPublic,
          points,
          timeLimit,
          memoryLimit
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Test case created successfully',
        data: testCase
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating test case',
        error: error.message
      });
    }
  }

  // Create multiple test cases
  static async createMultipleTestCases(req, res) {
    try {
      const { problemId, testCases } = req.body;

      if (!problemId || !Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Problem ID and test cases array are required'
        });
      }

      // Check if problem exists
      const problem = await prisma.problem.findUnique({
        where: { id: problemId }
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Validate all test cases
      for (const tc of testCases) {
        if (!tc.input || !tc.expectedOutput) {
          return res.status(400).json({
            success: false,
            message: 'All test cases must have input and expected output'
          });
        }
      }

      const createdTestCases = await prisma.testCase.createMany({
        data: testCases.map(tc => ({
          problemId,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isPublic: tc.isPublic || false,
          points: tc.points || 1,
          timeLimit: tc.timeLimit,
          memoryLimit: tc.memoryLimit
        }))
      });

      // Fetch the created test cases to return with full data
      const newTestCases = await prisma.testCase.findMany({
        where: { problemId },
        orderBy: { createdAt: 'desc' },
        take: createdTestCases.count,
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: `${createdTestCases.count} test cases created successfully`,
        data: newTestCases
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating test cases',
        error: error.message
      });
    }
  }

  // Update test case
  static async updateTestCase(req, res) {
    try {
      const { id } = req.params;
      const {
        input,
        expectedOutput,
        isPublic,
        points,
        timeLimit,
        memoryLimit
      } = req.body;

      const updateData = {};
      if (input !== undefined) updateData.input = input;
      if (expectedOutput !== undefined) updateData.expectedOutput = expectedOutput;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (points !== undefined) updateData.points = points;
      if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
      if (memoryLimit !== undefined) updateData.memoryLimit = memoryLimit;

      const testCase = await prisma.testCase.update({
        where: { id },
        data: updateData,
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Test case updated successfully',
        data: testCase
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Test case not found'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error updating test case',
        error: error.message
      });
    }
  }

  // Delete test case
  static async deleteTestCase(req, res) {
    try {
      const { id } = req.params;

      await prisma.testCase.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Test case deleted successfully'
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Test case not found'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error deleting test case',
        error: error.message
      });
    }
  }

  // Delete all test cases for a problem
  static async deleteTestCasesByProblem(req, res) {
    try {
      const { problemId } = req.params;

      const result = await prisma.testCase.deleteMany({
        where: { problemId }
      });

      res.json({
        success: true,
        message: `${result.count} test cases deleted successfully`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting test cases',
        error: error.message
      });
    }
  }

  // Toggle test case visibility (public/private)
  static async toggleTestCaseVisibility(req, res) {
    try {
      const { id } = req.params;

      // First get the current state
      const currentTestCase = await prisma.testCase.findUnique({
        where: { id }
      });

      if (!currentTestCase) {
        return res.status(404).json({
          success: false,
          message: 'Test case not found'
        });
      }

      const testCase = await prisma.testCase.update({
        where: { id },
        data: {
          isPublic: !currentTestCase.isPublic
        },
        include: {
          problem: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: `Test case is now ${testCase.isPublic ? 'public' : 'private'}`,
        data: testCase
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error toggling test case visibility',
        error: error.message
      });
    }
  }

  // Get test case statistics for a problem
  static async getTestCaseStats(req, res) {
    try {
      const { problemId } = req.params;

      const stats = await prisma.testCase.groupBy({
        where: { problemId },
        by: ['isPublic'],
        _count: { id: true },
        _sum: { points: true }
      });

      const totalStats = await prisma.testCase.aggregate({
        where: { problemId },
        _count: { id: true },
        _sum: { points: true },
        _avg: { points: true }
      });

      const result = {
        total: totalStats._count.id,
        totalPoints: totalStats._sum.points,
        averagePoints: totalStats._avg.points,
        public: 0,
        private: 0,
        publicPoints: 0,
        privatePoints: 0
      };

      stats.forEach(stat => {
        if (stat.isPublic) {
          result.public = stat._count.id;
          result.publicPoints = stat._sum.points;
        } else {
          result.private = stat._count.id;
          result.privatePoints = stat._sum.points;
        }
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching test case statistics',
        error: error.message
      });
    }
  }
}

module.exports = TestCaseController;
