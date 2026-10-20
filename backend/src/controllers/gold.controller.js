import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';
import { syncGoldPrice } from '../services/goldScraper.service.js';
import {
    NISAB_GRAMS,
    ZAKAT_RATE,
    GRAMS_PER_TOLA,
    valueForItem,
    purchaseValueForItem,
    equivalent24kGrams,
    getLatestPriceRow,
    summarizeGold,
} from '../services/goldValuation.service.js';

const VALID_TYPES   = new Set(['ring', 'set', 'chain', 'bangle', 'earring', 'other']);
const VALID_CARATS  = new Set([18, 20, 21, 22, 24]);
const PIN_MIN_DIGITS = 6;

function validateItemPayload(body, { partial = false } = {}) {
    const errors = [];
    if (!partial || body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) errors.push('name is required');
    }
    if (!partial || body.type !== undefined) {
        if (!VALID_TYPES.has(body.type)) errors.push('type must be one of: ' + [...VALID_TYPES].join(', '));
    }
    if (!partial || body.weight_grams !== undefined) {
        const w = Number(body.weight_grams);
        if (!(w > 0)) errors.push('weight_grams must be > 0');
    }
    if (!partial || body.carats !== undefined) {
        const c = Number(body.carats);
        if (!VALID_CARATS.has(c)) errors.push('carats must be one of: 18, 20, 21, 22, 24');
    }
    return errors;
}

// GET /api/gold/items
export const listItems = async (req, res) => {
    try {
        const [items, priceRow] = await Promise.all([
            prisma.goldItem.findMany({
                where: { user_id: req.user.id },
                orderBy: { created_at: 'desc' },
            }),
            getLatestPriceRow(),
        ]);

        const perGram = priceRow ? Number(priceRow.price_24k_per_gram) : 0;
        const enriched = items.map((i) => ({
            ...i,
            current_value_pkr: valueForItem(i, perGram),
            purchase_value_pkr: purchaseValueForItem(i),
            equivalent_24k_grams: Number(equivalent24kGrams(i).toFixed(3)),
        }));
        const totalValuePkr    = enriched.reduce((s, i) => s + i.current_value_pkr, 0);
        const totalPurchasePkr = enriched.reduce((s, i) => s + (i.purchase_value_pkr ?? 0), 0);
        const itemsWithPurchase = enriched.filter((i) => i.purchase_value_pkr !== null).length;

        res.json({
            items: enriched,
            total_value_pkr: Number(totalValuePkr.toFixed(2)),
            total_purchase_pkr: itemsWithPurchase > 0 ? Number(totalPurchasePkr.toFixed(2)) : null,
            latest_price: priceRow,
        });
    } catch (error) {
        logger.error('[GOLD] listItems failed:', error);
        res.status(500).json({ message: 'Could not load gold items' });
    }
};

// POST /api/gold/items
export const createItem = async (req, res) => {
    try {
        const errors = validateItemPayload(req.body);
        if (errors.length) return res.status(400).json({ message: errors.join(', ') });

        const created = await prisma.goldItem.create({
            data: {
                user_id:                req.user.id,
                name:                   req.body.name.trim(),
                type:                   req.body.type,
                weight_grams:           Number(req.body.weight_grams),
                carats:                 Number(req.body.carats),
                purchase_date:          req.body.purchase_date ? new Date(req.body.purchase_date) : null,
                purchase_price_per_gram: req.body.purchase_price_per_gram != null ? Number(req.body.purchase_price_per_gram) : null,
                image_url:              req.body.image_url || null,
                notes:                  req.body.notes || null,
            },
        });
        res.status(201).json(created);
    } catch (error) {
        logger.error('[GOLD] createItem failed:', error);
        res.status(500).json({ message: 'Could not create gold item' });
    }
};

