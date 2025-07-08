// Backend: server/src/controllers/adminController.ts
const { PrismaClient } = require('../generated/prisma');
const { z } = require('zod');
const prisma = new PrismaClient();

// Validation schemas
const problemSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  timeLimit: z.number().min(100),
  memoryLimit: z.number().min(64),
  isPublic: z.boolean(),
  tags: z.array(z.string()).optional(),
});

const contestSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isPublic: z.boolean(),
  registrationRequired: z.boolean(),
  maxParticipants: z.number().optional(),
  problemReleaseStrategy: z.enum(['ALL_AT_START', 'GRADUAL', 'ON_DEMAND']),
});

const testCaseSchema = z.object({
  input: z.string().min(1),
  expectedOutput: z.string().min(1),
  isPublic: z.boolean(),
  points: z.number().min(1),
  timeLimit: z.number().optional(),
  memoryLimit: z.number().optional(),
});

// Get All Problems
const getAllProblems = async (req, res) => {
  try {
    const { page = 1, limit = 10, difficulty, search } = req.query;
    const skip = (page - 1) * limit;

    let where = {};
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { testCases: true }
          }
        }
      }),
      prisma.problem.count({ where })
    ]);

    const transformedProblems = problems.map(problem => ({
      ...problem,
      tags: problem.tags ? JSON.parse(problem.tags) : [],
      testCaseCount: problem._count.testCases
    }));

    res.json({
      success: true,
      data: {
        problems: transformedProblems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get Single Problem
const getProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const transformedProblem = {
      ...problem,
      tags: problem.tags ? JSON.parse(problem.tags) : []
    };

    res.json({ success: true, data: transformedProblem });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create Problem
const createProblem = async (req, res) => {
  try {
    const data = problemSchema.parse(req.body);

    // Check if slug already exists
    const existingProblem = await prisma.problem.findUnique({
      where: { slug: data.slug }
    });

    if (existingProblem) {
      return res.status(400).json({ success: false, error: 'Problem with this slug already exists' });
    }

    const problem = await prisma.problem.create({
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
      },
    });
    res.status(201).json({ success: true, data: problem });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update Problem
const updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const data = problemSchema.partial().parse(req.body);

    // Check if problem exists
    const existingProblem = await prisma.problem.findUnique({
      where: { id }
    });

    if (!existingProblem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    // Check if slug already exists (if updating slug)
    if (data.slug && data.slug !== existingProblem.slug) {
      const slugExists = await prisma.problem.findUnique({
        where: { slug: data.slug }
      });

      if (slugExists) {
        return res.status(400).json({ success: false, error: 'Problem with this slug already exists' });
      }
    }

    const problem = await prisma.problem.update({
      where: { id },
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
      },
    });
    res.json({ success: true, data: problem });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete Problem
const deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if problem exists
    const existingProblem = await prisma.problem.findUnique({
      where: { id }
    });

    if (!existingProblem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    // Delete associated test cases first (if cascade is not set up)
    await prisma.testCase.deleteMany({
      where: { problemId: id }
    });

    // Delete the problem
    await prisma.problem.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Problem deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create Test Case
const createTestCase = async (req, res) => {
  try {
    const { problemId } = req.params;
    const data = testCaseSchema.parse(req.body);

    // Check if problem exists
    const problem = await prisma.problem.findUnique({
      where: { id: problemId }
    });

    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const testCase = await prisma.testCase.create({
      data: {
        ...data,
        problemId,
      },
    });
    res.status(201).json({ success: true, data: testCase });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Update Test Case
const updateTestCase = async (req, res) => {
  try {
    const { id } = req.params;
    const data = testCaseSchema.partial().parse(req.body);

    const testCase = await prisma.testCase.update({
      where: { id },
      data,
    });
    res.json({ success: true, data: testCase });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete Test Case
const deleteTestCase = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.testCase.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Test case deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create Contest
const createContest = async (req, res) => {
  try {
    const data = contestSchema.parse(req.body);
    const contest = await prisma.contest.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });
    res.status(201).json({ success: true, data: contest });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Add Contest Problem
const createContestProblem = async (req, res) => {
  try {
    const { contestId } = req.params;
    const problemData = problemSchema.extend({
      points: z.number().min(1),
      problemOrder: z.number().min(1),
      isVisible: z.boolean(),
      releaseTime: z.string().datetime().optional(),
      makePublicAfter: z.boolean(),
    }).parse(req.body);

    const contestProblem = await prisma.contestProblem.create({
      data: {
        ...problemData,
        contestId,
        tags: problemData.tags ? JSON.stringify(problemData.tags) : undefined,
        releaseTime: problemData.releaseTime ? new Date(problemData.releaseTime) : undefined,
      },
    });
    res.status(201).json({ success: true, data: contestProblem });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// Create Contest Test Case
const createContestTestCase = async (req, res) => {
  try {
    const { contestProblemId } = req.params;
    const data = testCaseSchema.parse(req.body);
    const testCase = await prisma.contestTestCase.create({
      data: {
        ...data,
        contestProblemId,
      },
    });
    res.status(201).json({ success: true, data: testCase });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  createContest,
  createContestProblem,
  createContestTestCase
};
