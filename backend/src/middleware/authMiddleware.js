const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_recovery_system_tp_2026');
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        salesman_code: true,
        mobile: true,
        email: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'User account is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required' });
};

module.exports = {
  authenticateToken,
  requireAdmin,
};
