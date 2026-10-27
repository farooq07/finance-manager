import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { TOOL_DEFINITIONS, GROQ_TOOL_DEFINITIONS, executeTool } from './financialTools.js';
import { searchChunks } from './documentProcessor.service.js';
import prisma from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Provider config
//
// Set AI_CHAT_PROVIDER in .env to one of:
//   gemini  — Google Gemini (needs GEMINI_API_KEY)
//             Models: gemini-2.5-flash (default), gemini-2.5-flash-lite,
//                     gemini-2.5-pro. Check the live list before changing —
//                     Google retires old versions (2.0 and 1.5 are gone).
//
//   groq    — Groq (needs GROQ_API_KEY, very generous free tier)
//             Free models: openai/gpt-oss-120b, openai/gpt-oss-20b
//             (llama-3.3-70b-versatile was retired in 2026)
//             Paid models: (same models, higher rate limits)
//
//   openai  — OpenAI (needs OPENAI_API_KEY, paid)
//             Models: gpt-4o-mini (cheap), gpt-4o (best)
//
// Falls back: gemini → groq → error
// ---------------------------------------------------------------------------

const GEMINI_MODEL  = process.env.GEMINI_CHAT_MODEL  || 'gemini-2.5-flash';
const GROQ_MODEL    = process.env.GROQ_CHAT_MODEL    || 'openai/gpt-oss-120b';
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

const MAX_TOOL_ITERATIONS = 6;

const BASE_SYSTEM_PROMPT = `You are a personal finance assistant for a Pakistani user. All monetary amounts are in PKR (Pakistani Rupees) unless stated otherwise. Today is {DATE}.

You can look up the user's real financial data with tools covering: expenses & transactions, income vs expense / cash flow, account & wallet balances (per account, e.g. specific banks), mutual funds, stocks (including today's change), gold, dividends, institutional debt, dues/receivables, physical assets, zakat (given + estimated due), and a complete net-worth overview (getFinancialOverview) for "total worth" / "show me everything" questions.

RULES:
- Answer ONLY using the data returned by the tools or the document excerpts provided — never invent or estimate numbers.
- Call as many tools as needed to fully answer the question. For a broad or compound question (e.g. "give me a full snapshot", "my total worth"), prefer getFinancialOverview, or call several specific tools and combine the results.
- Always mention the time period the data covers.
- Format PKR amounts with commas: PKR 1,23,456.
- If a figure is an estimate (e.g. zakat due, or today's stock change when price coverage is partial), say so.
- If asked something the tools cannot answer, say so clearly and suggest what the user could do.
- Keep answers concise. Use bullet points for lists of items.
- When referencing percentages, round to 2 decimal places.
{DOCUMENT_CONTEXT}`;

function buildSystemPrompt(docContext) {
  const contextSection = docContext
    ? `\nRELEVANT DOCUMENT EXCERPTS (use these to answer document-specific questions):\n${docContext}`
    : '';
  return BASE_SYSTEM_PROMPT
    .replace('{DATE}', TODAY())
    .replace('{DOCUMENT_CONTEXT}', contextSection);
}

// Collect plain text parts from a Gemini response without throwing when the
// candidate only contains function calls (response.text() throws in that case).
function extractGeminiText(response) {
  const parts = response?.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => typeof p.text === 'string').map(p => p.text).join('').trim();
}

// ---------------------------------------------------------------------------
// Gemini provider — multi-tool loop
// ---------------------------------------------------------------------------
async function runGeminiLoop(history, userMessage, systemPrompt, userId) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: TOOL_DEFINITIONS }]
  });

  const geminiHistory = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const session = model.startChat({ history: geminiHistory });
  const toolCalls = [];

  let result = await session.sendMessage(userMessage);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const parts = result.response.candidates?.[0]?.content?.parts || [];
    const fnParts = parts.filter(p => p.functionCall);
    if (fnParts.length === 0) break;

    const responses = [];
    for (const p of fnParts) {
      const name = p.functionCall.name;
      const fnArgs = p.functionCall.args || {};
      let data;
      try {
        data = await executeTool(name, fnArgs, userId);
      } catch (err) {
        data = { error: err.message };
      }
      toolCalls.push({ name, data });
      responses.push({ functionResponse: { name, response: { data } } });
    }

    result = await session.sendMessage(responses);
  }

  let answer = extractGeminiText(result.response);

  // Cap reached while still requesting tools — nudge for a final summary.
  if (!answer && toolCalls.length > 0) {
    const fallback = await session.sendMessage('Summarise the findings above for the user now, using only the data already retrieved.');
    answer = extractGeminiText(fallback.response);
  }

  return { answer, toolCalls };
}

