import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { TOOL_DEFINITIONS, GROQ_TOOL_DEFINITIONS, executeTool } from './financialTools.js';
import prisma from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Provider config
//
// Set AI_CHAT_PROVIDER in .env to one of:
//   gemini  — Google Gemini (needs GEMINI_API_KEY)
//             Free tier models: gemini-2.0-flash, gemini-1.5-flash-8b
//             Paid models:      gemini-2.5-pro, gemini-2.5-flash
//
//   groq    — Groq (needs GROQ_API_KEY, very generous free tier)
//             Free models: llama-3.3-70b-versatile, llama-3.1-8b-instant
//             Paid models: (same models, higher rate limits)
//
//   openai  — OpenAI (needs OPENAI_API_KEY, paid)
//             Models: gpt-4o-mini (cheap), gpt-4o (best)
//
// Falls back: gemini → groq → error
// ---------------------------------------------------------------------------

const GEMINI_MODEL  = process.env.GEMINI_CHAT_MODEL  || 'gemini-2.0-flash';
const GROQ_MODEL    = process.env.GROQ_CHAT_MODEL    || 'llama-3.3-70b-versatile';
const OPENAI_MODEL  = process.env.OPENAI_CHAT_MODEL  || 'gpt-4o-mini';

function getProvider() {
  const configured = (process.env.AI_CHAT_PROVIDER || '').toLowerCase();
  if (configured === 'groq'   && process.env.GROQ_API_KEY)   return 'groq';
  if (configured === 'openai' && process.env.OPENAI_API_KEY)  return 'openai';
  if (configured === 'gemini' && process.env.GEMINI_API_KEY)  return 'gemini';
  // Auto-detect fallback
  if (process.env.GROQ_API_KEY)   return 'groq';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  throw new Error('No AI provider configured. Set AI_CHAT_PROVIDER and the matching API key.');
}

const TODAY = () => new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

const SYSTEM_PROMPT = `You are a personal finance assistant. All monetary amounts are in PKR (Pakistani Rupees) unless stated otherwise. Today is {DATE}.

RULES:
- Answer ONLY using the data returned by the tools — never invent or estimate numbers.
- Always mention the time period the data covers.
- Format PKR amounts with commas: PKR 1,23,456.
- If asked something the tools cannot answer, say so clearly and suggest what the user could do.
- Keep answers concise. Use bullet points for lists of items.
- When referencing percentages, round to 2 decimal places.`;

// ---------------------------------------------------------------------------
// Gemini provider
// ---------------------------------------------------------------------------
async function chatWithGemini(history, userMessage) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: SYSTEM_PROMPT.replace('{DATE}', TODAY()),
    tools: [{ functionDeclarations: TOOL_DEFINITIONS }]
  });

  const geminiHistory = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const session = model.startChat({ history: geminiHistory });
  const result1 = await session.sendMessage(userMessage);
  const parts = result1.response.candidates?.[0]?.content?.parts || [];
  const fnCallPart = parts.find(p => p.functionCall);

  if (!fnCallPart) return { toolName: null, toolArgs: null, rawResult: result1 };

  return {
    toolName: fnCallPart.functionCall.name,
    toolArgs: fnCallPart.functionCall.args || {},
    // Pass session so we can do turn 2
    _session: session
  };
}

async function geminiTurn2(session, toolName, toolData) {
  const result2 = await session.sendMessage([{
    functionResponse: { name: toolName, response: { data: toolData } }
  }]);
  return result2.response.text();
}

// ---------------------------------------------------------------------------
// Groq / OpenAI-compatible provider (same code path, different client)
// ---------------------------------------------------------------------------
async function chatWithOpenAICompat(client, model, history, userMessage) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT.replace('{DATE}', TODAY()) },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    tools: GROQ_TOOL_DEFINITIONS,
    tool_choice: 'auto',
    temperature: 0.3
  });

  const msg = response.choices[0].message;
  if (!msg.tool_calls?.length) return { toolName: null, toolArgs: null, answer: msg.content };

  const call = msg.tool_calls[0];
  return {
    toolName: call.function.name,
    toolArgs: JSON.parse(call.function.arguments || '{}'),
    _messages: messages,
    _toolCallId: call.id,
    _client: client,
    _model: model,
    _assistantMsg: msg
  };
}

async function openAICompatTurn2(ctx, toolName, toolData) {
  const { _messages, _toolCallId, _client, _model, _assistantMsg } = ctx;
  const messages = [
    ..._messages,
    _assistantMsg,
    {
      role: 'tool',
      tool_call_id: _toolCallId,
      content: JSON.stringify(toolData)
    }
  ];

  const result2 = await _client.chat.completions.create({
    model: _model,
    messages,
    temperature: 0.3
  });

  return result2.choices[0].message.content;
}

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------
export async function chat(userId, sessionId, userMessage) {
  const provider = getProvider();

  const past = await prisma.chatMessage.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'asc' },
    take: 20
  });

  const history = past.filter(m => m.role !== 'tool');

  await prisma.chatMessage.create({
    data: { session_id: sessionId, role: 'user', content: userMessage }
  });

  let turn1;
  if (provider === 'gemini') {
    turn1 = await chatWithGemini(history, userMessage);
  } else if (provider === 'groq') {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    turn1 = await chatWithOpenAICompat(client, GROQ_MODEL, history, userMessage);
  } else if (provider === 'openai') {
    // Dynamic import so openai package is optional
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    turn1 = await chatWithOpenAICompat(client, OPENAI_MODEL, history, userMessage);
  }

  let toolName = turn1.toolName;
  let toolData = null;
  let answer = '';

  if (toolName) {
    try {
      toolData = await executeTool(toolName, turn1.toolArgs, userId);
    } catch (err) {
      toolData = { error: err.message };
    }

    if (provider === 'gemini') {
      answer = await geminiTurn2(turn1._session, toolName, toolData);
    } else {
      answer = await openAICompatTurn2(turn1, toolName, toolData);
    }
  } else {
    answer = turn1.answer || turn1.rawResult?.response?.text() || '';
  }

  await prisma.chatMessage.create({
    data: {
      session_id: sessionId,
      role: 'assistant',
      content: answer,
      tool_name: toolName,
      tool_data: toolData ? JSON.parse(JSON.stringify(toolData)) : null
    }
  });

  const updateData = { updated_at: new Date() };
  if (past.length === 0) updateData.title = userMessage.slice(0, 80);
  await prisma.chatSession.update({ where: { id: sessionId }, data: updateData });

  return { answer, toolName, toolData, provider };
}
