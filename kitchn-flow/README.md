# Kitch'N-Flow — front de l'app (MVP)

Interface mobile de l'agent IA de planification des repas, en **Next.js (App Router) · React · TypeScript · Tailwind CSS**, comme prévu dans le cahier des charges.
Ce dépôt contient **uniquement le front** : les données viennent de `src/lib/mock-data.ts`, et rien n'est encore branché au backend.

## Lancer le projet

```bash
npm install
npm run dev
```

Puis ouvre http://localhost:3000. Le mieux est de passer le navigateur en vue téléphone (F12 → mode appareil) : l'app est pensée d'abord pour le mobile.

## Les écrans

| Route | Écran | Ce qui marche déjà |
|---|---|---|
| `/` | Bienvenue | frigo animé, lettres-magnets |
| `/accueil` | Accueil | repas du soir, alerte péremption, raccourcis, budget |
| `/menu` | Menu de la semaine | choix du jour, cartes repas, partage WhatsApp |
| `/assistant` | Chat avec l'agent | envoi de messages, réponse affichée au fil de l'eau (simulée), carte Confirmer / Refuser |
| `/courses` | Liste de courses | blocs marché / supermarché / boutique, cases à cocher, total, WhatsApp, itinéraire Google Maps |
| `/frigo` | Mon frigo | déclaration d'achats (simulée), produits à consommer vite, stock |
| `/urgence` | Mode « Pas le temps ? » | choix du temps et du nombre de personnes, options classées par rapidité |
| `/recettes/[id]` | Recette pas à pas | onglets Ingrédients / Étapes, progression |

Le bouton urgence (éclair) est visible sur tous les écrans principaux.

## Le style « fait main »

Pour que l'app ne fasse pas « générée », on évite les grilles parfaites et les cadres identiques partout :

- **grain papier** sur toute l'app (`components/Grain.tsx`) ;
- **notes manuscrites** en police Caveat (`font-hand`, `HandNote`), avec flèches et soulignés tremblés (`components/Hand.tsx`) ;
- **titres rétro** en Pacifico, dans les couleurs d'origine (utilitaire `retro`) ;
- **coins irréguliers** : utilitaires `wonky`, `wonky-lg`, `blob` ;
- **post-it, scotch et punaises** (`Tape`, `Pin`, `paper-shadow`) ;
- la liste de courses est un **ticket de caisse**, le frigo a de **vraies étagères** ;
- l'assistant s'appelle **Tantie** (facile à renommer : `BottomNav.tsx`, `assistant/page.tsx`, `accueil/page.tsx`).

## Organisation

```
src/
  app/
    layout.tsx            polices (Pacifico titres, Fredoka, Nunito, Caveat) et colonne mobile
    globals.css           palette, animations (Tailwind v4, @theme)
    page.tsx              bienvenue
    (onglets)/            écrans avec la barre du bas
      layout.tsx
      accueil/ menu/ assistant/ courses/ frigo/
    urgence/
    recettes/[id]/
  components/             BottomNav, UrgencyButton, MealCard, PageHeader, Icons…
    illustrations/        assiettes, aliments, mascotte, horloge (SVG)
  lib/
    types.ts              types alignés sur le modèle (Recipe, PlannedMeal, StockItem…)
    mock-data.ts          données d'exemple
    format.ts             FCFA, liens WhatsApp et Google Maps
```

## Palette

| Nom Tailwind | Couleur | Origine |
|---|---|---|
| `palme` | #344F30 | Palm Leaf |
| `foret` | #13260F | Salamander |
| `puce` | #411102 | French Puce |
| `carmin` | #9F350B | Carmim |
| `sirop` | #F47230 | Liselotte Syrup |
| `or` | #FDD973 | Golden Coin |
| `mangue` | #F9A11B | orange des illustrations |
| `lagon` / `canard` | #8FC1C9 / #2C4A4A | bleu-vert des illustrations |
| `rose`, `creme` | #F29CB0 / #FFF4DF | magnets, fond |

Utilisation : `bg-sirop`, `text-foret`, `border-palme`…

## Brancher le backend plus tard

Chaque endroit simulé porte un commentaire avec la route du cahier des charges à appeler :

- Menu : `POST /api/meal-plans/generate`, puis `POST /api/meal-plans/:id/activate`
- Chat : `POST /api/chat` (flux SSE), puis `POST /api/chat/proposals/:id/accept`
- Stock : `GET /api/stock`, `POST /api/stock/purchases`
- Urgence : `POST /api/emergency`
- Recettes : `GET /api/recipes/:id`

Il suffira de remplacer les imports de `mock-data.ts` par ces appels.
