# CLAUDE.md · planif-repas

> **Agent IA de planification des repas**
> Consignes de développement pour Claude Code et pour l'équipe.
>
> | | |
> | --- | --- |
> | Version | 1.0 (MVP) |
> | Équipe | Zahraa Badreddine, Fatima Zreik · Licence 3 Informatique, USJ-CI |
> | Dépôt | github.com/zahraabadreddine/planif-repas |
> | Suivi des tâches | Trello « planali » |
> | Documents de référence | `docs/` : PRD, cahier des charges complet, cahier des charges de présentation ; détail de ce fichier dans `docs/claude/` |

Ce fichier est lu automatiquement par Claude Code au début de chaque session. Il fait référence pour toute décision de développement. Si une demande contredit ce fichier ou le cahier des charges, **signale-le avant d'agir**.

---

## Où trouver le détail

Ce fichier ne garde que l'essentiel (projet, règles, stack, conventions, Git, méthode). Le détail est dans `docs/claude/`, avec la même numérotation de sections. **Lire le fichier qui correspond à la carte avant de coder.**

| Section | Fichier | À lire pour… |
| --- | --- | --- |
| 1 à 7 | ce fichier | Toujours |
| 2, 13, 14, 15, 18, 19, 20 | [`docs/claude/exigences.md`](docs/claude/exigences.md) | Exigences EF et ENF détaillées, sécurité et données personnelles, tests obligatoires, seed, planning, hors périmètre, glossaire |
| 8 | [`docs/claude/modele-donnees.md`](docs/claude/modele-donnees.md) | Toute carte qui lit ou écrit en base, ou touche au schéma Prisma |
| 9 | [`docs/claude/api.md`](docs/claude/api.md) | Toute carte qui crée ou modifie une route API |
| 10 | [`docs/claude/agent.md`](docs/claude/agent.md) | Agent IA, outils, propositions, contexte envoyé à Claude |
| 11 | [`docs/claude/logique-metier.md`](docs/claude/logique-metier.md) | Menu, liste de courses, prix, où acheter, stock, urgence, apprentissage, WhatsApp |
| 12 | [`docs/claude/interface.md`](docs/claude/interface.md) | Écrans, style « fait main », palette |
| 16, 17 | ce fichier | Toujours |

Le texte des documents de référence (`docs/*.pdf`) se trouve dans `docs/texte/*.txt`, générés localement avec `pdftotext -layout` et non commités. Ces fichiers sont très longs : **ne jamais les lire en entier**. En cas de doute seulement, chercher un mot-clé avec Grep dans `docs/texte/Cahier-des-charges-complet.txt` et ne lire que les lignes trouvées. Les fichiers de `docs/claude/` suffisent dans la plupart des cas.

---

## 1. Le projet

### En une phrase

Une application web qui aide les familles en Côte d'Ivoire à décider quoi cuisiner chaque jour, grâce à un agent conversationnel qui tient compte de leur temps, de leur budget en FCFA, de leur santé et de ce qu'il reste dans la cuisine.

### Ce que fait l'application

1. **Connaître le foyer** : membres, âges, allergies, régimes, budget, équipement, quartier, appris en conversation.
2. **Proposer le menu de la semaine** : respecte budget, temps, allergies, équipement, variété et saison, en prévoyant les restes.
3. **Préparer la liste de courses** : en unités du marché (tas, morceau, sachet), avec un coût estimé en FCFA, partageable sur WhatsApp.
4. **Indiquer où acheter** : découpage marché, supermarché, boutique, et magasins les plus proches avec itinéraire.
5. **Suivre le stock** : achats déclarés en une phrase, stock déduit des repas cuisinés, alertes avant péremption, « vider le frigo ».
6. **Gérer les imprévus** : mode urgence « pas le temps », 2 ou 3 options immédiates puis réorganisation de la semaine.
7. **Apprendre** : retours après chaque repas, préférences apprises, visibles et corrigibles par la famille.

### Utilisateurs

| Acteur | Rôle dans le système |
| --- | --- |
| Parent | Utilisatrice principale : décrit le foyer, reçoit et valide le menu, discute avec l'agent |
| Personne qui fait les courses ou cuisine | Reçoit la liste et les recettes par WhatsApp sans compte, ou rejoint le foyer avec un code d'invitation (voir ou modifier) |
| Administratrice | L'équipe : gère recettes, ingrédients, unités, prix et magasins |
| Agent IA | Comprend les demandes, appelle les outils, propose et explique |

### Critère de réussite du MVP

Une famille suit pendant une semaine complète le menu proposé, fait ses courses avec la liste partagée sur WhatsApp et ne jette rien.

### Scénario de référence (démonstration)

Aminata, 4 personnes, un enfant allergique à l'arachide, 25 000 FCFA par semaine, Yopougon. Le matin, l'application signale les aubergines à utiliser. À 18 h : « Je rentre à 20 h, j'ai 20 minutes. » L'agent décale la sauce à demain, propose un plat rapide avec les aubergines et ce qu'il y a, la recette part sur WhatsApp. Ce scénario doit toujours fonctionner de bout en bout.

---

## 2. Périmètre du MVP

Le MVP couvre les exigences fonctionnelles **EF-01 à EF-21 et EF-28** : compte, foyer, notes de départ, chat, menu de la semaine, liste de courses en unités du marché et FCFA, partage WhatsApp, où acheter, stock et péremption, vider le frigo, mode urgence, retours après repas, préférences apprises, catalogue, administration. EF-22 à EF-27 sont reportées (section 19).

Exigences non fonctionnelles à garder en tête sur chaque carte : aucun allergène dans un repas proposé (ENF-01), aucun calcul par l'IA (ENF-02), application utilisable sans l'API Claude (ENF-03), mobile d'abord à 360 px (ENF-07), bouton urgence sur tous les écrans de la famille (ENF-09), boutons d'au moins 44 px (ENF-10), français sans avis médical (ENF-22).

