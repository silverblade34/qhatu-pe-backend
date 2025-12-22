# Etapa base con pnpm
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

RUN apk add --no-cache \
    openssl \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg

WORKDIR /app

# Etapa de instalación y construcción
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# ✅ Sin --mount (compatible con Docker antiguo)
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Generar Prisma y construir
RUN pnpm prisma generate
RUN pnpm build

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Regenerar Prisma Client para producción
RUN pnpm prisma generate

# Etapa de producción
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copiar todo desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

CMD ["node", "dist/main.js"]