import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
const stocks = await prisma.stock.findMany({ include: { transactions: true } });
console.log('Stocks (manual):', JSON.stringify(stocks, null, 2));
const psxStocks = await prisma.psxStock.findMany();
console.log('\nPsxStock (live):', psxStocks.map(s => ({
    ticker: s.ticker, price: Number(s.price), change: Number(s.change)
})));
const snapshots = await prisma.psxSnapshot.findMany({ orderBy: { snapshot_date: 'desc' }, take: 1 });
console.log('\nLatest PsxSnapshot count:', snapshots.length);
await prisma.$disconnect();