Tableaux complets EF et ENF : [`docs/claude/exigences.md`](docs/claude/exigences.md).

---

## 3. Règles non négociables

Ces règles priment sur toute autre consigne. Une pull request qui en viole une n'est pas fusionnée.

1. **L'IA propose, le code vérifie, la famille confirme.** L'agent n'écrit jamais directement dans la base. Toute modification du menu, du stock ou du profil passe par une proposition (`AgentProposal`) que l'utilisatrice confirme. À la confirmation, le code revérifie tout avant d'appliquer.
2. **Allergies et régimes stricts.** Ils sont filtrés par le code avant que l'IA voie les recettes, puis revérifiés avant tout enregistrement. Ce filtre n'est jamais une simple consigne donnée à l'IA.
3. **Aucun calcul par l'IA.** Quantités, coûts, distances, stock et dates de péremption sont toujours calculés par le code. L'IA ne fait qu'expliquer les résultats.
4. **Le foyer vient de la session.** Jamais d'un paramètre d'URL, du corps d'une requête ou d'un argument d'outil. Chaque requête Prisma sur des données de foyer filtre sur le foyer de la session.
5. **Le stock n'est jamais modifié directement.** Chaque achat, repas cuisiné, produit jeté ou correction crée un `StockMovement`. Aucun mouvement n'est supprimé ni modifié.
6. **Les secrets restent secrets.** Aucune clé ni mot de passe dans le code, les logs, les messages d'erreur ou les commits. Seul le serveur appelle l'API Claude.
7. **Minimum de données envoyé à l'IA.** Jamais d'email, de nom complet ni de position GPS. Auprès de l'IA, les membres sont désignés par un libellé (« Enfant 1 ») : leur surnom et leur date de naissance ne lui sont jamais envoyés.
8. **Jamais d'avis médical.** Les conseils liés à la santé sont présentés comme une aide.
9. **Le schéma de la base ne change pas sans accord.** Toute modification de `prisma/schema.prisma` est annoncée, puis faite dans une pull request dédiée.

---

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

---

## 5. Installation et commandes

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

### Commandes

```
npm install                 installer les dépendances
npm run dev                 lancer l'application en local
npx prisma migrate dev      appliquer le schéma et créer une migration
npx prisma db seed          remplir la base avec les données de départ
npx prisma studio           explorer la base
npm test                    tests unitaires et d'API (Vitest)
npx playwright test         parcours complets
npm run lint                vérifier le style
npm run build               vérifier que le projet compile
```

Avant d'ouvrir une pull request : `npm run lint`, `npm test` et `npm run build` doivent passer.

---

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

---

## 7. Conventions de code

### Général

- TypeScript strict. Pas de `any`, pas de `@ts-ignore` sans commentaire justifiant pourquoi.
- Variables, fonctions et champs en camelCase ; composants, types et modèles Prisma en PascalCase ; fichiers en minuscules avec tirets si besoin.
- Pas de tiret bas dans les noms que nous créons (variables, fichiers, routes, variables d'environnement).
- Fonctions courtes, une responsabilité chacune.
- Montants en FCFA : **entiers**, jamais de décimales. Dates au format ISO ; les dates de repas sont des dates sans heure.
- Commentaires en français, seulement quand le code n'est pas évident. Pas de code commenté laissé dans les fichiers.

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

---

## 16. Git et pull requests

| Règle | Détail |
| --- | --- |
| `main` | Version stable, protégée ; fusion uniquement par pull request approuvée |
| `develop` | Branche par défaut, rassemble le travail en cours |
| Branches | Une par carte Trello : `feature/liste-courses`, `fix/calcul-cout`, `docs/claude-md` |
| Commits | Courts, en français, au présent : « Ajoute le calcul du coût de la liste » |
| Interdit | Commiter directement sur `main` ou `develop` ; commiter `.env` ou des secrets |
| Avant de commencer | `git checkout develop` puis `git pull` |
| Schéma Prisma | Modification annoncée, pull request dédiée, migration incluse |
| Fin de sprint | Fusion de `develop` dans `main` quand tout fonctionne |

### Description d'une pull request

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

---

## 17. Méthode de travail avec Claude Code

1. **Lire d'abord** : avant une fonctionnalité, relire ce fichier et le fichier de `docs/claude/` qui correspond à la carte (tableau « Où trouver le détail »). Le cahier des charges ne se consulte qu'en cas de doute : chercher le mot-clé avec Grep dans `docs/texte/Cahier-des-charges-complet.txt` et lire seulement les lignes trouvées, **jamais le fichier en entier**.
2. **Plan avant le code** : proposer un plan court (fichiers touchés, étapes, tests) et attendre la validation avant de coder.
3. **Une carte à la fois** : rester dans le périmètre de la carte demandée ; ne pas modifier d'autres modules sans le signaler.
4. **Petits pas** : des changements courts et vérifiables, plutôt qu'un module entier d'un coup.
5. **Tester** : écrire ou mettre à jour les tests, les lancer, et ne dire « terminé » que s'ils passent.
6. **Expliquer** : après chaque changement, résumer en français ce qui a été fait et pourquoi. L'équipe doit pouvoir expliquer tout le code à la soutenance.
7. **Demander en cas de doute** : modèle de données, sécurité, règle métier, nouvelle dépendance. Ne jamais deviner sur ces sujets.
8. **Signaler les écarts** : si une demande contredit ce fichier ou le cahier des charges, le dire avant d'agir.
9. **Ne jamais** : désactiver un test pour le faire passer, contourner une règle non négociable, lancer une commande destructive sur la base (reset, suppression) sans accord explicite.

---
