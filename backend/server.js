import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import authRoutes from './src/routes/auth.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import expenseRoutes from './src/routes/expense.routes.js';
import mutualFundRoutes from './src/routes/mutualFund.routes.js';
import stockRoutes from './src/routes/stock.routes.js';
import duesRoutes from './src/routes/dues.routes.js';
import rentRoutes from './src/routes/rent.routes.js';
import psxRoutes from './src/routes/psx.routes.js';
import walletRoutes from './src/routes/wallet.routes.js';
import bankRoutes from './src/routes/bank.routes.js';
import institutionRoutes from './src/routes/institution.routes.js';
import brokerRoutes from './src/routes/broker.routes.js';
import zakatRoutes from './src/routes/zakat.routes.js';
import assetRoutes from './src/routes/asset.routes.js';
import userRoutes from './src/routes/user.routes.js';
import dividendRoutes from './src/routes/dividend.routes.js';
import roleRoutes from './src/routes/role.routes.js';
import beneficiaryRoutes from './src/routes/beneficiary.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import menuVisibilityRoutes from './src/routes/menuVisibility.routes.js';
import exportRoutes from './src/routes/export.routes.js';
import networthRoutes from './src/routes/networth.routes.js';
import recurringRoutes from './src/routes/recurring.routes.js';
import debtRoutes from './src/routes/debt.routes.js';
import fxRateRoutes from './src/routes/fxRate.routes.js';
import goldRoutes from './src/routes/gold.routes.js';
import feedbackRoutes from './src/routes/feedback.routes.js';
import watchlistRoutes from './src/routes/watchlist.routes.js';
import healthRoutes from './src/routes/health.routes.js';
import budgetRoutes from './src/routes/budget.routes.js';
import { initCronJobs, stopCronJobs } from './src/services/cron.service.js';
import prisma from './src/utils/prisma.js';
import logger from './src/utils/logger.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

// In production: silence non-essential console output to reduce log noise / cost.
// Errors and warnings still go through.
if (process.env.NODE_ENV === 'production') {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
}

const app = express();

// Trust the first proxy hop (Railway sits behind a reverse proxy).
// Required so express-rate-limit can use X-Forwarded-For for client IPs.
app.set('trust proxy', 1);

// CORS: Lock to specific origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Bodies are small JSON by default; only the two endpoints that carry an
// image inside the JSON (gold photo, feedback screenshot) may be larger.
// The images themselves are validated (type, ≤ 2 MB) by utils/images.js.
app.use(['/api/gold/items', '/api/feedback'], express.json({ limit: '3mb' }));
// A reviewed statement (thousands of rows) is committed as JSON.
const statementJson = express.json({ limit: '5mb' });
app.use((req, res, next) => (/\/statements\/commit$/.test(req.path) ? statementJson(req, res, next) : next()));
app.use(express.json({ limit: '200kb' }));

// Rate limiting: 10 requests per 15 minutes on auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip read-only / public auth endpoints — they aren't login attempts and
    // would otherwise lock users out on normal page loads.
    // App-unlock PIN checks have their own per-account limit (5 wrong → signed out).
    skip: (req) => (req.method === 'GET' && req.path === '/me')
        || (req.method === 'GET' && req.path === '/config')
        || (req.method === 'POST' && req.path === '/verify-pin')
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/mutual-funds', mutualFundRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/dues', duesRoutes);
app.use('/api/rents', rentRoutes);
app.use('/api/psx', psxRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/broker-accounts', brokerRoutes);
app.use('/api/zakat', zakatRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dividends', dividendRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/menu-visibility', menuVisibilityRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/networth', networthRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/fx', fxRateRoutes);
app.use('/api/gold', goldRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/budgets', budgetRoutes);

// Root route / Health check
app.get('/', (req, res) => {
    res.json({
        message: 'Finance Manager API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;

// Oversized or malformed JSON → a clear JSON error instead of an HTML page.
app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({ code: 'TOO_LARGE', message: 'That upload is too large.' });
    }
    if (err?.type === 'entity.parse.failed') {
        return res.status(400).json({ code: 'VALIDATION', message: 'The request was not valid JSON.' });
    }
    return next(err);
});

// Secrets at rest must not depend on the login-token secret: rotating
// JWT_SECRET would otherwise make every stored statement password unreadable.
if (process.env.NODE_ENV === 'production' && !process.env.STATEMENT_ENCRYPTION_KEY) {
    logger.error('[Startup] STATEMENT_ENCRYPTION_KEY is not set — stored secrets are encrypted with a key derived from JWT_SECRET. Set a dedicated key (and re-encrypt) before rotating JWT_SECRET.');
}

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize cron jobs after server starts
    initCronJobs();
});

// Graceful shutdown (Railway sends SIGTERM on every deploy): stop taking new
// requests and jobs, let in-flight requests finish, then close the database.
let shuttingDown = false;
function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.warn(`[Shutdown] ${signal} received — draining`);
    stopCronJobs();
    const force = setTimeout(() => process.exit(1), 25_000);
    force.unref();
    server.close(async () => {
        await prisma.$disconnect().catch(() => {});
        process.exit(0);
    });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
