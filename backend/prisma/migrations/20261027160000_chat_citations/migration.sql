-- Chat answers keep the document excerpts and tools they used.
ALTER TABLE "chat_messages" ADD COLUMN "citations" JSONB,
                            ADD COLUMN "tools_used" JSONB;
