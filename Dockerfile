# Official Playwright image: Node 22 LTS plus Chromium and the system
# libraries the PSX / gold scrapers need. Keep the tag in step with the
# playwright version in backend/package-lock.json.
FROM mcr.microsoft.com/playwright:v1.58.2-noble

ENV NODE_ENV=production
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma

# Reproducible install from the lockfile. Dev dependencies are kept because
# the prisma CLI (a devDependency) applies migrations at start-up.
RUN npm ci --include=dev
RUN npx prisma generate

COPY backend ./

# Multer upload directories
RUN mkdir -p uploads/statements uploads/wallet-statements

EXPOSE 5000

# Apply the reviewed migrations in prisma/migrations, then start. Never
# `prisma db push` here: it skips data migrations and can drift the schema.
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
