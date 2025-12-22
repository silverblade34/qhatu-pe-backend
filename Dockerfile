# Build stage
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Habilitar corepack para usar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar dependencias del sistema para canvas
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Configurar pnpm store
RUN pnpm config set store-dir /root/.local/share/pnpm/store

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN pnpm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /usr/src/app

# Habilitar corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar librerías runtime
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built app
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 4000

# Non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nestjs
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

CMD ["node", "dist/main.js"]