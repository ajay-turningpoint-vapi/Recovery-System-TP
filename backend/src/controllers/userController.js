const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        salesman_code: true,
        mobile: true,
        email: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function getSalesmen(req, res, next) {
  try {
    // Helper to extract clean name and mobile phone number from raw salesman strings like "JIGNESH (7567034004)"
    const parseSalesmanInfo = (rawStr, fallbackMobile = null) => {
      if (!rawStr) return { cleanName: 'UNASSIGNED', mobile: fallbackMobile || '' };
      const str = String(rawStr).trim();
      const match = str.match(/^(.*?)\s*\((\d{10})\)$/);
      if (match) {
        return {
          cleanName: match[1].trim(),
          mobile: fallbackMobile || match[2]
        };
      }
      return { cleanName: str, mobile: fallbackMobile || '' };
    };

    // 1. Fetch salesmen registered in User table
    const salesmanUsers = await prisma.user.findMany({
      where: { role: 'SALESMAN', status: 'ACTIVE' },
      select: { salesman_code: true, name: true, mobile: true }
    });

    // 2. Fetch distinct salesman_code values from Customer table
    const distinctCustomers = await prisma.customer.groupBy({
      by: ['salesman_code'],
      _count: { id: true }
    });

    const salesmenMap = new Map();

    for (const c of distinctCustomers) {
      if (c.salesman_code) {
        const { cleanName, mobile } = parseSalesmanInfo(c.salesman_code);
        salesmenMap.set(c.salesman_code, {
          code: c.salesman_code,
          name: cleanName,
          raw_name: c.salesman_code,
          mobile: mobile,
          count: c._count.id
        });
      }
    }

    for (const u of salesmanUsers) {
      if (u.salesman_code) {
        const existing = salesmenMap.get(u.salesman_code);
        const { cleanName, mobile } = parseSalesmanInfo(u.name || u.salesman_code, u.mobile);
        salesmenMap.set(u.salesman_code, {
          code: u.salesman_code,
          name: cleanName,
          raw_name: u.salesman_code,
          mobile: mobile || (existing ? existing.mobile : ''),
          count: existing ? existing.count : 0
        });
      }
    }

    const list = Array.from(salesmenMap.values()).sort((a, b) => b.count - a.count);

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, password, name, role = 'SALESMAN', salesman_code, mobile, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        password_hash,
        name: name.trim(),
        role,
        salesman_code: salesman_code ? salesman_code.trim() : null,
        mobile: mobile ? mobile.trim() : null,
        email: email ? email.trim() : null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        salesman_code: true,
        mobile: true,
        email: true,
        status: true,
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: newUser,
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID provided' });
    }

    const { name, role, salesman_code, mobile, email, status, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const dataToUpdate = {
      name: name ? name.trim() : existing.name,
      role: role || existing.role,
      salesman_code: salesman_code !== undefined ? salesman_code : existing.salesman_code,
      mobile: mobile !== undefined ? mobile : existing.mobile,
      email: email !== undefined ? email : existing.email,
      status: status || existing.status,
    };

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      }
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        salesman_code: true,
        mobile: true,
        email: true,
        status: true,
      }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updated,
    });
  } catch (err) {
    next(err);
  }
}

async function updatePushToken(req, res, next) {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) {
      return res.status(400).json({ success: false, message: 'fcm_token is required' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { fcm_token },
    });

    res.json({ success: true, message: 'FCM Push Token updated successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  getSalesmen,
  createUser,
  updateUser,
  updatePushToken,
};
