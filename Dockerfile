FROM node:20-alpine

WORKDIR /app

# Install deps for both server and client build
COPY package.json ./
COPY client/package.json ./client/
RUN npm install
RUN cd client && npm install

# Copy source
COPY . .

# Build the React frontend
RUN cd client && npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server/index.js"]