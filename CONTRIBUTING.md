# Contribuer à Proximo

Merci de votre intérêt pour Proximo ! Ce guide décrit le workflow de
contribution : signalement de problèmes, développement, et pull requests.

## Code de conduite

Soyez courtois et constructif. Les échanges se déroulent en français ou en
anglais, au choix de chacun.

## Signaler un problème

Ouvrez une issue GitHub en précisant :

- le contexte (URL, navigateur, étapes pour reproduire) ;
- le comportement attendu vs. observé ;
- les journaux pertinents (backend : `docker compose logs backend`).

Pour un problème de sécurité, **n'ouvrez pas d'issue publique** : contactez
les mainteneurs par message privé (les failles de sécurité sont traitées en
priorité et coordonnées avant toute divulgation).

## Développer en local

```bash
# 1. Cloner et préparer
git clone https://github.com/bounette14701-oss/proximo.git
cd proximo
cp .env.example .env            # remplacer les secrets
docker compose up -d db         # base PostGIS seule

# 2. Backend
cd backend
npm install
npx prisma migrate deploy
npm run start:dev               # http://localhost:3001/api

# 3. Frontend (autre terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev                     # http://localhost:3000
```

## Conventions de code

- **TypeScript strict** — aucun `any` implicite, aucun `TODO` laissé.
- **Validation des entrées** : tout DTO est validé avec `class-validator`
  (whitelist + rejet des champs inconnus).
- **Vie privée** : une donnée de localisation précise (lat/lng, adresse) ne
  doit jamais apparaître dans une réponse d'API — uniquement le quartier et
  la distance calculée.
- **Aucune dépendance d'IA/LLM** ne doit être ajoutée (contrainte produit).
- **Formatage** : Prettier (`npm run lint` couvre format + lint).
- **Tests** : les nouvelles fonctionnalités du backend s'accompagnent de
  tests unitaires Jest (mocks Prisma, aucun réseau).

## Processus de pull request

1. Créez une branche : `git checkout -b feat/ma-fonctionnalite`.
2. Implémentez avec des commits atomiques et des messages clairs.
3. Vérifiez localement :
   ```bash
   cd backend && npm run lint && npm test && npm run build
   cd frontend && npm run lint && npm run build
   ```
4. Poussez et ouvrez une pull request vers `main`.
5. La CI (lint, tests, builds Docker) doit être verte avant fusion.
6. Mentionnez l'issue liée (`Closes #123`) dans la description.

## Structure du dépôt

Voir la section « Architecture » du [README](README.md). En bref :

- `backend/src/auth` — sessions et sécurité de l'authentification ;
- `backend/src/listings` — annonces et requêtes géographiques (PostGIS) ;
- `backend/src/messages` — messagerie ;
- `backend/prisma` — schéma et migrations (toute modification du schéma
  doit être accompagnée de sa migration : `npx prisma migrate dev --name …`).

Merci de contribuer ! 🤝
