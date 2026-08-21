# ============================================================
# Proximo Backend — Image de production
# Étape 1 : dépendances + build (outils de compilation inclus)
# Étape 2 : runtime minimal (Debian bookworm slim)
# Les migrations Prisma sont exécutées au démarrage du conteneur
# (voir docker-compose.yml : command par défaut du Dockerfile).
# ============================================================

# ---------- Étape 1 : build ----------
FROM node:22-bookworm-slim AS build

# Outils requis pour les dépendances natives (argon2) + OpenSSL (moteur Prisma)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des dépendances (cache Docker optimisé)
COPY package.json package-lock.json* ./
RUN npm ci

# Copie du code source et build
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---------- Étape 2 : runtime ----------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# curl/wget pour le healthcheck + OpenSSL (moteur Prisma pour les migrations)
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget openssl \
    && rm -rf /var/lib/apt/lists/*

# Node_modules complet (contient la CLI Prisma pour les migrations)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# L'application écoute sur 3001 (exposé uniquement sur le réseau Docker)
EXPOSE 3001

# Migration du schéma puis démarrage de l'API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
