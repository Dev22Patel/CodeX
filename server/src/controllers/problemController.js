const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

class ProblemController {
  // Get all problems with filtering and pagination - UPDATED to include user status
  static async getAllProblems(req, res) {
    try {
      const userId = req.user?.id; // Get user ID from auth middleware (if authenticated)

      // Get problems with basic info
      const problems = await prisma.problem.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          solved: true,
          totalSubmissions: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get user submissions for all problems if user is logged in
      let userSubmissions = {};
      if (userId) {
        const submissions = await prisma.submission.findMany({
          where: {
            userId: userId,
            problemId: {
              in: problems.map(p => p.id)
            }
          },
          select: {
            problemId: true,
            status: true,
            score: true,
            createdAt: true
          },
          orderBy: [
            { createdAt: 'desc' }
          ]
        });

        // Group submissions by problem and get the best one for each
        const submissionGroups = submissions.reduce((acc, submission) => {
          if (!acc[submission.problemId]) {
            acc[submission.problemId] = [];
          }
          acc[submission.problemId].push(submission);
          return acc;
        }, {});

        // Get the best submission for each problem
        userSubmissions = Object.keys(submissionGroups).reduce((acc, problemId) => {
          const problemSubmissions = submissionGroups[problemId];

          // Find accepted submission first
          let bestSubmission = problemSubmissions.find(s => s.status === 'ACCEPTED');

          // If no accepted submission, get the one with highest score
          if (!bestSubmission && problemSubmissions.length > 0) {
            bestSubmission = problemSubmissions.reduce((best, current) => {
              const currentScore = current.score || 0;
              const bestScore = best.score || 0;
              return currentScore > bestScore ? current : best;
            });
          }

          if (bestSubmission) {
            acc[problemId] = bestSubmission;
          }

          return acc;
        }, {});
      }

      // Add user status and acceptance rate to each problem
      const problemsWithStats = problems.map(problem => {
        const acceptanceRate = problem.totalSubmissions > 0
          ? Math.round((problem.solved / problem.totalSubmissions) * 100)
          : 0;

        let userStatus = null;
        if (userId) {
          const userSubmission = userSubmissions[problem.id];
          userStatus = {
            status: userSubmission?.status || null,
            score: userSubmission?.score || null,
            hasSubmitted: !!userSubmission,
            isAccepted: userSubmission?.status === 'ACCEPTED'
          };
        }

        return {
          ...problem,
          acceptanceRate,
          userStatus
        };
      });

      res.json({
        success: true,
        data: {
          problems: problemsWithStats
        }
      });
    } catch (error) {
      console.error('Get all problems error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching problems',
        error: error.message
      });
    }
  }

  // Get single problem by ID or slug - UPDATED to include user submissions
  static async getProblem(req, res) {
    try {
      const { identifier } = req.params;
      const { includeHidden = false } = req.query;
      const userId = req.user?.id;

      const where = identifier.length === 36
        ? { id: identifier }
        : { slug: identifier };

      const problem = await prisma.problem.findUnique({
        where,
        include: {
          testCases: {
            where: includeHidden === 'true' ? {} : { isPublic: true },
            orderBy: { createdAt: 'asc' }
          },
          submissions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              createdAt: true,
              score: true,
              // Add user info if you have user model
            }
          }
        }
      });

      if (!problem) {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }

      // Get user's submissions for this problem if authenticated
      let userSubmissions = [];
      let userStatus = null;

      if (userId) {
        userSubmissions = await prisma.submission.findMany({
          where: {
            problemId: problem.id,
            userId: userId
          },
          select: {
            id: true,
            status: true,
            score: true,
            runtime: true,
            memory: true,
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
          take: 10
        });

        // Get best submission status
        if (userSubmissions.length > 0) {
          const acceptedSubmission = userSubmissions.find(s => s.status === 'ACCEPTED');
          const bestSubmission = acceptedSubmission || userSubmissions.reduce((best, current) => {
            const currentScore = current.score || 0;
            const bestScore = best.score || 0;
            return currentScore > bestScore ? current : best;
          });

          userStatus = {
            status: bestSubmission.status,
            score: bestSubmission.score,
            hasSubmitted: true,
            isAccepted: bestSubmission.status === 'ACCEPTED',
            bestRuntime: bestSubmission.runtime,
            bestMemory: bestSubmission.memory
          };
        } else {
          userStatus = {
            status: null,
            score: null,
            hasSubmitted: false,
            isAccepted: false
          };
        }
      }

      // Calculate acceptance rate
      const acceptanceRate = problem.totalSubmissions > 0
        ? Math.round((problem.solved / problem.totalSubmissions) * 100)
        : 0;

      res.json({
        success: true,
        data: {
          ...problem,
          acceptanceRate,
          userStatus,
          userSubmissions
        }
      });
    } catch (error) {
      console.error('Get problem error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching problem',
        error: error.message
      });
    }
  }

  // Create new problem
  static async createProblem(req, res) {
    try {
      const {
        title,
        slug,
        description,
        difficulty = 'EASY',
        timeLimit = 1000,
        memoryLimit = 256,
        isPublic = true,
        tags,
        testCases = []
      } = req.body;

      // Validate required fields
      if (!title || !slug || !description) {
        return res.status(400).json({
          success: false,
          message: 'Title, slug, and description are required'
        });
      }

      // Validate difficulty
      if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be EASY, MEDIUM, or HARD'
        });
      }

      // Check if slug already exists
      const existingProblem = await prisma.problem.findUnique({
        where: { slug }
      });

      if (existingProblem) {
        return res.status(400).json({
          success: false,
          message: 'Problem with this slug already exists'
        });
      }

      // Create problem with test cases
      const problem = await prisma.problem.create({
        data: {
          title,
          slug,
          description,
          difficulty,
          timeLimit,
          memoryLimit,
          isPublic,
          tags: tags ? JSON.stringify(tags) : null,
          testCases: {
            create: testCases.map(tc => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isPublic: tc.isPublic || false,
              points: tc.points || 1,
              timeLimit: tc.timeLimit,
              memoryLimit: tc.memoryLimit
            }))
          }
        },
        include: {
          testCases: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Problem created successfully',
        data: problem
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Problem with this slug already exists'
        });
      }
      console.error('Create problem error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating problem',
        error: error.message
      });
    }
  }

  // Update problem
  static async updateProblem(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        slug,
        description,
        difficulty,
        timeLimit,
        memoryLimit,
        isPublic,
        tags
      } = req.body;

      // Validate difficulty if provided
      if (difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Difficulty must be EASY, MEDIUM, or HARD'
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (description !== undefined) updateData.description = description;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
      if (memoryLimit !== undefined) updateData.memoryLimit = memoryLimit;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);

      const problem = await prisma.problem.update({
        where: { id },
        data: updateData,
        include: {
          testCases: true
        }
      });

      res.json({
        success: true,
        message: 'Problem updated successfully',
        data: problem
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: 'Problem with this slug already exists'
        });
      }
      console.error('Update problem error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating problem',
        error: error.message
      });
    }
  }

  // Delete problem
  static async deleteProblem(req, res) {
    try {
      const { id } = req.params;

      await prisma.problem.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Problem deleted successfully'
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }
      console.error('Delete problem error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting problem',
        error: error.message
      });
    }
  }

  // Update problem statistics
  static async updateProblemStats(req, res) {
    try {
      const { id } = req.params;
      const { solved, totalSubmissions } = req.body;

      const acceptanceRate = totalSubmissions > 0 ? (solved / totalSubmissions) * 100 : 0;

      const problem = await prisma.problem.update({
        where: { id },
        data: {
          solved: solved || 0,
          totalSubmissions: totalSubmissions || 0,
          acceptanceRate: parseFloat(acceptanceRate.toFixed(2))
        }
      });

      res.json({
        success: true,
        message: 'Problem statistics updated successfully',
        data: problem
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Problem not found'
        });
      }
      console.error('Update problem stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating problem statistics',
        error: error.message
      });
    }
  }

  // Get problem statistics - UPDATED to include user-specific stats
  static async getProblemStats(req, res) {
    try {
      const userId = req.user?.id;

      const stats = await prisma.problem.aggregate({
        _count: { id: true },
        _avg: { acceptanceRate: true },
        _sum: {
          solved: true,
          totalSubmissions: true
        }
      });

      const difficultyStats = await prisma.problem.groupBy({
        by: ['difficulty'],
        _count: { id: true }
      });

      let userStats = null;
      if (userId) {
        // Get user-specific statistics
        const userSolvedProblems = await prisma.submission.groupBy({
          by: ['problemId'],
          where: {
            userId: userId,
            status: 'ACCEPTED'
          },
          _count: { problemId: true }
        });

        const userTotalSubmissions = await prisma.submission.count({
          where: { userId: userId }
        });

        // Get difficulty breakdown for solved problems
        const userSolvedByDifficulty = await prisma.submission.findMany({
          where: {
            userId: userId,
            status: 'ACCEPTED'
          },
          select: {
            problem: {
              select: {
                difficulty: true
              }
            }
          },
          distinct: ['problemId']
        });

        const difficultyBreakdown = userSolvedByDifficulty.reduce((acc, item) => {
          const difficulty = item.problem.difficulty;
          acc[difficulty] = (acc[difficulty] || 0) + 1;
          return acc;
        }, {});

        userStats = {
          totalSolved: userSolvedProblems.length,
          totalSubmissions: userTotalSubmissions,
          solvedByDifficulty: difficultyBreakdown
        };
      }

      res.json({
        success: true,
        data: {
          totalProblems: stats._count.id,
          averageAcceptanceRate: stats._avg.acceptanceRate,
          totalSolved: stats._sum.solved,
          totalSubmissions: stats._sum.totalSubmissions,
          difficultyBreakdown: difficultyStats.reduce((acc, item) => {
            acc[item.difficulty] = item._count.id;
            return acc;
          }, {}),
          userStats
        }
      });
    } catch (error) {
      console.error('Get problem stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching problem statistics',
        error: error.message
      });
    }
  }

  // NEW: Get user's submission history for a specific problem
  static async getUserSubmissionHistory(req, res) {
    try {
      const { problemId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const submissions = await prisma.submission.findMany({
        where: {
          problemId: problemId,
          userId: userId
        },
        select: {
          id: true,
          status: true,
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
        }
      });

      res.json({
        success: true,
        data: {
          submissions
        }
      });
    } catch (error) {
      console.error('Get user submission history error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching submission history',
        error: error.message
      });
    }
  }
}

module.exports = ProblemController;
