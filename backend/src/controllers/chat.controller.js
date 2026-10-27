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
      const isPdf = mimetype === 'application/pdf' || originalname.toLowerCase().endsWith('.pdf');
      return res.status(422).json(isPdf
        ? { code: 'SCANNED_PDF', message: "This PDF has no text in it — it looks like a scan or photo. Scanned PDFs can't be read yet; upload a PDF with selectable text, or a .txt / .csv file." }
        : { code: 'EMPTY_FILE', message: 'Could not find any text in this file.' });
    }

    const { done, ...result } = await processDocument(req.user.id, originalname, mimetype, text);
    fs.unlinkSync(fPath); // Don't keep the file — chunks are stored in DB
    done.catch(() => {}); // indexing continues in the background; status shows the outcome
    res.status(202).json({
      message: result.truncated
        ? 'Indexing started. This document is long — only its first ~85,000 words will be searchable.'
        : 'Indexing started. It will be searchable in a moment.',
      ...result,
    });
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
    if (status === 409) {
      return res.status(409).json({ code: 'REPLY_IN_PROGRESS', message: err.message });
    }
    if (status === 429) {
      return res.status(429).json({ code: 'AI_RATE_LIMITED', message: 'AI quota exceeded. Please wait a moment and try again.' });
    }
    if (status === 404) {
      return res.status(503).json({ message: 'AI model unavailable. Check GEMINI_API_KEY configuration.' });
    }
    // Nothing was saved for a failed reply — the client can resend the same message.
    res.status(500).json({ code: 'AI_FAILED', message: err?.message || 'Failed to process message. Please try again.', retryable: true });
  }
};
