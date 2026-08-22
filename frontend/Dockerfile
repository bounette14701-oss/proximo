# ============================================================
# Proximo Frontend — Image de production (Next.js standalone)
# ============================================================

# ---------- Étape 1 : dépendances ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Résilience : le bug npm "Exit handler never called!" peut laisser un
# node_modules incomplet avec exit 0 → vérification d'intégrité + retry miroir.
RUN for i in 1 2 3; do \
      echo "--- tentative npm ci $i/3 ---"; \
      if npm ci --no-audit --no-fund --prefer-offline --fetch-retries=5 \
        --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=60000 \
        && [ -x node_modules/.bin/next ]; then \
        echo "npm ci OK (intégrité vérifiée)"; break; \
      fi; \
      rm -rf node_modules; \
      if npm ci --no-audit --no-fund --registry=https://registry.npmmirror.com \
        && [ -x node_modules/.bin/next ]; then \
        echo "npm ci OK via miroir"; break; \
      fi; \
      [ "$i" = 3 ] && { echo "npm ci a échoué 3 fois"; exit 1; }; \
      rm -rf node_modules; sleep 5; \
    done

# ---------- Étape 2 : build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- Étape 3 : runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

# Exécution en tant qu'utilisateur non privilégié
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
