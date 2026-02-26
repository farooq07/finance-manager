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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
