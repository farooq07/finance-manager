import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import verifyToken from '../middleware/auth.middleware.js';
import { createSession, getSessions, getSession, deleteSession, sendMessage, uploadDocument, getDocuments, removeDocument } from '../controllers/chat.controller.js';

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many messages. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Multer for document uploads (PDF, TXT, MD, CSV) — stored temporarily
const CHAT_DOCS_DIR = 'uploads/chat-docs/';
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the upload dir exists — multer errors with a 500 otherwise.
    fs.mkdirSync(CHAT_DOCS_DIR, { recursive: true });
    cb(null, CHAT_DOCS_DIR);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, suffix + path.extname(file.originalname));
  }
});

const docFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.pdf', '.txt', '.md', '.csv'];
  if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, TXT, MD, or CSV files are allowed'), false);
  }
};

const docUpload = multer({ storage: docStorage, fileFilter: docFilter, limits: { fileSize: 20 * 1024 * 1024 } });

router.use(verifyToken);

// Chat sessions
router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/sessions/:id/message', chatLimiter, sendMessage);

// Document (RAG) routes
router.get('/documents', getDocuments);
router.post('/documents/upload', docUpload.single('file'), uploadDocument);
router.delete('/documents/:docId', removeDocument);

export default router;
