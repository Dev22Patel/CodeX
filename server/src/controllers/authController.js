const { PrismaClient } = require('../generated/prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { validateRegister, validateLogin } = require('../validators/authValidator');
const redisClient = require('../redis/redisclient'); // Assuming you have a rate limiter middleware
const prisma = new PrismaClient();

const register = async (req, res) => {
  try {
    // Validate input
    const { error, value } = validateRegister(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { name, email, username, password } = value;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        message: `User with this ${field} already exists`
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const login = async (req, res) => {
  try {
    // Validate input
    const { error, value } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { login, password } = value;

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: login },
          { username: login }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    // User is already attached to req by authMiddleware
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getSolvedProblems = async (req, res) => {
  const { userId } = req.params;

  const result = await redisClient.get(`solvedProblems:${userId}`);
    if (result) {
        console.log("Cache hit for solved problems");
        return res.status(200).json({ success: true, data: JSON.parse(result) });
   }
  try {
    const solvedProblems = await prisma.problem.findMany({
      where: {
        submissions: {
          some: {
            userId: userId,
            status: 'ACCEPTED',
          },
        },
      },
      distinct: ['id'],
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        acceptanceRate: true,
      },
    });
    redisClient.set(`solvedProblems:${userId}`, JSON.stringify(solvedProblems), 'EX', 600); // Cache for 1 hour
    return res.status(200).json({ success: true, data: solvedProblems });
  } catch (error) {
    console.error("Error fetching solved problems:", error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


module.exports = {
  register,
  login,
  getProfile,
  getSolvedProblems
};
