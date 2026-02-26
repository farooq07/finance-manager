import prisma from '../utils/prisma.js';
import fs from 'fs';
import csv from 'csv-parser';

// Format PKR Currency helper
const formatPKR = (num) => {
    return Number(num).toFixed(2);
};

export const getMutualFunds = async (req, res) => {
    try {
        const funds = await prisma.mutualFund.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' }
        });

        // Calculate Portfolio Totals
        const totalInvested = funds.reduce((acc, fund) => acc + Number(fund.invested_amount), 0);
        const currentTotalValue = funds.reduce((acc, fund) => acc + Number(fund.current_value), 0);

        res.json({
            funds,
            portfolioSummary: {
                totalInvestmentPKR: formatPKR(totalInvested),
                currentValuePKR: formatPKR(currentTotalValue),
                totalGainLossPKR: formatPKR(currentTotalValue - totalInvested)
            }
        });
    } catch (error) {
        console.error("Error fetching funds:", error);
        res.status(500).json({ message: 'Error fetching mutual funds' });
    }
};

export const createMutualFund = async (req, res) => {
    try {
        const { fund_name, fund_symbol, units, current_nav, invested_amount } = req.body;

        const currentValue = Number(units) * Number(current_nav);
        const gainLoss = currentValue - Number(invested_amount);

        const fund = await prisma.mutualFund.create({
            data: {
                user_id: req.user.id,
                fund_name,
                fund_symbol,
                units,
                current_nav,
                current_value: currentValue,
                invested_amount,
                gain_loss_fytd: gainLoss,
                gain_loss_since_inception: gainLoss
            }
        });

        // Initialize first history snapshot
        await prisma.mutualFundHistory.create({
            data: {
                mutual_fund_id: fund.id,
                nav: current_nav,
                value: currentValue
            }
        });

        res.status(201).json(fund);
    } catch (error) {
        console.error("Error creating fund:", error);
        res.status(500).json({ message: 'Error creating mutual fund' });
    }
};

// Process CSV Uploads
export const uploadPortfolioCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No CSV file uploaded' });
        }

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {

                let processedCount = 0;

                // Loop through parsed CSV rows: Expected headers -> symbol, units, nav
                for (const row of results) {
                    // Try to find the fund by symbol for this user
                    const existingFund = await prisma.mutualFund.findFirst({
                        where: {
                            user_id: req.user.id,
                            fund_symbol: row.symbol
                        }
                    });

                    if (existingFund) {
                        const newNav = Number(row.nav);
                        const newUnits = Number(row.units);
                        const newValue = newNav * newUnits;

                        // Calculate new P&L
                        const newGainLoss = newValue - Number(existingFund.invested_amount);

                        // Update the main fund tracker
                        await prisma.mutualFund.update({
                            where: { id: existingFund.id },
                            data: {
                                current_nav: newNav,
                                units: newUnits,
                                current_value: newValue,
                                gain_loss_fytd: newGainLoss, // Simplified for this prototype
                                gain_loss_since_inception: newGainLoss
                            }
                        });

                        // Log history snapshot
                        await prisma.mutualFundHistory.create({
                            data: {
                                mutual_fund_id: existingFund.id,
                                nav: newNav,
                                value: newValue
                            }
                        });

                        processedCount++;
                    }
                }

                // Clean up file
                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `Successfully processed ${processedCount} funds from CSV`,
                    processed: processedCount
                });
            });

    } catch (error) {
        console.error("Error processing CSV:", error);
        res.status(500).json({ message: 'Error processing portfolio CSV' });
    }
};

export const deleteMutualFund = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.mutualFund.findUnique({ where: { id } });
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ message: 'Mutual Fund not found' });
        }

        await prisma.mutualFund.delete({ where: { id } });
        res.json({ message: 'Mutual fund deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting mutual fund' });
    }
};
