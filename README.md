# planif-repas

Agent IA de planification des repas pour les familles en Côte d'Ivoire : menu de la semaine, liste de courses en unités du marché et en FCFA, suivi du stock et mode urgence « pas le temps ».

Projet de Licence 3 Informatique (USJ-CI) · Zahraa Badreddine, Fatima Zreik.

Les règles de développement sont dans [CLAUDE.md](CLAUDE.md), les documents de référence dans [docs/](docs/).

## Prérequis

- Node.js (version LTS actuelle) et npm
- PostgreSQL installé en local

## Installation

```bash
git clone https://github.com/zahraabadreddine/planif-repas.git
cd planif-repas
git checkout develop
npm install
cp .env.example .env   # puis remplir les valeurs
npm run dev            # http://localhost:3000
```

## Commandes

| Commande                 | Rôle                                       |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Lancer l'application en local              |
| `npm run build`          | Vérifier que le projet compile             |
| `npm run lint`           | Vérifier le style (ESLint)                 |
| `npm run format`         | Formater le code (Prettier)                |
| `npx prisma migrate dev` | Appliquer le schéma et créer une migration |
| `npx prisma db seed`     | Remplir la base avec les données de départ |
| `npm test`               | Tests unitaires et d'API (Vitest)          |
| `npx playwright test`    | Parcours complets                          |

Prisma, Vitest et Playwright arrivent dans les prochaines cartes du sprint S1.

## Contribuer

1. `git checkout develop` puis `git pull`
2. Une branche par carte Trello : `feature/…`, `fix/…`, `docs/…`
3. Avant la pull request vers `develop` : `npm run lint`, `npm test` et `npm run build` doivent passer.
