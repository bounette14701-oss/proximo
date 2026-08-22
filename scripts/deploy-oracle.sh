#!/usr/bin/env bash
# ============================================================
# Proximo — Déploiement sur Oracle Cloud Always Free
#
# Usage :
#   ./deploy-oracle.sh --host <IP_VM> [options]
#
# Ce script, exécuté depuis VOTRE machine, déploie Proximo sur
# une VM Oracle Cloud Always Free via SSH :
#   1. Vérifie l'accès SSH (clé)
#   2. Installe Docker + Compose (Oracle Linux ou Ubuntu)
#   3. Clone le dépôt, génère un .env sécurisé (secrets aléatoires)
#   4. Démarre la stack (db PostGIS + backend + frontend + nginx)
#   5. Vérifie que l'API répond
#   6. Optionnel : installe le tunnel Cloudflare (cloudflared)
#
# Options :
#   --host IP         IP publique de la VM (obligatoire)
#   --user USER       Utilisateur SSH (défaut : opc — Ubuntu : ubuntu)
#   --ssh-key CHEMIN  Clé SSH privée (défaut : ~/.ssh/id_rsa)
#   --domain D        Domaine public (ex. proximo.residence.fr)
#   --tunnel-token T  Token de connexion du tunnel Cloudflare (Zero Trust
#                     → Tunnels → Create a tunnel → token) — installe
#                     cloudflared en service. Sinon, instructions manuelles.
#   --port PORT       Port HTTP exposé (défaut : 8080)
#   --yes             Non interactif (ne pose aucune question)
#   --skip-tunnel     Ne pas configurer le tunnel Cloudflare
# ============================================================
set -euo pipefail

# ─── Couleurs ────────────────────────────────────────────────
C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
info()  { echo "${C_GREEN}✔${C_RESET} $*"; }
warn()  { echo "${C_YELLOW}⚠${C_RESET} $*"; }
error() { echo "${C_RED}✘${C_RESET} $*" >&2; }
title() { echo; echo "${C_BOLD}== $* ==${C_RESET}"; }

# ─── Options ─────────────────────────────────────────────────
HOST=""; SSH_USER="opc"; SSH_KEY="$HOME/.ssh/id_rsa"; DOMAIN=""
TUNNEL_TOKEN=""; HTTP_PORT=8080; ASSUME_YES=0; SKIP_TUNNEL=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --user) SSH_USER="$2"; shift 2 ;;
    --ssh-key) SSH_KEY="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --tunnel-token) TUNNEL_TOKEN="$2"; shift 2 ;;
    --port) HTTP_PORT="$2"; shift 2 ;;
    --yes) ASSUME_YES=1; shift ;;
    --skip-tunnel) SKIP_TUNNEL=1; shift ;;
    --help|-h)
      sed -n '3,32p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) error "Option inconnue : $1 (voir --help)"; exit 1 ;;
  esac
done

[[ -z "$HOST" ]] && { error "--host est obligatoire (IP publique de la VM Oracle)."; exit 1; }

# ─── Prérequis locaux ────────────────────────────────────────
command -v ssh >/dev/null 2>&1 || { error "ssh n'est pas installé localement."; exit 1; }
command -v scp >/dev/null 2>&1 || { error "scp n'est pas installé localement."; exit 1; }
[[ -f "$SSH_KEY" ]] || { error "Clé SSH introuvable : $SSH_KEY (voir --ssh-key)."; exit 1; }

SSH_CMD=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
SCP_CMD=(scp -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)

# ─── Connexion ───────────────────────────────────────────────
title "Connexion à la VM ($SSH_USER@$HOST)"
if ! "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'echo OK' >/dev/null 2>&1; then
  warn "Connexion échouée avec l'utilisateur '$SSH_USER' — tentative avec 'ubuntu'…"
  SSH_USER="ubuntu"
  if ! "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'echo OK' >/dev/null 2>&1; then
    error "Impossible de se connecter à $HOST.
  → Vérifiez l'IP, la clé SSH (--ssh-key) et l'utilisateur (--user).
  → Sur Oracle Cloud : installez la clé publique dans la console
    (Instance → Resources → Console connection / Cloud-init)."
    exit 1
  fi
