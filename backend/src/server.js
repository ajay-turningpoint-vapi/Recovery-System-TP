require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const prisma = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initScheduler } = require('./services/schedulerService');

// Route imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const customerRoutes = require('./routes/customerRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const followupRoutes = require('./routes/followupRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const importRoutes = require('./routes/importRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Security & HTTP Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', apiLimiter);

// Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'DISCONNECTED';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'CONNECTED';
  } catch (e) {
    dbStatus = 'ERROR';
  }

  res.json({
    status: 'UP',
    system: 'Payment Collection Management System API',
    mariadb_status: dbStatus,
    database: process.env.MARIADB_DATABASE || 'invoicefollowup',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/import', importRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

async function logConnectionStatus(actualPort) {
  const mariaHost = process.env.MARIADB_HOST || '127.0.0.1';
  const mariaPort = process.env.MARIADB_PORT || '3306';
  const mariaUser = process.env.MARIADB_USER || 'root';
  const mariaDb = process.env.MARIADB_DATABASE || 'invoicefollowup';

  const mssqlServer = process.env.DB_SERVER || process.env.MSSQL_SERVER || 'Not Configured';
  const mssqlPort = process.env.DB_PORT || process.env.MSSQL_PORT || '4096';
  const mssqlDb = process.env.DB_DATABASE || process.env.MSSQL_DATABASE || 'BusyComp0009_db12026';
  const mssqlUser = process.env.DB_USER || process.env.MSSQL_USER || 'sa';

  let mariaDbConnected = false;
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    mariaDbConnected = true;
  } catch (err) {
    console.error('⚠️ MariaDB Connection Error:', err.message);
  }

  console.log(`\n================================================================================`);
  console.log(`  🚀 PAYMENT COLLECTION MANAGEMENT SYSTEM API SERVER`);
  console.log(`================================================================================`);
  console.log(`  📡 Server Status : RUNNING on http://localhost:${actualPort}`);
  console.log(`  ⚙️ Environment   : ${process.env.NODE_ENV || 'development'}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`  🐬 MARIADB TARGET DATABASE`);
  console.log(`     • Host     : ${mariaHost}:${mariaPort}`);
  console.log(`     • Database : ${mariaDb}`);
  console.log(`     • User     : ${mariaUser}`);
  console.log(`     • Status   : ${mariaDbConnected ? '✅ CONNECTED & READY' : '❌ CONNECTION FAILED'}`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`  🗄️ MSSQL ERP SOURCE DATABASE CONFIGURATION`);
  console.log(`     • Server   : ${mssqlServer}`);
  console.log(`     • Port     : ${mssqlPort}`);
  console.log(`     • Database : ${mssqlDb}`);
  console.log(`     • User     : ${mssqlUser}`);
  console.log(`     • Status   : 🔗 READY FOR IMPORT SYNC`);
  console.log(`--------------------------------------------------------------------------------`);
  console.log(`  ⏰ AUTOMATED ERP SCHEDULER: RUNS EVERY 30 MINUTES`);
  console.log(`================================================================================\n`);

  // Start automated 30-minute ERP sync cron job
  initScheduler();
}

const server = app.listen(PORT, '0.0.0.0', async () => {
  await logConnectionStatus(PORT);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const ALT_PORT = parseInt(PORT, 10) + 1;
    console.log(`Port ${PORT} in use, starting server on fallback port ${ALT_PORT}...`);
    app.listen(ALT_PORT, '0.0.0.0', async () => {
      await logConnectionStatus(ALT_PORT);
    });
  } else {
    console.error('Server error:', err);
  }
});
