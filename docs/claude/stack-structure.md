# Stack, installation, structure et conventions détaillées

> Détail des sections 4, 5, 6, 7 et 16 de `CLAUDE.md`. Les règles essentielles restent dans `CLAUDE.md`.

## 4. Stack technique

| Besoin | Choix |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript strict |
| Environnement | Node.js (version LTS actuelle), npm |
| Base de données | PostgreSQL |
| Accès aux données | Prisma (schéma, migrations, seed) |
| Authentification | Auth.js, fournisseur email et mot de passe, stratégie de session JWT dans un cookie ; bcrypt pour le hachage |
| Validation | zod (API, formulaires, outils de l'agent) |
| Formulaires | react-hook-form + résolveur zod |
| Style | Tailwind CSS v4 (via PostCSS) ; thème (couleurs, polices, animations) défini avec `@theme` dans `src/app/globals.css` |
| IA | SDK officiel `@anthropic-ai/sdk` |
| Réponses en flux | Server-Sent Events depuis une route API |
| Localisation | API de géolocalisation du navigateur, distance par formule de haversine |
| Itinéraire | Lien Google Maps, sans clé d'API |
| Partage | Lien wa.me et API de partage du navigateur |
| Tests | Vitest (unitaires et API), Playwright (parcours complets) |
| Qualité | ESLint, Prettier |

**Pas de nouvelle dépendance** sans l'avoir proposée et justifiée, et sans accord de l'équipe. Préférer les fonctions natives de Next.js, React et du navigateur.

**Hébergement** : développement en local ; démonstration sur une plateforme Next.js avec PostgreSQL hébergé (à choisir, vérifier la durée maximale d'exécution des routes).

## 5. Installation

### Prérequis

- Node.js (version LTS actuelle) et npm
- PostgreSQL installé en local
- Un fichier `.env` à la racine (copié depuis `.env.example`)

### Variables d'environnement

Les noms ci-dessous sont volontairement sans tiret bas. Le code les lit explicitement (on ne compte pas sur les noms par défaut des bibliothèques).

| Variable | Rôle | Utilisée par |
| --- | --- | --- |
| `DATABASEURL` | Adresse de connexion PostgreSQL | `schema.prisma` : `url = env("DATABASEURL")` |
| `AUTHSECRET` | Secret de signature des sessions | Configuration Auth.js : `secret: process.env.AUTHSECRET` |
| `ANTHROPICAPIKEY` | Clé de l'API Claude | Client Anthropic : `new Anthropic({ apiKey: process.env.ANTHROPICAPIKEY })` |
| `AIDAILYQUOTA` | Nombre maximum de messages à l'agent par foyer et par jour | Route du chat |
| `SEEDADMINPASSWORD` | Mot de passe du compte admin créé par le seed | `prisma/seed.ts` (haché avec bcrypt) |
| `SEEDDEMOPASSWORD` | Mot de passe des foyers de test et du foyer de démonstration | `prisma/seed.ts` et `npm run demo:reset` (haché avec bcrypt) |

Aucune variable n'est exposée au navigateur. `.env` est dans `.gitignore` ; `.env.example` est commité, sans valeurs réelles.

## 6. Structure du projet

```
planif-repas/
  CLAUDE.md
  README.md
  .env.example
  docs/                         PRD, cahiers des charges, diagrammes
  prisma/
    schema.prisma               modèle de données (source de vérité)
    seed.ts                     données de départ
    migrations/
  src/
    app/
      (auth)/                   inscription, connexion
      (famille)/
        accueil/                alertes, menu du jour, bouton urgence
        chat/                   conversation avec l'agent
        menu/                   menu de la semaine
        courses/                liste de courses, où acheter
        stock/                  stock et produits à consommer vite
        foyer/                  profil, membres, préférences apprises
        recettes/               catalogue
      recettes/[id]/            recette pas à pas (plein écran, sans barre du bas)
      urgence/                  mode urgence « pas le temps » (plein écran)
      admin/                    recettes, ingrédients, prix, magasins, comptes
      api/                      routes REST (section 9)
      globals.css               Tailwind, thème @theme, classes du style « fait main »
      layout.tsx                polices (Fredoka, Nunito, Caveat, Pacifico) et métadonnées
      page.tsx                  écran d'accueil animé (frigo)
    lib/
      agent/
        client.ts               client Anthropic et choix du modèle
        prompt.ts               prompt système
        context.ts              construction du contexte envoyé à Claude
        tools/                  un fichier par outil (schéma zod + exécution)
        loop.ts                 boucle d'appels d'outils
      planificateur/
        filtres.ts              filtres durs
        score.ts                notation des recettes
        verification.ts         contrôle du menu final
      courses/
        liste.ts                calcul de la liste
        unites.ts               conversion en unités du marché
        prix.ts                 prix médian par lieu
        lieux.ts                choix du lieu d'achat
        magasins.ts             magasins proches, distance
        whatsapp.ts             texte et lien de partage
      stock/
        mouvements.ts           création des mouvements
        peremption.ts           dates et statut « à consommer vite »
      auth/                     configuration Auth.js, garde de session et de rôle
      validation/               schémas zod partagés
      db.ts                     client Prisma unique
      erreurs.ts                format d'erreur commun
      format.ts                 formats d'affichage (FCFA, liens WhatsApp et Maps, cx)
      types.ts                  types de l'interface
      donnees-simulees.ts       données factices de l'interface, à remplacer par les appels API
    components/                 composants réutilisables (barre-navigation, bouton-urgence,
                                carte-repas, main-levee, titre-page, grain, icones, logo, umi…)
      illustrations/            dessins SVG (aliments, assiette, personnages)
  tests/
    unit/                       logique métier pure
    api/                        routes, contrôle d'accès
    e2e/                        parcours Playwright
```

La **logique métier** vit dans `src/lib/` sous forme de fonctions pures et testables. Les routes API et les composants l'appellent, ils ne la dupliquent pas.

## 7. Conventions détaillées

### Routes API

- Une route vérifie dans cet ordre : session, rôle si besoin, droit de modifier le foyer si la route écrit des données du foyer (une personne invitée en lecture seule est refusée, 403), validation zod de l'entrée, logique métier, réponse.
- Format d'erreur unique, défini dans `src/lib/erreurs.ts` :

```json
{ "error": { "code": "BUDGETDEPASSE", "message": "Le menu dépasse le budget de la semaine." } }
```

- Codes HTTP : 200 succès, 201 créé, 400 données invalides, 401 non connecté, 403 interdit, 404 introuvable, 409 conflit, 429 trop de requêtes, 500 erreur serveur.
- Messages d'erreur lisibles en français, sans détail technique ni donnée sensible.

### Interface

- Composants serveur par défaut ; composants client seulement quand il faut de l'interactivité.
- Style avec les classes Tailwind directement dans le JSX ; pas de CSS Modules. Les couleurs et polices du thème (`bg-palme`, `text-carmin`, `font-hand`…) plutôt que des valeurs en dur.
- Classes conditionnelles avec l'utilitaire `cx` de `src/lib/format.ts` (pas de dépendance `clsx`).
- Les classes partagées du style « fait main » (`wonky`, `blob`, `paper-shadow`, `retro`…) sont définies une seule fois dans `globals.css`.
- Textes en français, simples, sans jargon technique.
- Toujours prévoir les états de chargement, d'erreur et de liste vide.

### Services externes

Chaque service externe est isolé derrière une interface dans `src/lib/`, pour en changer sans toucher au reste :
- IA : `src/lib/agent/client.ts`
- Magasins : interface `StoreLocator` (implémentation MVP : table `Store`)
- Plus tard : `SpeechToTextProvider`, `EmailSender`, `PaymentProvider`

## 16. Description d'une pull request

```
## Carte Trello
Nom de la carte

## Ce qui change
Résumé en quelques lignes

## Comment tester
Étapes pour vérifier à la main

## Vérifications
- [ ] lint, tests et build passent
- [ ] tests ajoutés ou mis à jour
- [ ] règles non négociables respectées
- [ ] vérifié sur mobile
```
