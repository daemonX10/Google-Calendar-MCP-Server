FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build the application
RUN npm run build

# Create .env file from example if not exists (will be overridden by volume mount)
COPY .env.example .env

# Expose the server port
EXPOSE 3000

# Run the application
CMD ["node", "dist/index.js"]