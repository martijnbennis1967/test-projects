FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment variable for production
ENV NODE_ENV=production

# Start the backend server
CMD ["npm", "start"]
