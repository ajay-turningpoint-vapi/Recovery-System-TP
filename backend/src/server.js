require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'Payment Collection Management System API',
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

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Payment Collection API Server running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const ALT_PORT = parseInt(PORT, 10) + 1;
    console.log(`Port ${PORT} in use, starting server on fallback port ${ALT_PORT}...`);
    app.listen(ALT_PORT, () => {
      console.log(`  Payment Collection API Server running on fallback port ${ALT_PORT}`);
    });
  } else {
    console.error('Server error:', err);
  }
});

