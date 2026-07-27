FROM node:20-slim

WORKDIR /app

# Copy root and frontend package definitions
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN npm --prefix frontend install

# Copy application source files
COPY . .

# Build frontend and compile backend TypeScript
RUN npm run build

EXPOSE 3000

ENV PORT=3000

CMD ["npm", "start"]
