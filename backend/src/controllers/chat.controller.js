import prisma from '../utils/prisma.js';
import { chat } from '../services/ragEngine.service.js';

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
