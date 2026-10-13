# planif-repas

Agent IA de planification des repas pour les familles en Côte d'Ivoire : menu de la semaine, liste de courses en unités du marché et en FCFA, suivi du stock et mode urgence « pas le temps ».

Projet de Licence 3 Informatique (USJ-CI) · Zahraa Badreddine, Fatima Zreik.

Les règles de développement sont dans [CLAUDE.md](CLAUDE.md), les documents de référence dans [docs/](docs/).

## Le design : Kitch'N-Flow

Interface mobile d'abord (360 px) au style « fait main » : papier texturé, écriture manuscrite, coins irréguliers, scotch et punaises. L'agent s'appelle **Tantie**. Le style est écrit avec **Tailwind CSS v4** ; le thème (palette, polices, animations) est dans [src/app/globals.css](src/app/globals.css).

| Écran           | Route            | Contenu                                                               |
| --------------- | ---------------- | --------------------------------------------------------------------- |
| Écran d'accueil | `/`              | Frigo animé, entrée dans l'application                                |
| Accueil         | `/accueil`       | Alertes « à consommer vite », repas du jour, accès au menu et au chat |
| Menu            | `/menu`          | Menu de la semaine, midi et soir                                      |
| Courses         | `/courses`       | Liste en ticket de caisse, coût en FCFA, où acheter, partage WhatsApp |
| Stock           | `/stock`         | Produits du frigo et du placard, péremption                           |
| Chat            | `/chat`          | Conversation avec Tantie, cartes de proposition Confirmer / Modifier  |
| Urgence         | `/urgence`       | Mode « pas le temps » (plein écran)                                   |
| Recette         | `/recettes/[id]` | Recette pas à pas (plein écran)                                       |

Palette : palme `#344F30`, foret `#13260F`, puce `#411102`, carmin `#9F350B`, sirop `#F47230`, or `#FDD973`, mangue `#F9A11B`, lagon `#8FC1C9`, canard `#2C4A4A`, rose `#F29CB0`, creme `#FFF4DF`.

### Données simulées

Les écrans lisent pour l'instant des données factices dans [src/lib/donnees-simulees.ts](src/lib/donnees-simulees.ts). Pour brancher le backend, on remplace ces imports par les appels aux routes décrites dans CLAUDE.md (section 9) : `GET /api/meal-plans/current`, `GET /api/shopping-lists/:id`, `GET /api/stock`, `POST /api/chat/messages` (flux SSE), `POST /api/chat/proposals/:id/accept`, `POST /api/emergency`, etc. Les types de [src/lib/types.ts](src/lib/types.ts) reprennent déjà les valeurs des énumérations Prisma.

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
