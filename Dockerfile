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
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Configurar pnpm para permitir scripts de Prisma
RUN pnpm config set auto-install-peers true

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copiar schema de Prisma ANTES de generar
COPY prisma ./prisma

# Generar cliente de Prisma explícitamente
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build
RUN pnpm run build

# Production stage
FROM node:20-slim AS production
WORKDIR /usr/src/app

# Habilitar corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Instalar OpenSSL (requerido por Prisma en runtime)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copiar schema de Prisma
COPY prisma ./prisma

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Generar cliente de Prisma en producción
RUN pnpm prisma generate

# Copy built app
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 4000

# Non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nestjs
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

CMD ["node", "dist/main.js"]