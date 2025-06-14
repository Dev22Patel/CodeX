const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('./src/generated/prisma');
require('dotenv').config();
// Import routes
const problemRoutes = require('./src/routes/problemRoutes');
const authRoutes = require('./src/routes/authRoutes');
const launguagesRoutes = require('./src/routes/launguagesRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');

const app = express();
const prisma = new PrismaClient();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/launguages',launguagesRoutes);
app.use('/api/submissions', submissionRoutes);


// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    await prisma.$connect();
    res.json({
      success: true,
      message: 'Database connected successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = app;
