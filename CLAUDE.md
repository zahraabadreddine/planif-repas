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

Ce fichier ne garde que l'essentiel. Le détail est dans `docs/claude/`, avec la même numérotation de sections. **Lire le fichier qui correspond à la carte avant de coder.**

| Section | Fichier | À lire pour… |
| --- | --- | --- |
| 1 à 7, 16, 17 | ce fichier | Toujours |
| 4, 5, 6, 7, 16 | [`docs/claude/stack-structure.md`](docs/claude/stack-structure.md) | Stack détaillée, variables d'environnement, arborescence, conventions API et interface, modèle de PR |
| 2, 13, 14, 15, 18, 19, 20 | [`docs/claude/exigences.md`](docs/claude/exigences.md) | Exigences EF et ENF détaillées, sécurité et données personnelles, tests obligatoires, seed, planning, hors périmètre, glossaire |
| 8 | [`docs/claude/modele-donnees.md`](docs/claude/modele-donnees.md) | Toute carte qui lit ou écrit en base, ou touche au schéma Prisma |
| 9 | [`docs/claude/api.md`](docs/claude/api.md) | Toute carte qui crée ou modifie une route API |
| 10 | [`docs/claude/agent.md`](docs/claude/agent.md) | Agent IA, outils, propositions, contexte envoyé à Claude |
| 11 | [`docs/claude/logique-metier.md`](docs/claude/logique-metier.md) | Menu, liste de courses, prix, où acheter, stock, urgence, apprentissage, WhatsApp |
| 12 | [`docs/claude/interface.md`](docs/claude/interface.md) | Écrans, style « fait main », palette |

Le texte des documents de référence (`docs/*.pdf`) est dans `docs/texte/*.txt` (non commités). Ces fichiers sont très longs : **ne jamais les lire en entier**. En cas de doute seulement, chercher un mot-clé avec Grep dans `docs/texte/Cahier-des-charges-complet.txt` et ne lire que les lignes trouvées.

---

## 1. Le projet

Une application web qui aide les familles en Côte d'Ivoire à décider quoi cuisiner chaque jour, grâce à un agent conversationnel qui tient compte de leur temps, de leur budget en FCFA, de leur santé et de ce qu'il reste dans la cuisine.

Fonctions : connaître le foyer (appris en conversation) ; proposer le menu de la semaine ; préparer la liste de courses en unités du marché avec coût en FCFA, partageable sur WhatsApp ; indiquer où acheter ; suivre le stock et la péremption ; mode urgence « pas le temps » ; apprendre des retours après repas.

Utilisateurs : le parent (utilisatrice principale), la personne qui fait les courses ou cuisine (WhatsApp sans compte, ou code d'invitation), l'administratrice (catalogue, prix, magasins), l'agent IA (comprend, appelle les outils, propose, explique).

**Critère de réussite du MVP** : une famille suit pendant une semaine complète le menu proposé, fait ses courses avec la liste partagée sur WhatsApp et ne jette rien.

**Scénario de référence** : Aminata, 4 personnes, un enfant allergique à l'arachide, 25 000 FCFA par semaine, Yopougon. Le matin, l'application signale les aubergines à utiliser. À 18 h : « Je rentre à 20 h, j'ai 20 minutes. » L'agent décale la sauce à demain, propose un plat rapide avec les aubergines et ce qu'il y a, la recette part sur WhatsApp. Ce scénario doit toujours fonctionner de bout en bout.

---

## 2. Périmètre du MVP

Le MVP couvre les exigences fonctionnelles **EF-01 à EF-21 et EF-28** : compte, foyer, notes de départ, chat, menu de la semaine, liste de courses en unités du marché et FCFA, partage WhatsApp, où acheter, stock et péremption, vider le frigo, mode urgence, retours après repas, préférences apprises, catalogue, administration. EF-22 à EF-27 sont reportées (section 19).

Exigences non fonctionnelles à garder en tête sur chaque carte : aucun allergène dans un repas proposé (ENF-01), aucun calcul par l'IA (ENF-02), application utilisable sans l'API Claude (ENF-03), mobile d'abord à 360 px (ENF-07), bouton urgence sur tous les écrans de la famille (ENF-09), boutons d'au moins 44 px (ENF-10), français sans avis médical (ENF-22).

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

Next.js (App Router), React, TypeScript strict · PostgreSQL + Prisma · Auth.js (email et mot de passe, session JWT, bcrypt) · zod · react-hook-form · Tailwind CSS v4 (thème `@theme` dans `src/app/globals.css`) · `@anthropic-ai/sdk` · Vitest et Playwright · ESLint, Prettier.

**Pas de nouvelle dépendance** sans l'avoir proposée et justifiée, et sans accord de l'équipe.

---

## 5. Commandes

```
npm run dev                 lancer l'application en local
npx prisma migrate dev      appliquer le schéma et créer une migration
npx prisma db seed          remplir la base avec les données de départ
npm test                    tests unitaires et d'API (Vitest)
npx playwright test         parcours complets
npm run lint                vérifier le style
npm run build               vérifier que le projet compile
```

Variables d'environnement (sans tiret bas : `DATABASEURL`, `AUTHSECRET`, `ANTHROPICAPIKEY`…) : voir `docs/claude/stack-structure.md`.

Avant d'ouvrir une pull request : `npm run lint`, `npm test` et `npm run build` doivent passer.

---

## 6. Structure du projet

Arborescence complète dans `docs/claude/stack-structure.md`. Pages dans `src/app/`, composants dans `src/components/`, tests dans `tests/unit`, `tests/api`, `tests/e2e`.

La **logique métier** vit dans `src/lib/` sous forme de fonctions pures et testables. Les routes API et les composants l'appellent, ils ne la dupliquent pas.

---

## 7. Conventions de code

- TypeScript strict. Pas de `any`, pas de `@ts-ignore` sans commentaire justifiant pourquoi.
- camelCase pour variables, fonctions et champs ; PascalCase pour composants, types et modèles Prisma ; fichiers en minuscules avec tirets. **Pas de tiret bas** dans les noms que nous créons.
- Fonctions courtes, une responsabilité chacune.
- Montants en FCFA : **entiers**. Dates au format ISO ; les dates de repas sont sans heure.
- Commentaires en français, seulement quand le code n'est pas évident. Pas de code commenté laissé dans les fichiers.
- Routes API : session → rôle → droit d'écrire sur le foyer (lecture seule = 403) → validation zod → logique métier → réponse. Erreurs au format de `src/lib/erreurs.ts`, messages en français sans détail technique.
- Interface : composants serveur par défaut ; classes Tailwind du thème (`bg-palme`, `font-hand`…) et `cx` de `src/lib/format.ts` ; textes simples en français ; toujours prévoir chargement, erreur et liste vide.

Détail (codes HTTP, services externes) : `docs/claude/stack-structure.md`.

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

Description d'une pull request : modèle (Carte Trello, Ce qui change, Comment tester, Vérifications) dans `docs/claude/stack-structure.md`.

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
