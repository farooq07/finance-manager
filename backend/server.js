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
import { initCronJobs } from './src/services/cron.service.js';

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

app.use(express.json());

// Rate limiting: 10 requests per 15 minutes on auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for GET /auth/me — it's a token validation check, not a login attempt
    skip: (req) => req.method === 'GET' && req.path === '/me'
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

// Root route / Health check
app.get('/', (req, res) => {
    res.json({
        message: 'Finance Manager API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Initialize cron jobs after server starts
    initCronJobs();
});
