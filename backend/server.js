import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { initCronJobs } from './src/services/cron.service.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Initialize cron jobs after server starts
    initCronJobs();
});
