# Interface utilisateur

> Détail extrait de `CLAUDE.md` (même numérotation de sections). Le noyau `CLAUDE.md` reste la référence pour les règles non négociables.

## 12. Interface utilisateur

### Style « fait main » (design Umami)

- Nom affiché de l'application : **Umami**. L'agent se présente comme **« Umi »**, le « i » d'umami qui prend vie.
- Logo : le « U » dessiné qui cuisine (`src/components/logo.tsx`) ; icône d'onglet dans `src/app/icon.svg`.
- Mascotte Umi (`src/components/umi.tsx`) avec trois humeurs : `contente`, `reflechit` (l'agent écrit), `urgence` (mode « pas le temps »).
- Papier texturé (grain), écriture manuscrite (Caveat) pour les annotations, titres rétro (Pacifico), textes en Fredoka et Nunito.
- Coins irréguliers (`wonky`, `blob`), scotch, punaises et ombres de papier ; la liste de courses ressemble à un ticket de caisse.
- Palette (définie dans `@theme`) :

| Nom | Couleur | Nom | Couleur |
| --- | --- | --- | --- |
| palme | #344F30 | or | #FDD973 |
| foret | #13260F | mangue | #F9A11B |
| puce | #411102 | lagon | #8FC1C9 |
| carmin | #9F350B | canard | #2C4A4A |
| sirop | #F47230 | rose | #F29CB0 |
| creme | #FFF4DF | sable, biscuit, cacao, tomate, aubergine | couleurs d'appoint |

### Règles d'écran

- **Mobile d'abord** (360 px), utilisable d'une seule main. Navigation par barre en bas : Accueil, Menu, Courses, Stock, Chat.
- **Bouton urgence** visible sur tous les écrans de la famille.
- **Accueil** : alertes de péremption en tête, repas du jour, accès rapide au menu et au chat.
- **Chat** : réponse en flux, cartes de proposition avec Confirmer et Modifier.
- **Montants** affichés au format « 12 500 FCFA ». **Quantités** en unités du marché, jamais en grammes.
- Boutons d'au moins 44 px, contrastes lisibles, libellés explicites.
- États de chargement, d'erreur et de liste vide sur chaque écran.
- Consentements (santé, localisation) demandés clairement à l'accueil, refusables.

