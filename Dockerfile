FROM node:18-alpine

# Install OpenSSL for Prisma migrations
RUN apk add --no-cache openssl

WORKDIR /app

# Copy only backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Copy backend code
COPY backend ./

# Create upload directories (Multer needs these)
RUN mkdir -p uploads/statements uploads/wallet-statements

# Expose port
EXPOSE 5000

# Push schema to DB and start server
CMD npx prisma db push --skip-generate && npm start
