// routes/languages.js or similar
const express = require('express');
const { PrismaClient } = require('../generated/prisma');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/languages - Fetch all active languages
router.get('/', async (req, res) => {
  try {
    const languages = await prisma.language.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        judge0Id: true,
        extension: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: languages
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch languages'
    });
  }
});

module.exports = router;