// ---------------------------------------------------------------------------
// Groq / OpenAI-compatible provider — multi-tool loop (same code path)
// ---------------------------------------------------------------------------
async function runOpenAICompatLoop(client, model, history, userMessage, systemPrompt, userId) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const toolCalls = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.chat.completions.create({
      model,
      messages,
      tools: GROQ_TOOL_DEFINITIONS,
      tool_choice: 'auto',
      temperature: 0.3
    });

    const msg = response.choices[0].message;

    if (!msg.tool_calls?.length) {
      return { answer: msg.content || '', toolCalls };
    }

    messages.push(msg);

    for (const call of msg.tool_calls) {
      const name = call.function.name;
      let fnArgs = {};
      try { fnArgs = JSON.parse(call.function.arguments || '{}'); } catch { /* malformed args → empty */ }
      let data;
      try {
        data = await executeTool(name, fnArgs, userId);
      } catch (err) {
        data = { error: err.message };
      }
      toolCalls.push({ name, data });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(data) });
    }
  }

  // Cap reached — force one final answer without tools.
  const final = await client.chat.completions.create({ model, messages, temperature: 0.3 });
  return { answer: final.choices[0].message.content || '', toolCalls };
}

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------
// Sessions with a reply in progress. A second send while the first is still
// being answered (double click, impatient retry) is refused, not answered twice.
const inflight = new Set();
export const HISTORY_TURNS = 20;

export async function chat(userId, sessionId, userMessage) {
  if (inflight.has(sessionId)) {
    throw Object.assign(new Error('Still answering your previous message — one moment.'), { status: 409 });
  }
  inflight.add(sessionId);
  try {
    return await answerMessage(userId, sessionId, userMessage);
  } finally {
    inflight.delete(sessionId);
  }
}

async function answerMessage(userId, sessionId, userMessage) {
  const provider = getProvider();
  const startedAt = new Date();

  // The most recent turns, oldest first — a long conversation keeps its
  // latest context instead of its first 20 messages.
  const past = (await prisma.chatMessage.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: 'desc' },
    take: HISTORY_TURNS
  })).reverse();

  const history = past.filter(m => m.role !== 'tool');

  // Search user's uploaded documents for relevant context
  let docContext = '';
  let citations = [];
  try {
    const relevantChunks = await searchChunks(userId, userMessage, 5);
    if (relevantChunks.length > 0) {
      docContext = relevantChunks
        .map((c, i) => `[${i + 1}] From "${c.filename}" (similarity ${Number(c.similarity).toFixed(2)}):\n${c.content}`)
        .join('\n\n');
      citations = relevantChunks.map((c, i) => ({
        ref: i + 1,
        filename: c.filename,
        similarity: Number(Number(c.similarity).toFixed(2)),
        excerpt: String(c.content || '').slice(0, 240),
      }));
    }
  } catch {
    // pgvector not available or no documents — proceed without context
  }

  const systemPrompt = buildSystemPrompt(docContext);

  let answer = '';
  let toolCalls = [];

  if (provider === 'gemini') {
    ({ answer, toolCalls } = await runGeminiLoop(history, userMessage, systemPrompt, userId));
  } else if (provider === 'groq') {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    ({ answer, toolCalls } = await runOpenAICompatLoop(client, GROQ_MODEL, history, userMessage, systemPrompt, userId));
  } else if (provider === 'openai') {
    // Dynamic import so openai package is optional
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    ({ answer, toolCalls } = await runOpenAICompatLoop(client, OPENAI_MODEL, history, userMessage, systemPrompt, userId));
  }

  // The first tool drives the inline badge / table / chart in the UI. The text
  // answer already incorporates every tool's data when several were called.
  const primary = toolCalls[0] || null;
  const toolName = primary?.name || null;
  const toolData = primary?.data ?? null;
  // Every tool ran during this request; its figures are as of now.
  const tools = toolCalls.map(t => ({ name: t.name, at: startedAt.toISOString() }));

  // The question and its answer are saved together, only once the answer
  // exists — a failed reply leaves nothing half-saved, so retrying is clean.
  const updateData = { updated_at: new Date() };
  if (past.length === 0) updateData.title = userMessage.slice(0, 80);
  await prisma.$transaction([
    prisma.chatMessage.create({
      data: { session_id: sessionId, role: 'user', content: userMessage, created_at: startedAt }
    }),
    prisma.chatMessage.create({
      data: {
        session_id: sessionId,
        role: 'assistant',
        content: answer,
        tool_name: toolName,
        tool_data: toolData ? JSON.parse(JSON.stringify(toolData)) : null,
        citations: citations.length ? citations : undefined,
        tools_used: tools.length ? tools : undefined,
      }
    }),
    prisma.chatSession.update({ where: { id: sessionId }, data: updateData }),
  ]);

  return { answer, toolName, toolData, toolsUsed: toolCalls.map(t => t.name), tools, citations, dataAsOf: startedAt.toISOString(), provider };
}
