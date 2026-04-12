import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        // Fetch user from database to get role and other info
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'User not found.' });
        }

        req.user = user; // Contains id, email, name, and role
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

export default verifyToken;
