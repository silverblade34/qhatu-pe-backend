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

# Etapa de construcción
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
COPY database ./database

# Instalar todas las dependencias
RUN pnpm install --frozen-lockfile

# ✅ Usar el script de package.json
RUN pnpm run prisma:generate

# Copiar código fuente
COPY . .

# Construir
RUN pnpm build

# Etapa de producción
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/database ./database
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

CMD ["node", "dist/main.js"]