import prisma from '../utils/prisma.js';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import XLSX from 'xlsx';

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

// Helper: parse file into array of row objects (supports CSV and Excel)
const parseFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const ext = path.extname(filePath).toLowerCase();

        if (ext === '.xlsx' || ext === '.xls') {
            // Excel file
            try {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        } else {
            // CSV file
            const results = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', (err) => reject(err));
        }
    });
};

// Process CSV/Excel Uploads – supports Meezan Fund formats and legacy
export const uploadPortfolioCSV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = await parseFile(req.file.path);

        let processedCount = 0;
        let createdCount = 0;

        for (const row of results) {
            // --- Detect format by checking header keys ---
            const isMeezanOld = row['Fund Name'] !== undefined;
            const isMeezanNew = row['Funds'] !== undefined;
            const isMeezan = isMeezanOld || isMeezanNew;

            let fundName, fundSymbol, fundType, units, nav, value, gainLossFYTD, gainLossToDate;

            if (isMeezanNew) {
                // New Meezan CSV: Funds, Type, Units, NAV, Investment Value, Gain/Loss (To Date)
                const rawFund = (row['Funds'] || '').trim();
                fundType = (row['Type'] || '').trim();

                // Skip summary rows ("Total", "Portfolio Total", empty)
                if (!rawFund || rawFund.toLowerCase() === 'total' || rawFund.toLowerCase() === 'portfolio total') continue;

                // In new format, Funds column IS the symbol (AMMF, MSF, etc.)
                fundSymbol = rawFund.toUpperCase();
                // Combine symbol + type for unique fund_name (handles duplicate symbols like MSF)
                fundName = fundType ? `${fundSymbol}, ${fundType}` : fundSymbol;

                units = parseFloat((row['Units'] || '0').toString().replace(/,/g, ''));
                nav = parseFloat((row['NAV'] || '0').toString().replace(/,/g, ''));
                value = parseFloat((row['Investment Value'] || '0').toString().replace(/,/g, ''));
                gainLossFYTD = 0;
                gainLossToDate = parseFloat((row['Gain/Loss (To Date)'] || row['Gain/Loss(To Date)'] || '0').toString().replace(/,/g, ''));
            } else if (isMeezanOld) {
                // Old Meezan CSV: Portfolio ID, Fund Name, Units, NAV (PKR), Value (PKR), Gain/Loss FYTD (PKR), Gain/Loss ToDate (PKR)
                fundName = (row['Fund Name'] || '').trim();
                fundType = '';

                if (fundName.toLowerCase() === 'portfolio total' || fundName === '') continue;

                const commaIdx = fundName.indexOf(',');
                fundSymbol = commaIdx > 0 ? fundName.substring(0, commaIdx).trim().toUpperCase() : fundName.split(' ').map(w => w[0]).join('').toUpperCase();

                units = parseFloat((row['Units'] || '0').toString().replace(/,/g, ''));
                nav = parseFloat((row['NAV (PKR)'] || '0').toString().replace(/,/g, ''));
                value = parseFloat((row['Value (PKR)'] || '0').toString().replace(/,/g, ''));
                gainLossFYTD = parseFloat((row['Gain/Loss FYTD (PKR)'] || '0').toString().replace(/,/g, ''));
                gainLossToDate = parseFloat((row['Gain/Loss ToDate (PKR)'] || row['Gain/Loss ToDate(PKR)'] || '0').toString().replace(/,/g, ''));
            } else {
                // Legacy format: symbol, units, nav
                fundSymbol = (row.symbol || '').trim();
                units = parseFloat(row.units || '0');
                nav = parseFloat(row.nav || '0');
                value = units * nav;
                gainLossFYTD = 0;
                gainLossToDate = 0;
                fundName = fundSymbol;
                fundType = '';
            }

            if (!fundSymbol && !fundName) continue; // Skip empty rows

            // Try to find existing fund — match by fund_name (unique composite)
            let existingFund = await prisma.mutualFund.findFirst({
                where: {
                    user_id: req.user.id,
                    fund_name: fundName
                }
            });

            if (existingFund) {
                // UPDATE existing fund
                const investedAmount = Number(existingFund.invested_amount);
                await prisma.mutualFund.update({
                    where: { id: existingFund.id },
                    data: {
                        current_nav: nav,
                        units: units,
                        current_value: value,
                        gain_loss_fytd: gainLossFYTD,
                        gain_loss_since_inception: gainLossToDate
                    }
                });

                // Log history snapshot
                await prisma.mutualFundHistory.create({
                    data: {
                        mutual_fund_id: existingFund.id,
                        nav: nav,
                        value: value
                    }
                });

                processedCount++;
            } else if (isMeezan) {
                // CREATE new fund from Meezan CSV
                const investedAmount = value - gainLossToDate; // Derive invested from value minus total gain/loss

                const fund = await prisma.mutualFund.create({
                    data: {
                        user_id: req.user.id,
                        fund_name: fundName,
                        fund_symbol: fundSymbol,
                        units: units,
                        current_nav: nav,
                        current_value: value,
                        invested_amount: investedAmount,
                        gain_loss_fytd: gainLossFYTD,
                        gain_loss_since_inception: gainLossToDate
                    }
                });

                await prisma.mutualFundHistory.create({
                    data: {
                        mutual_fund_id: fund.id,
                        nav: nav,
                        value: value
                    }
                });

                createdCount++;
                processedCount++;
            }
        }

        // Clean up file
        fs.unlinkSync(req.file.path);

        // --- Save Portfolio Snapshot ---
        if (processedCount > 0) {
            const allFunds = await prisma.mutualFund.findMany({
                where: { user_id: req.user.id },
                orderBy: { fund_symbol: 'asc' }
            });

            const snapTotalValue = allFunds.reduce((s, f) => s + Number(f.current_value), 0);
            const snapTotalGain = allFunds.reduce((s, f) => s + Number(f.gain_loss_since_inception || 0), 0);
            const snapTotalInvested = allFunds.reduce((s, f) => s + Number(f.invested_amount), 0);

            const fundsSnapshot = allFunds.map(f => ({
                fund_symbol: f.fund_symbol,
                fund_name: f.fund_name,
                units: Number(f.units),
                nav: Number(f.current_nav),
                value: Number(f.current_value),
                invested: Number(f.invested_amount),
                gain_loss: Number(f.gain_loss_since_inception || 0)
            }));

            await prisma.portfolioSnapshot.create({
                data: {
                    user_id: req.user.id,
                    total_value: snapTotalValue,
                    total_gain: snapTotalGain,
                    total_invested: snapTotalInvested,
                    funds_data: fundsSnapshot
                }
            });
        }

        const parts = [];
        if (createdCount > 0) parts.push(`${createdCount} new funds created`);
        if (processedCount - createdCount > 0) parts.push(`${processedCount - createdCount} funds updated`);
        const msg = parts.length > 0 ? parts.join(', ') : 'No matching funds found';

        res.status(200).json({
            message: `${msg} from uploaded file`,
            processed: processedCount,
            created: createdCount
        });

    } catch (error) {
        console.error("Error processing file:", error);
        // Clean up file on error too
        if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch (e) { }
        res.status(500).json({ message: 'Error processing portfolio file' });
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

export const bulkDeleteMutualFunds = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No fund IDs provided' });
        }

        await prisma.mutualFund.deleteMany({
            where: {
                id: { in: ids },
                user_id: req.user.id
            }
        });

        res.json({ message: `${ids.length} funds deleted successfully` });
    } catch (error) {
        console.error("Error bulk deleting:", error);
        res.status(500).json({ message: 'Error deleting funds' });
    }
};

export const getPortfolioSnapshots = async (req, res) => {
    try {
        const snapshots = await prisma.portfolioSnapshot.findMany({
            where: { user_id: req.user.id },
            orderBy: { upload_date: 'desc' }
        });
        res.json(snapshots);
    } catch (error) {
        console.error("Error fetching snapshots:", error);
        res.status(500).json({ message: 'Error fetching portfolio snapshots' });
    }
};
