FROM node:18-alpine

WORKDIR /app

# Copy only backend
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy backend code
COPY backend ./

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
