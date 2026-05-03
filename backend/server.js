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
import { initCronJobs } from './src/services/cron.service.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

const app = express();

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
    legacyHeaders: false
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