// PUT /api/gold/items/:id
export const updateItem = async (req, res) => {
    try {
        const existing = await prisma.goldItem.findFirst({
            where: { id: req.params.id, user_id: req.user.id },
        });
        if (!existing) return res.status(404).json({ message: 'Not found' });

        const errors = validateItemPayload(req.body, { partial: true });
        if (errors.length) return res.status(400).json({ message: errors.join(', ') });

        const data = {};
        if (req.body.name !== undefined)                   data.name = req.body.name.trim();
        if (req.body.type !== undefined)                   data.type = req.body.type;
        if (req.body.weight_grams !== undefined)           data.weight_grams = Number(req.body.weight_grams);
        if (req.body.carats !== undefined)                 data.carats = Number(req.body.carats);
        if (req.body.purchase_date !== undefined)          data.purchase_date = req.body.purchase_date ? new Date(req.body.purchase_date) : null;
        if (req.body.purchase_price_per_gram !== undefined) data.purchase_price_per_gram = req.body.purchase_price_per_gram != null ? Number(req.body.purchase_price_per_gram) : null;
        if (req.body.image_url !== undefined)              data.image_url = req.body.image_url || null;
        if (req.body.notes !== undefined)                  data.notes = req.body.notes || null;

        const updated = await prisma.goldItem.update({ where: { id: existing.id }, data });
        res.json(updated);
    } catch (error) {
        logger.error('[GOLD] updateItem failed:', error);
        res.status(500).json({ message: 'Could not update gold item' });
    }
};

// DELETE /api/gold/items/:id
export const deleteItem = async (req, res) => {
    try {
        const existing = await prisma.goldItem.findFirst({
            where: { id: req.params.id, user_id: req.user.id },
        });
        if (!existing) return res.status(404).json({ message: 'Not found' });
        await prisma.goldItem.delete({ where: { id: existing.id } });
        res.json({ ok: true });
    } catch (error) {
        logger.error('[GOLD] deleteItem failed:', error);
        res.status(500).json({ message: 'Could not delete gold item' });
    }
};

// POST /api/gold/sync-price — manual trigger of the scraper.
export const syncPrice = async (req, res) => {
    try {
        const row = await syncGoldPrice();
        res.json(row);
    } catch (error) {
        logger.error('[GOLD] manual syncPrice failed:', error.message);
        res.status(502).json({ message: 'Could not sync gold price right now. Try again later.' });
    }
};

// GET /api/gold/price-history?days=30
export const priceHistory = async (req, res) => {
    try {
        const days  = Math.min(Math.max(parseInt(req.query.days || '30', 10) || 30, 1), 730);
        const since = new Date();
        since.setDate(since.getDate() - days);

        const rows = await prisma.goldPriceHistory.findMany({
            where: { date: { gte: since } },
            orderBy: { date: 'asc' },
            select: { date: true, price_24k_per_gram: true, price_24k_per_tola: true },
        });
        res.json(rows);
    } catch (error) {
        logger.error('[GOLD] priceHistory failed:', error);
        res.status(500).json({ message: 'Could not load price history' });
    }
};

// GET /api/gold/latest-price — newest row + per-carat derived prices.
export const latestPrice = async (req, res) => {
    try {
        const row = await getLatestPriceRow();
        if (!row) return res.json({ row: null, per_carat: null });

        const perGram24 = Number(row.price_24k_per_gram);
        const perTola24 = Number(row.price_24k_per_tola);

        const per_carat = {};
        for (const c of [24, 22, 21, 20, 18]) {
            const factor = c / 24;
            per_carat[`${c}k`] = {
                per_gram: Number((perGram24 * factor).toFixed(2)),
                per_tola: Number((perTola24 * factor).toFixed(2)),
            };
        }
        res.json({ row, per_carat });
    } catch (error) {
        logger.error('[GOLD] latestPrice failed:', error);
        res.status(500).json({ message: 'Could not load latest price' });
    }
};

// GET /api/gold/has-pin
export const hasPin = async (req, res) => {
    try {
        const pin = await prisma.goldPin.findUnique({ where: { user_id: req.user.id } });
        res.json({ hasGoldPin: !!pin });
    } catch (error) {
        logger.error('[GOLD] hasPin failed:', error);
        res.status(500).json({ message: 'Could not check PIN status' });
    }
};

