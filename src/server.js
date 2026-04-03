require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const compression= require('compression');

const connectDB      = require('../config/db');
const errorHandler   = require('./middleware/errorHandler');
const authRoutes     = require('./routes/auth');
const userRoutes     = require('./routes/users');
const txRoutes       = require('./routes/transactions');
const goalRoutes = require('./routes/goals');
const notifRoutes    = require('./routes/notifications');

const app = express();
connectDB();

// ── Security ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Body / logging ──
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ──
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/transactions',  txRoutes);
app.use('/api/goals',         goalRoutes);
app.use('/api/notifications', notifRoutes);

// ── Health ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, uptime: Math.round(process.uptime()) });
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Error handler ──
app.use(errorHandler);

// ── Start ──
const PORT = parseInt(process.env.PORT || '5000');
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀  UniWallet API running on port ${PORT}`);
    console.log(`📌  ENV: ${process.env.NODE_ENV}`);
    console.log(`🩺  Health: http://localhost:${PORT}/health\n`);
  });
}

module.exports = app;