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

# Expose port
EXPOSE 5000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