// POST /api/gold/set-pin — idempotent create-or-replace.
export const setPin = async (req, res) => {
    try {
        const pin = String(req.body.pin || '');
        if (!/^\d+$/.test(pin) || pin.length < PIN_MIN_DIGITS) {
            return res.status(400).json({ message: `PIN must be at least ${PIN_MIN_DIGITS} digits` });
        }
        const hash = await bcrypt.hash(pin, 10);
        await prisma.goldPin.upsert({
            where: { user_id: req.user.id },
            create: { user_id: req.user.id, pin_hash: hash },
            update: { pin_hash: hash },
        });
        res.json({ message: 'Gold PIN set' });
    } catch (error) {
        logger.error('[GOLD] setPin failed:', error);
        res.status(500).json({ message: 'Could not set PIN' });
    }
};

// POST /api/gold/change-pin
export const changePin = async (req, res) => {
    try {
        const currentPin = String(req.body.currentPin || '');
        const newPin     = String(req.body.newPin || '');
        if (!/^\d+$/.test(newPin) || newPin.length < PIN_MIN_DIGITS) {
            return res.status(400).json({ message: `New PIN must be at least ${PIN_MIN_DIGITS} digits` });
        }

        const existing = await prisma.goldPin.findUnique({ where: { user_id: req.user.id } });
        if (!existing) return res.status(400).json({ message: 'No PIN set yet' });

        const ok = await bcrypt.compare(currentPin, existing.pin_hash);
        if (!ok) return res.status(401).json({ message: 'Current PIN is incorrect' });

        const hash = await bcrypt.hash(newPin, 10);
        await prisma.goldPin.update({ where: { user_id: req.user.id }, data: { pin_hash: hash } });
        res.json({ message: 'Gold PIN changed' });
    } catch (error) {
        logger.error('[GOLD] changePin failed:', error);
        res.status(500).json({ message: 'Could not change PIN' });
    }
};

// POST /api/gold/verify-pin — confirms only; does not mint a new JWT.
export const verifyPin = async (req, res) => {
    try {
        const pin = String(req.body.pin || '');
        if (!pin) return res.status(400).json({ success: false, message: 'PIN required' });
        const existing = await prisma.goldPin.findUnique({ where: { user_id: req.user.id } });
        if (!existing) return res.status(400).json({ success: false, message: 'No PIN set yet' });
        const ok = await bcrypt.compare(pin, existing.pin_hash);
        res.json({ success: ok });
    } catch (error) {
        logger.error('[GOLD] verifyPin failed:', error);
        res.status(500).json({ success: false, message: 'Could not verify PIN' });
    }
};

// GET /api/gold/zakat-summary — computes nisab + zakat due on the user's gold.
export const zakatSummary = async (req, res) => {
    try {
        const [items, priceRow] = await Promise.all([
            prisma.goldItem.findMany({ where: { user_id: req.user.id } }),
            getLatestPriceRow(),
        ]);

        const perGram = priceRow ? Number(priceRow.price_24k_per_gram) : 0;

        const { total24kGrams, totalValue } = summarizeGold(items, perGram);

        const isNisabMet     = total24kGrams >= NISAB_GRAMS;
        const nisabValuePkr  = perGram ? Number((NISAB_GRAMS * perGram).toFixed(2)) : 0;
        const zakatDuePkr    = isNisabMet ? Number((totalValue * ZAKAT_RATE).toFixed(2)) : 0;

        res.json({
            item_count: items.length,
            total_24k_equivalent_grams: Number(total24kGrams.toFixed(3)),
            total_value_pkr: Number(totalValue.toFixed(2)),
            nisab_gold_grams: NISAB_GRAMS,
            nisab_value_pkr: nisabValuePkr,
            is_nisab_met: isNisabMet,
            zakat_rate: ZAKAT_RATE,
            zakat_due_pkr: zakatDuePkr,
            grams_per_tola: GRAMS_PER_TOLA,
            latest_price: priceRow,
        });
    } catch (error) {
        logger.error('[GOLD] zakatSummary failed:', error);
        res.status(500).json({ message: 'Could not compute zakat summary' });
    }
};
