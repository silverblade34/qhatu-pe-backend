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

# ✅ Copiar la carpeta database completa (contiene prisma/schema.prisma)
COPY database ./database

# Instalar TODAS las dependencias (incluyendo devDependencies con prisma)
RUN pnpm install --frozen-lockfile

# ✅ Usar el comando correcto con la ruta de tu schema
RUN pnpm prisma generate --schema=./database/prisma/schema.prisma

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN pnpm build

# Etapa de producción
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copiar archivos necesarios
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/database ./database
COPY --from=builder /app/dist ./dist

# ✅ Copiar node_modules completo (incluye Prisma Client generado)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 4000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

CMD ["node", "dist/main.js"]