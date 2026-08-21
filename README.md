# 🤝 Proximo

**Plateforme web open source d'entraide et de partage de proximité.**

Prêtez un outil, proposez un service, donnez ce qui vous encombre — Proximo
met en relation les voisins d'un même quartier, **sans jamais révéler
d'adresse exacte**.

[![Licence](https://img.shields.io/github/license/bounette14701-oss/proximo)](LICENSE)
[![CI](https://github.com/bounette14701-oss/proximo/actions/workflows/ci.yml/badge.svg)](https://github.com/bounette14701-oss/proximo/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![PostGIS](https://img.shields.io/badge/PostgreSQL%2016%20%2B%20PostGIS-4169E1?logo=postgresql)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| **Comptes & sessions** | Inscription, connexion, déconnexion — JWT en cookies HTTP-only, refresh token révocable avec rotation, « Se souvenir de moi » (90 j) |
| **Connexion Google** | OAuth2 / OpenID Connect (bouton « Continuer avec Google »), identité vérifiée par Google |
| **Double authentification (admin)** | TOTP obligatoire pour le back-office (Google Authenticator / Authy) — QR code au premier setup, vérification stricte du code à 6 chiffres à la connexion |
| **Annonces d'entraide** | Prêt de matériel (🔧), services entre voisins (🤝), dons (🎁) — publication, modification, clôture, suppression |
| **Messagerie** | Conversations 1-1 entre voisins, messages non lus, marquage lu |
| **Périmètre géographique** | Recherche dans un rayon de 1 à 100 km, tri par distance (PostGIS) |
| **Modération des membres** | Nouveaux comptes en attente (`PENDING`) jusqu'à validation par un admin (sauf emails déclarés administrateurs) ; suspension et suppression depuis le back-office |
| **Signalements syndic** | Formulaire d'incident (fuite d'eau, ascenseur, dégradation…) avec pièces jointes (JPG/PNG/WEBP/PDF, 5 Mo), email récapitulatif automatique au syndic, suivi du statut (ouvert / en cours / résolu) |
| **Invitations par QR code** | Lien d'invitation lié au quartier, usage unique et expirable (72 h), page d'atterrissage avec pré-remplissage du périmètre |
| **Notifications email** | Nodemailer/SMTP : bienvenue, nouveau message, changement de statut d'un signalement — activables/désactivables dans les réglages |
| **Back-office admin** | Validation/suspension/suppression des membres, modération des signalements, configuration de l'email du syndic, génération d'invitations + QR |
| **Vie privée** | L'adresse exacte et les coordonnées ne sont **jamais** exposées : seul le quartier et la distance sont publics |

## 🧱 Stack technique

- **Frontend** — Next.js 14 (App Router) + Tailwind CSS, rendu autonome (standalone)
- **Backend** — NestJS 10 (TypeScript strict), validation stricte des entrées (class-validator)
- **Base de données** — PostgreSQL 16 + PostGIS 3.4, ORM Prisma 5
- **Infrastructure** — Docker Compose, Nginx en reverse proxy
- **Aucun composant d'intelligence artificielle** — zéro dépendance LLM, par conception

## 📁 Architecture

```
proximo/
├── .github/workflows/ci.yml   # CI : lint, tests, builds, images Docker
├── docker-compose.yml         # Orchestration complète (db, backend, frontend, nginx)
├── nginx/nginx.conf           # Reverse proxy (/ → frontend, /api → backend)
├── backend/                   # API NestJS
│   ├── prisma/schema.prisma   # Modèle de données (User, Listing, Conversation…)
│   ├── prisma/migrations/     # Migrations SQL versionnées
│   └── src/
│       ├── auth/              # JWT + cookies HTTP-only, rotation, Google OAuth2, 2FA TOTP
│       ├── listings/          # Annonces + recherche par rayon (PostGIS)
│       ├── messages/          # Messagerie 1-1 + notifications email
│       ├── incidents/         # Signalements syndic + pièces jointes (upload sécurisé)
│       ├── invitations/       # Invitations QR (jeton usage unique / expirable)
│       ├── admin/             # Back-office (2FA, membres, signalements, réglages syndic)
│       ├── email/             # Emails transactionnels (Nodemailer/SMTP)
│       ├── geocoding/         # Géocodage adresse → coordonnées (OSM Nominatim)
│       ├── users/             # Profils + réglages de notification
│       └── common/            # Guards : JWT, rôles, statut, admin, anti-CSRF, rate limiting
└── frontend/                  # Next.js (App Router)
    └── src/app/               # Pages : accueil, annonces, messagerie, signalements,
                               #          admin, invitation, profil
```

## 🚀 Démarrage rapide (Docker)

**Prérequis :** Docker ≥ 24 avec le plugin Compose v2.

```bash
git clone https://github.com/bounette14701-oss/proximo.git
cd proximo

# 1. Configuration
cp .env.example .env
# Générer des secrets robustes :
#   openssl rand -hex 32   → POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 2. Lancement (migrations automatiques au démarrage du backend)
docker compose up -d --build
```

L'application est alors disponible sur **http://localhost:8080** :

- Page d'accueil et annonces : `http://localhost:8080`
- API (healthcheck) : `http://localhost:8080/api/health`

```bash
docker compose ps        # état des services
docker compose logs -f   # journaux
docker compose down      # arrêt (les données sont conservées)
docker compose down -v   # arrêt + suppression des données
```

## 🔐 Configuration

| Variable | Description | Défaut |
|---|---|---|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL (**obligatoire**) | — |
| `JWT_ACCESS_SECRET` | Secret de signature du token d'accès (**obligatoire**) | — |
| `JWT_REFRESH_SECRET` | Secret du refresh token (**obligatoire**) | — |
| `CORS_ORIGINS` | Origines autorisées (séparées par des virgules) | `http://localhost:3000` |
| `JWT_ACCESS_TTL` | Durée de vie du token d'accès (s) | `900` (15 min) |
| `JWT_REFRESH_TTL` | Durée de vie du refresh token (s) | `2592000` (30 j) |
| `NEXT_PUBLIC_API_URL` | URL de l'API vue par le navigateur (vide = même origine) | *(vide)* |
| `HTTP_PORT` | Port HTTP exposé | `8080` |

> **Sécurité :** aucun secret n'est versionné. Les fichiers `.env` sont ignorés
> par git. En production, pensez à HTTPS (TLS terminé sur le reverse proxy)
> — les cookies sont alors marqués `Secure` automatiquement.

## 📡 API (résumé)

Toutes les routes sont préfixées par `/api`.

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/auth/register` | public (limitée) | Inscription — pose les cookies de session |
| POST | `/auth/login` | public (limitée) | Connexion |
| POST | `/auth/refresh` | cookie refresh | Rotation de session |
| POST | `/auth/logout` | cookie refresh | Déconnexion + révocation |
| GET | `/auth/me` | connecté | Utilisateur courant |
| GET | `/listings` | public | Recherche (catégorie, texte, rayon km, pagination) |
| GET | `/listings/:id` | public | Détail (quartier uniquement, pas d'adresse) |
| POST | `/listings` | connecté | Créer une annonce (adresse → géocodage) |
| PATCH | `/listings/:id` | propriétaire | Modifier / changer le statut |
| DELETE | `/listings/:id` | propriétaire | Supprimer |
| GET | `/messages` | connecté | Conversations + non-lus |
| GET | `/messages/:id` | participant | Fil de messages (marque lus) |
| POST | `/messages` | connecté (limitée) | Envoyer un message |
| GET | `/geocode?q=…` | public (limitée) | Recherche d'adresse (géocodage) |
| GET | `/health` | public | Healthcheck (état API + base) |

## 🛡️ Sécurité

- **Mots de passe** hachés avec **Argon2id** (paramètres OWASP) — jamais stockés en clair
- **Tokens** en **cookies HTTP-only, `SameSite=Lax`, `Secure` en production** —
  inaccessible au JavaScript, protégé contre les attaques XSS
- **Refresh tokens** opaques, stockés **hashés (SHA-256)** en base, **révocables**,
  avec **rotation** à chaque utilisation (détection de rejeu)
- **Validation stricte** de toutes les entrées (class-validator, whitelist,
  rejet des champs inconnus) + anti-injection (requêtes SQL paramétrées Prisma)
- **Anti-CSRF** : vérification de l'origine des requêtes mutantes
- **Rate limiting** par IP réelle (derrière nginx) : 300 req/min global,
  limites renforcées sur l'authentification, la messagerie et le géocodage
- **En-têtes HTTP** durcis (Helmet + Nginx), pas de version exposée (`poweredByHeader: false`)
- **Vie privée** : les coordonnées exactes et adresses ne sortent jamais de l'API

## 💻 Développement local

```bash
# Base de données seule (PostGIS)
docker compose up -d db

# Backend (http://localhost:3001)
cd backend
npm install
cp ../.env.example ../.env   # puis ajuster DATABASE_URL en local
npx prisma migrate deploy
npm run start:dev

# Frontend (http://localhost:3000)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

## ✅ Qualité & CI

Chaque push sur `main` (et chaque pull request) déclenche :

1. **Backend** : lint (ESLint, zéro warning) → tests unitaires (Jest) → build
2. **Frontend** : lint (ESLint) → build
3. **Docker** : validation `docker compose config` → build des trois images

```bash
cd backend && npm run lint && npm test && npm run build
cd frontend && npm run lint && npm run build
```

## 📄 Licence

Distribué sous licence **Apache 2.0** — voir [LICENSE](LICENSE).
Contributions bienvenues : consultez [CONTRIBUTING.md](CONTRIBUTING.md).
