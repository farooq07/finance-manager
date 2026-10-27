import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { encryptSecret, decryptSecret } from '../utils/crypto.js';
import { AUTH_CODES, authError, isFreshLogin } from '../utils/session.js';

const isEncrypted = (v) => typeof v === 'string' && v.startsWith('v1:');

// The broker PIN never leaves the server in a list — only via reveal-pin.
const publicShape = ({ stock_pin_code, ...rest }) => ({ ...rest, has_stock_pin: !!stock_pin_code });

// Get user's broker accounts
export const getBrokerAccounts = async (req, res) => {
    try {
        const brokerAccounts = await prisma.brokerAccount.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' }
        });

        // PINs saved before encryption existed are encrypted on first read.
        await Promise.all(brokerAccounts
            .filter((b) => b.stock_pin_code && !isEncrypted(b.stock_pin_code))
            .map((b) => prisma.brokerAccount.update({
                where: { id: b.id },
                data: { stock_pin_code: encryptSecret(b.stock_pin_code) },
            })));

        res.json(brokerAccounts.map(publicShape));
    } catch (error) {
        console.error('Get Broker Accounts API Error:', error);
        res.status(500).json({ message: 'Failed to fetch broker accounts' });
    }
};

// Create new broker account
export const createBrokerAccount = async (req, res) => {
    try {
        const { account_title, client_code, participant_acc_no, cdc_sub_acc_no, stock_pin_code } = req.body;

        if (!account_title || !client_code) {
            return res.status(400).json({ message: 'Account Title and Client Code are required' });
        }

        const brokerAccount = await prisma.brokerAccount.create({
            data: {
                user_id: req.user.id,
                account_title,
                client_code,
                participant_acc_no: participant_acc_no || null,
                cdc_sub_acc_no: cdc_sub_acc_no || null,
                stock_pin_code: stock_pin_code ? encryptSecret(String(stock_pin_code)) : null
            }
        });

        res.status(201).json(publicShape(brokerAccount));
    } catch (error) {
        console.error('Create Broker Account API Error:', error);
        res.status(500).json({ message: 'Failed to create broker account' });
    }
};

// POST /api/broker/:id/reveal-pin { appPin } — show the stored broker PIN.
// Needs the app PIN (or, for accounts without one, a sign-in in the last few minutes).
export const revealBrokerPin = async (req, res) => {
    try {
        const broker = await prisma.brokerAccount.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
        if (!broker) return res.status(404).json({ message: 'Broker account not found' });

        const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { app_pin_code: true } });
        if (user?.app_pin_code) {
            const ok = await bcrypt.compare(String(req.body?.appPin ?? ''), user.app_pin_code);
            if (!ok) return authError(res, 401, AUTH_CODES.WRONG_PIN, 'Incorrect app PIN');
        } else if (!isFreshLogin(req)) {
            return authError(res, 403, AUTH_CODES.REAUTH_REQUIRED, 'Set an app PIN, or sign in again, to view this PIN.');
        }

        const stored = broker.stock_pin_code;
        res.json({ stock_pin_code: stored ? (isEncrypted(stored) ? decryptSecret(stored) : stored) : null });
    } catch (error) {
        console.error('Reveal broker PIN error:', error);
        res.status(500).json({ message: 'Could not show the PIN' });
    }
};

// Delete broker account
export const deleteBrokerAccount = async (req, res) => {
    try {
        const { id } = req.params;

        const brokerAccount = await prisma.brokerAccount.findUnique({
            where: { id }
        });

        if (!brokerAccount) {
            return res.status(404).json({ message: 'Broker account not found' });
        }

        if (brokerAccount.user_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this account' });
        }

        await prisma.brokerAccount.delete({
            where: { id }
        });

        res.json({ message: 'Broker account deleted successfully' });
    } catch (error) {
        console.error('Delete Broker Account API Error:', error);
        res.status(500).json({ message: 'Failed to delete broker account' });
    }
};
