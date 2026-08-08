const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/db');

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCESS_SECRET  = process.env.JWT_SECRET         || 'busywms-secret-key-12345';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'busywms-refresh-secret-key-99887766';
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN     || '15m';
const REFRESH_TTL    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256 hash of a token string (for safe DB storage) */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Parse "Nd" / "Nh" / "Nm" / "Ns" string into milliseconds */
function parseTTL(ttl) {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = String(ttl).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000;
  return parseInt(match[1]) * units[match[2]];
}

/** Build the public user object sent to the client */
function publicUser(user) {
  return {
    id:            user.id,
    username:      user.username,
    name:          user.name,
    role:          user.role,
    salesman_code: user.salesman_code,
    mobile:        user.mobile,
    email:         user.email,
  };
}

/** Issue a signed access JWT */
function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

/** Generate, store and return a signed refresh token JWT */
async function createRefreshToken(userId, req) {
  // Revoke any expired tokens for this user (silent cleanup)
  await prisma.refreshToken.deleteMany({
    where: { user_id: userId, expires_at: { lt: new Date() } }
  });

  // Sign a JWT as the refresh token (so jwt.verify can validate it)
  // jti (JWT ID) is a unique identifier so every issued token has a unique hash
  const rawToken = jwt.sign(
    { id: userId, type: 'refresh', jti: crypto.randomUUID() },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL }
  );

  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + parseTTL(REFRESH_TTL));

  await prisma.refreshToken.create({
    data: {
      token_hash: tokenHash,
      user_id:    userId,
      expires_at: expiresAt,
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
    }
  });

  return rawToken;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Validates credentials, issues access token + refresh token.
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }

    const accessToken  = signAccessToken(user);
    const refreshToken = await createRefreshToken(user.id, req);

    res.json({
      success: true,
      message: 'Login successful',
      access_token:  accessToken,
      refresh_token: refreshToken,
      token_type:    'Bearer',
      expires_in:    ACCESS_TTL,
      // Legacy: keep "token" field so existing code still works during transition
      token: accessToken,
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh
 * Validates refresh token, rotates it, and issues a new access token.
 */
async function refresh(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    // 1. Verify the JWT signature of the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refresh_token, REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.name === 'TokenExpiredError'
          ? 'Refresh token has expired. Please log in again.'
          : 'Invalid refresh token.'
      });
    }

    // 2. Look up the hashed token in DB
    const tokenHash = hashToken(refresh_token);
    const stored = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true }
    });

    if (!stored) {
      return res.status(401).json({ success: false, message: 'Refresh token not recognised. Please log in again.' });
    }

    // 3. Check revocation
    if (stored.revoked) {
      // Token reuse detected — revoke ALL tokens for this user (possible token theft)
      await prisma.refreshToken.updateMany({
        where: { user_id: stored.user_id },
        data:  { revoked: true }
      });
      return res.status(401).json({
        success: false,
        message: 'Refresh token already used. All sessions have been invalidated for security. Please log in again.'
      });
    }

    // 4. Check DB-level expiry (double-check beyond JWT)
    if (stored.expires_at < new Date()) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
      return res.status(401).json({ success: false, message: 'Refresh token has expired. Please log in again.' });
    }

    // 5. Check user is still active
    if (!stored.user || stored.user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    // 6. Rotate — revoke old token and issue new one
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });

    const newAccessToken  = signAccessToken(stored.user);
    const newRefreshToken = await createRefreshToken(stored.user.id, req);

    res.json({
      success:       true,
      access_token:  newAccessToken,
      refresh_token: newRefreshToken,
      token_type:    'Bearer',
      expires_in:    ACCESS_TTL,
      // Legacy alias
      token: newAccessToken,
      user: publicUser(stored.user),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 * Revokes the specific refresh token provided.
 */
async function logout(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      const tokenHash = hashToken(refresh_token);
      await prisma.refreshToken.updateMany({
        where: { token_hash: tokenHash, revoked: false },
        data:  { revoked: true }
      });
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout-all
 * Revokes ALL refresh tokens for the authenticated user (sign out everywhere).
 */
async function logoutAll(req, res, next) {
  try {
    const userId = req.user.id;

    const { count } = await prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked: false },
      data:  { revoked: true }
    });

    res.json({
      success: true,
      message: `Logged out from all ${count} active session(s).`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me
 * Returns current authenticated user's profile.
 */
async function getMe(req, res, next) {
  try {
    res.json({ success: true, user: req.user });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/sessions  (Admin or self)
 * Lists all active refresh token sessions for the current user.
 */
async function getSessions(req, res, next) {
  try {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        user_id:    req.user.id,
        revoked:    false,
        expires_at: { gt: new Date() }
      },
      select: {
        id:         true,
        created_at: true,
        expires_at: true,
        ip_address: true,
        user_agent: true,
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  getSessions,
};
