import prisma from '../utils/prisma.js';
import { chat } from '../services/ragEngine.service.js';
import { processDocument, deleteDocument, listDocuments } from '../services/documentProcessor.service.js';
import { extractPdfText } from '../services/pdfParser.service.js';
import fs from 'fs';

export const createSession = async (req, res) => {
  try {
    const session = await prisma.chatSession.create({
      data: { user_id: req.user.id }
    });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create session' });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { user_id: req.user.id },
      orderBy: { updated_at: 'desc' },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        _count: { select: { messages: true } }
      }
    });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch sessions' });
  }
};

export const getSession = async (req, res) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, user_id: req.user.id },
      include: {
        messages: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch session' });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!session) return res.status(404).json({ message: 'Session not found' });

    await prisma.chatSession.delete({ where: { id: req.params.id } });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete session' });
  }
};

// ── Document endpoints ───────────────────────────────────────────────────────

export const uploadDocument = async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const { originalname, mimetype, path: fPath } = req.file;
    let text = '';

    if (mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf')) {
      const pdfData = await extractPdfText(fPath);
      text = pdfData.rawText;
    } else {
      // Plain text / markdown / CSV treated as raw text
      text = fs.readFileSync(fPath, 'utf-8');
    }

    if (!text?.trim()) {
      fs.unlinkSync(fPath);
      return res.status(400).json({ message: 'Could not extract any text from the file' });
    }

    const result = await processDocument(req.user.id, originalname, mimetype, text);
    fs.unlinkSync(fPath); // Don't keep the file — chunks are stored in DB
    res.status(201).json({ message: 'Document processed', ...result });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Document upload error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to process document' });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const docs = await listDocuments(req.user.id);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

export const removeDocument = async (req, res) => {
  try {
    await deleteDocument(req.user.id, req.params.docId);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(err.message === 'Document not found' ? 404 : 500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────

export const sendMessage = async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!session) return res.status(404).json({ message: 'Session not found' });

    const result = await chat(req.user.id, req.params.id, message.trim());
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err?.message || err);
    const status = err?.status || 500;
    if (status === 429) {
      return res.status(429).json({ message: 'AI quota exceeded. Please wait a moment and try again.' });
    }
    if (status === 404) {
      return res.status(503).json({ message: 'AI model unavailable. Check GEMINI_API_KEY configuration.' });
    }
    res.status(500).json({ message: err?.message || 'Failed to process message. Please try again.' });
  }
};
