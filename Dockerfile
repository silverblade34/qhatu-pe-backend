# Etapa base con pnpm
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Instalar dependencias del sistema necesarias para canvas y prisma
RUN apk add --no-cache \
    openssl \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg

WORKDIR /app

# Etapa de dependencias
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalar TODAS las dependencias (incluye devDependencies con prisma)
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Etapa de construcción
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Generar Prisma Client con la versión correcta
RUN pnpm prisma generate

# Build de la aplicación
RUN pnpm build

# Etapa de producción
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalar solo dependencias de producción
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# Copiar el build
COPY --from=builder /app/dist ./dist

# SOLUCIÓN: Copiar TODO node_modules desde builder (incluye Prisma generado)
COPY --from=builder /app/node_modules ./node_modules

# Exponer puerto
EXPOSE 4000

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

# Comando de inicio
CMD ["node", "dist/main.js"]