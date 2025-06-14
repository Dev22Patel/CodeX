const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

class ProblemController {
  // Get all problems with filtering and pagination
  static async getAllProblems(req, res) {
    try {

      const [problems, total] = await Promise.all([
        prisma.problem.findMany(),
        prisma.problem.count()
      ]);

      res.json({
        success: true,
        data: {
          problems
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching problems',
        error: error.message
      });
    }
  }

  // Get single problem by ID or slug
  static async getProblem(req, res) {
    try {
      const { identifier } = req.params;
      const { includeHidden = false } = req.query;

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

      res.json({
        success: true,
        data: problem
      });
    } catch (error) {
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
      res.status(500).json({
        success: false,
        message: 'Error updating problem statistics',
        error: error.message
      });
    }
  }

  // Get problem statistics
  static async getProblemStats(req, res) {
    try {
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
          }, {})
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching problem statistics',
        error: error.message
      });
    }
  }
}

module.exports = ProblemController;
