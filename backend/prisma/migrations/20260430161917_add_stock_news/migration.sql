-- CreateTable
CREATE TABLE "stock_news" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticker" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "source" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_news_link_key" ON "stock_news"("link");

-- CreateIndex
CREATE INDEX "stock_news_ticker_idx" ON "stock_news"("ticker");
