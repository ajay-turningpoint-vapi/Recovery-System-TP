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

async function createUser(req, res, next) {
  try {
    const { username, password, name, role = 'SALESMAN', salesman_code, mobile, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ success: false, message: 'Username, password, and name are required' });
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

module.exports = {
  getUsers,
  createUser,
  updateUser,
};
