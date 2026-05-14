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

function chunkText(text) {
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

export async function processDocument(userId, filename, mimeType, text) {
  const chunks = chunkText(text);
  if (chunks.length === 0) throw new Error('No text content found in document');

  // Create the document record
  const doc = await prisma.chatDocument.create({
    data: { user_id: userId, filename, mime_type: mimeType, char_count: text.length }
  });

  // Embed all chunks
  let embeddings;
  try {
    embeddings = await embedBatch(chunks);
  } catch (err) {
    // Embedding failed — delete the document and re-throw
    await prisma.chatDocument.delete({ where: { id: doc.id } });
    throw new Error(`Embedding failed: ${err.message}`);
  }

  // Store chunks with embeddings using raw SQL (Prisma can't write vector columns)
  for (let i = 0; i < chunks.length; i++) {
    const vec = `[${embeddings[i].join(',')}]`;
    await prisma.$executeRaw`
      INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding)
      VALUES (
        gen_random_uuid()::text,
        ${doc.id},
        ${i},
        ${chunks[i]},
        ${vec}::vector(3072)
      )
    `;
  }

  return { documentId: doc.id, chunkCount: chunks.length };
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
    WHERE cd.user_id = ${userId}::uuid
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

export async function listDocuments(userId) {
  return prisma.chatDocument.findMany({
    where: { user_id: userId },
    select: { id: true, filename: true, mime_type: true, char_count: true, created_at: true,
              _count: { select: { chunks: true } } },
    orderBy: { created_at: 'desc' }
  });
}
