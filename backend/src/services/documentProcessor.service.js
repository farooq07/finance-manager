import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../utils/prisma.js';

// gemini-embedding-001 replaced text-embedding-004; produces 3072-dim vectors
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_API_VERSION = 'v1beta';
const CHUNK_SIZE = 500;      // words per chunk
const CHUNK_OVERLAP = 80;    // word overlap between consecutive chunks
const MAX_CHUNKS = 200;      // safety cap per document

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

/** True when the text is longer than what one document may index. */
export function exceedsIndexLimit(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return words > CHUNK_SIZE + (MAX_CHUNKS - 1) * (CHUNK_SIZE - CHUNK_OVERLAP);
}

export function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let start = 0;

  while (start < words.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_SIZE, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Embedding helpers
// ---------------------------------------------------------------------------

async function embedText(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // text-embedding-004 is only available on the v1 (stable) API, not v1beta
  const model = genAI.getGenerativeModel(
    { model: EMBEDDING_MODEL },
    { apiVersion: EMBEDDING_API_VERSION }
  );
  const result = await model.embedContent(text);
  return result.embedding.values; // float[]
}

async function embedBatch(texts) {
  // Gemini has no batch embed endpoint in the SDK — embed sequentially with small delay
  const embeddings = [];
  for (const text of texts) {
    const vec = await embedText(text);
    embeddings.push(vec);
    // Brief pause to stay inside free-tier rate limits
    await new Promise(r => setTimeout(r, 120));
  }
  return embeddings;
}

// ---------------------------------------------------------------------------
// Store document + chunks
// ---------------------------------------------------------------------------

const STALE_EMBEDDING_MS = 30 * 60 * 1000;

/**
 * Register a document and index it in the background.
 *
 * The document is created as 'embedding' and the call returns at once. The
 * chunks are embedded, then written in ONE transaction: a failure part-way
 * leaves no half-indexed document — it is marked 'failed' with the reason,
 * and only 'ready' documents are searched.
 *
 * Returns { documentId, chunkCount, truncated, status, done } — `done`
 * resolves when indexing has finished (tests and callers that want to wait).
 */
export async function processDocument(userId, filename, mimeType, text) {
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error('No text content found in document');
  const truncated = exceedsIndexLimit(text);

  const doc = await prisma.chatDocument.create({
    data: { user_id: userId, filename, mime_type: mimeType, char_count: text.length, status: 'embedding', truncated }
  });

  const done = indexChunks(doc.id, chunks);
  return { documentId: doc.id, chunkCount: chunks.length, truncated, status: 'embedding', done };
}

async function indexChunks(documentId, chunks) {
  try {
    const embeddings = await embedBatch(chunks);
    // Prisma can't write vector columns: parameterised raw SQL, all or nothing.
    await prisma.$transaction(chunks.map((content, i) => prisma.$executeRaw`
      INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding)
      VALUES (gen_random_uuid()::text, ${documentId}, ${i}, ${content}, ${`[${embeddings[i].join(',')}]`}::vector(3072))
    `));
    await prisma.chatDocument.update({ where: { id: documentId }, data: { status: 'ready', error: null } });
    return 'ready';
  } catch (err) {
    await prisma.chatDocument.update({
      where: { id: documentId },
      data: { status: 'failed', error: `Indexing failed: ${String(err?.message || err).slice(0, 300)}` },
    }).catch(() => {});
    return 'failed';
  }
}

// ---------------------------------------------------------------------------
// Similarity search
// ---------------------------------------------------------------------------

export async function searchChunks(userId, query, topK = 5) {
  if (!process.env.GEMINI_API_KEY) return [];

  let queryEmbedding;
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return [];
  }

  const vec = `[${queryEmbedding.join(',')}]`;

  const rows = await prisma.$queryRaw`
    SELECT
      dc.id,
      dc.content,
      dc.chunk_index,
      cd.filename,
      1 - (dc.embedding <=> ${vec}::vector(3072)) AS similarity
    FROM document_chunks dc
    JOIN chat_documents cd ON cd.id = dc.document_id
    WHERE cd.user_id = ${userId}::uuid AND cd.status = 'ready'
    ORDER BY dc.embedding <=> ${vec}::vector(3072)
    LIMIT ${topK}
  `;

  // Only return chunks with decent similarity
  return rows.filter(r => Number(r.similarity) > 0.55);
}

// ---------------------------------------------------------------------------
// Delete document + all its chunks
// ---------------------------------------------------------------------------

export async function deleteDocument(userId, documentId) {
  const doc = await prisma.chatDocument.findFirst({
    where: { id: documentId, user_id: userId }
  });
  if (!doc) throw new Error('Document not found');
  // Chunks cascade-delete via FK
  await prisma.chatDocument.delete({ where: { id: documentId } });
}

export async function listDocuments(userId, now = new Date()) {
  // A document still 'embedding' long after upload was interrupted (e.g. a
  // restart mid-indexing): report it as failed so the user can retry.
  await prisma.chatDocument.updateMany({
    where: { user_id: userId, status: 'embedding', created_at: { lt: new Date(now.getTime() - STALE_EMBEDDING_MS) } },
    data: { status: 'failed', error: 'Indexing was interrupted. Delete and upload it again.' },
  });
  return prisma.chatDocument.findMany({
    where: { user_id: userId },
    select: { id: true, filename: true, mime_type: true, char_count: true, created_at: true,
              status: true, error: true, truncated: true,
              _count: { select: { chunks: true } } },
    orderBy: { created_at: 'desc' }
  });
}
