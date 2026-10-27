-- Document processing state for the AI assistant's uploaded documents.
ALTER TABLE "chat_documents" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'ready',
                             ADD COLUMN "error" TEXT,
                             ADD COLUMN "truncated" BOOLEAN NOT NULL DEFAULT false;