fi
info "Connecté : $SSH_USER@$HOST"

# ─── Détection OS ────────────────────────────────────────────
OS_ID=$("${SSH_CMD[@]}" "$SSH_USER@$HOST" "grep -E '^ID=' /etc/os-release | cut -d= -f2 | tr -d '\"'")
OS_VERSION=$("${SSH_CMD[@]}" "$SSH_USER@$HOST" "grep -E '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '\"'")
info "Système détecté : $OS_ID $OS_VERSION"

# ─── Installation de Docker ──────────────────────────────────
title "Installation de Docker + Compose"
if "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1'; then
  info "Docker + Compose déjà présents."
else
  case "$OS_ID" in
    ol|almalinux|rocky|centos)
      "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin' >/dev/null 2>&1 \
        || "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo dnf install -y docker docker-compose-plugin' >/dev/null 2>&1
      "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo systemctl enable --now docker' >/dev/null
      ;;
    ubuntu|debian)
      "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo apt-get update -qq && sudo apt-get install -y -qq ca-certificates curl && sudo install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null && sudo apt-get update -qq && sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin' >/dev/null 2>&1 \
        || "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo apt-get install -y -qq docker.io docker-compose-v2' >/dev/null 2>&1
      "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo systemctl enable --now docker' >/dev/null
      ;;
    *)
      error "Distribution non gérée : $OS_ID — installez Docker manuellement puis relancez."
      exit 1 ;;
  esac
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'sudo usermod -aG docker '"$SSH_USER" >/dev/null 2>&1 || true
  info "Docker installé."
fi

# ─── Récupération du dépôt ───────────────────────────────────
title "Récupération du code source"
if "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'test -d ~/proximo/.git'; then
  info "Dépôt déjà présent — mise à jour…"
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'cd ~/proximo && git pull --ff-only 2>/dev/null || true' >/dev/null 2>&1 || true
else
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'git clone --depth 1 https://github.com/bounette14701-oss/proximo.git ~/proximo' >/dev/null
  info "Dépôt cloné."
fi

# ─── .env ────────────────────────────────────────────────────
title "Configuration (.env)"
# URLs publiques : domaine fourni → https ; sinon IP brute.
if [[ -n "$DOMAIN" ]]; then
  PUBLIC_URL="https://${DOMAIN}"
else
  PUBLIC_URL="http://${HOST}:${HTTP_PORT}"
  warn "Pas de domaine fourni — l'app sera accessible en http://${HOST}:${HTTP_PORT}"
  warn "En production, utilisez --domain et un tunnel Cloudflare (HTTPS)."
fi

if "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'test -f ~/proximo/.env'; then
  info ".env existant sur la VM — conservé tel quel."
else
  # Génération LOCALE du .env, envoyé via scp (les secrets ne passent
  # jamais par la ligne de commande SSH — invisible dans ps aux).
  TMP_ENV="$(mktemp)"
  trap 'rm -f "$TMP_ENV"' EXIT
  cat > "$TMP_ENV" <<ENVEOF
# Généré par deploy-oracle.sh le $(date -Iseconds) — gardez ce fichier secret.
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_ACCESS_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
CORS_ORIGINS=${PUBLIC_URL}
HTTP_PORT=${HTTP_PORT}
APP_URL=${PUBLIC_URL}
FRONTEND_URL=${PUBLIC_URL}
API_URL=${PUBLIC_URL}/api
ADMIN_EMAILS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
BREVO_API_KEY=
BREVO_FROM_EMAIL=
BREVO_FROM_NAME=Proximo
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Proximo <no-reply@proximo.local>
SYNDIC_EMAIL=
ENVEOF
  chmod 600 "$TMP_ENV"
  "${SCP_CMD[@]}" "$TMP_ENV" "$SSH_USER@$HOST:~/proximo/.env" >/dev/null
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'chmod 600 ~/proximo/.env' >/dev/null
  rm -f "$TMP_ENV"
  trap - EXIT
  info ".env généré avec des secrets aléatoires et envoyé via scp."
