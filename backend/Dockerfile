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
# Résilience : le bug npm "Exit handler never called!" peut laisser un
# node_modules incomplet avec exit 0 → vérification d'intégrité + retry miroir.
COPY package.json package-lock.json* ./
RUN for i in 1 2 3; do \
      echo "--- tentative npm ci $i/3 ---"; \
      if npm ci --no-audit --no-fund --prefer-offline --fetch-retries=5 \
        --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=60000 \
        && [ -x node_modules/.bin/prisma ]; then \
        echo "npm ci OK (intégrité vérifiée)"; break; \
      fi; \
      rm -rf node_modules; \
      if npm ci --no-audit --no-fund --registry=https://registry.npmmirror.com \
        && [ -x node_modules/.bin/prisma ]; then \
        echo "npm ci OK via miroir"; break; \
      fi; \
      [ "$i" = 3 ] && { echo "npm ci a échoué 3 fois"; exit 1; }; \
      rm -rf node_modules; sleep 5; \
    done

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
