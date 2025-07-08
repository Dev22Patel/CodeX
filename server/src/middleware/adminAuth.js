// backend/middleware/adminAuth.js
const adminAuth = (req, res, next) => {
  // For now, we'll use a simple header-based authentication
  // In a production environment, you'd want to use JWT or session-based auth

  const adminToken = req.headers['x-admin-token'];

  // Simple token validation - in production, use proper JWT validation
  if (adminToken === 'admin-authenticated') {
    next();
  } else {
    return res.status(401).json({
      error: 'Unauthorized. Admin access required.'
    });
  }
};

module.exports = adminAuth;