fi

# ─── Démarrage de la stack ───────────────────────────────────
title "Démarrage de la stack (db + backend + frontend + nginx)"
# Images GHCR pré-buildées si dispo, sinon build local.
if "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'cd ~/proximo && sudo docker compose pull >/dev/null 2>&1'; then
  info "Images GHCR récupérées."
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'cd ~/proximo && sudo docker compose up -d' >/dev/null
else
  warn "Images GHCR indisponibles — build local (quelques minutes)…"
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'cd ~/proximo && sudo docker compose up -d --build' >/dev/null
fi

title "Vérification de l'API"
API_OK=0
for i in $(seq 1 60); do
  if "${SSH_CMD[@]}" "$SSH_USER@$HOST" "curl -fsS http://localhost:${HTTP_PORT}/api/health >/dev/null 2>&1"; then
    API_OK=1
    info "API prête (après ~$((i * 5)) s)."
    break
  fi
  sleep 5
done
if [[ "$API_OK" == "0" ]]; then
  error "L'API n'a pas démarré. Diagnostics :"
  "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'cd ~/proximo && sudo docker compose ps && sudo docker compose logs --tail=30 backend'
  exit 1
fi

# ─── Tunnel Cloudflare ───────────────────────────────────────
if [[ "$SKIP_TUNNEL" == "0" ]]; then
  title "Tunnel Cloudflare"
  if [[ -n "$TUNNEL_TOKEN" ]]; then
    "${SSH_CMD[@]}" "$SSH_USER@$HOST" 'curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared && sudo install -m 0755 /tmp/cloudflared /usr/local/bin/cloudflared' >/dev/null
    "${SSH_CMD[@]}" "$SSH_USER@$HOST" "sudo cloudflared service install '$TUNNEL_TOKEN'" >/dev/null
    info "cloudflared installé avec le token fourni."
    warn "Ajoutez le hostname dans le dashboard : Zero Trust → Networks → Tunnels →"
    warn "votre tunnel → Public Hostname → ${DOMAIN:-<sous-domaine>} → service http://localhost:${HTTP_PORT}"
  else
    warn "Pas de --tunnel-token. Pour exposer l'app en HTTPS :"
    warn "  1. Créez/réutilisez un tunnel : Zero Trust → Networks → Tunnels"
    warn "  2. Ajoutez un Public Hostname → service http://localhost:${HTTP_PORT}"
    warn "  (Pas besoin d'ouvrir le port ${HTTP_PORT} dans la Security List Oracle si"
    warn "   vous passez par le tunnel — seul le port 22 doit rester ouvert.)"
  fi
fi

# ─── Récapitulatif ───────────────────────────────────────────
title "🎉 Proximo est déployé sur Oracle Cloud"
echo "  ${C_BOLD}Local :${C_RESET}      http://localhost:${HTTP_PORT} (via tunnel SSH)"
echo "  ${C_BOLD}Public :${C_RESET}     ${PUBLIC_URL}"
echo
echo "  ${C_BOLD}Étape 1 :${C_RESET} ouvrez ${PUBLIC_URL} → l'assistant /install"
echo "            crée votre compte admin + le nom de la résidence."
echo "  ${C_BOLD}Étape 2 :${C_RESET} activez la double authentification dans"
echo "            votre profil (recommandé pour l'administrateur)."
echo "  ${C_BOLD}Étape 3 :${C_RESET} invitez vos voisins (QR code)."
echo
echo "  Logs :    ssh $SSH_USER@$HOST 'cd ~/proximo && sudo docker compose logs -f'"
echo "  MàJ :     ssh $SSH_USER@$HOST 'cd ~/proximo && git pull && sudo docker compose up -d --build'"
echo "  Arrêt :   ssh $SSH_USER@$HOST 'cd ~/proximo && sudo docker compose down'"
