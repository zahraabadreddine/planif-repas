# Logique métier

> Détail extrait de `CLAUDE.md` (même numérotation de sections). Le noyau `CLAUDE.md` reste la référence pour les règles non négociables.

## 11. Logique métier

### Menu de la semaine (`src/lib/planificateur/`)

1. **Filtres durs** : recettes validées ; aucun allergène ni régime strict d'un membre ; équipement disponible (gaz, four…) ; temps compatible avec les horaires du jour.
2. **Score** : coût par portion par rapport au budget, saison, usage des produits `useSoon`, variété (pénalité si servie dans les 14 derniers jours ou ingrédient principal déjà présent dans la semaine), notes de départ, préférences apprises actives. Les poids sont des constantes nommées dans `score.ts`.
3. **Composition** : Claude reçoit les 30 meilleures recettes avec leur coût calculé, choisit un repas par créneau, prévoit les restes et rédige l'explication.
4. **Vérification** : aucun allergène, coût total inférieur ou égal au budget, temps respecté chaque jour, aucune recette deux fois dans la semaine, restes cohérents.
5. **Échec** : Claude recompose avec la raison, deux fois au maximum ; ensuite, le code compose seul à partir des meilleurs scores.
6. **Résultat** : menu `draft` avec explication ; à la validation, il devient `active` et la liste de courses est générée.

### Liste de courses (`src/lib/courses/`)

1. Additionner les ingrédients des repas du menu, ajustés aux portions, en tenant compte des restes prévus.
2. Retirer les quantités disponibles en stock.
3. Convertir en unités du marché et **arrondir à l'unité supérieure** (1,4 kg de tomates avec 1 tas = 500 g donne 3 tas).
4. Estimer le coût de chaque article avec le prix retenu, puis le total.

### Prix retenu

Médiane des relevés des 90 derniers jours pour l'ingrédient, la ville et le type de lieu. **Tant qu'il y a moins de 3 relevés d'utilisatrices, on utilise en priorité les relevés de l'équipe.** Un relevé (`team` ou `user`) est un prix réellement observé, avec sa source et sa date.

Sans aucun relevé récent, on utilise l'estimation la plus récente de l'équipe (`estimate`), toujours affichée comme estimation (« prix estimé »). Sans relevé ni estimation, l'article est marqué « prix inconnu » et exclu du total, avec un avertissement.

### Où acheter

1. Pour chaque article, choisir le type de lieu le moins cher. Si l'écart est inférieur à 10 %, choisir le lieu où se trouve déjà la majorité de la liste.
2. Sans prix connu : produits frais au marché, produits emballés au supermarché.
3. Pour chaque type de lieu, renvoyer les 3 magasins les plus proches (haversine), depuis la position du téléphone si l'utilisatrice l'accepte, sinon depuis le centre de son quartier. Exclure les magasins fermés quand les horaires sont connus.
4. Lien d'itinéraire : `https://www.google.com/maps/dir/?api=1&destination=<latitude>,<longitude>`.
5. La position du téléphone n'est jamais enregistrée.

### Stock et péremption (`src/lib/stock/`)

- `expiresAt` = date d'achat + durée de conservation de l'ingrédient pour le lieu de rangement.
- À chaque ouverture de l'accueil : les articles à moins de 2 jours de `expiresAt` passent en `useSoon` (pas de tâche planifiée au MVP).
- Repas marqué cuisiné : un mouvement `cooked` par ingrédient ; si le stock est insuffisant, on retire ce qui existe et on ne passe jamais sous zéro.
- Produit jeté : mouvement `thrown` avec l'équivalent en grammes (sert à mesurer le gaspillage).

### Mode urgence (« pas le temps »)

1. Recettes faisables **uniquement avec le stock**, dans le temps donné, pour le nombre de personnes, allergènes exclus.
2. 2 ou 3 options classées par rapidité. Si aucune : solution de secours honnête.
3. Après le choix : proposition de réorganisation (le repas prévu ce soir est décalé au lendemain).

### Apprentissage

Quand une tendance se confirme (par exemple un plat noté 1 deux fois), `rememberPreference` enregistre une préférence avec une explication lisible. Elle est utilisée dans le score tant qu'elle est active.

### Partage WhatsApp

Texte généré par `src/lib/courses/whatsapp.ts` : titre, articles regroupés par lieu, quantités en unités du marché, total estimé. Lien `https://wa.me/?text=` suivi du texte encodé. L'utilisatrice choisit le destinataire.

