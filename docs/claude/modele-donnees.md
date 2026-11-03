# Modèle de données

> Détail extrait de `CLAUDE.md` (même numérotation de sections). Le noyau `CLAUDE.md` reste la référence pour les règles non négociables.

## 8. Modèle de données

`prisma/schema.prisma` est la source de vérité. Tous les modèles ont `id` (UUID), `createdAt` et `updatedAt`. Les suppressions d'un foyer se propagent en cascade à ses données ; le catalogue n'est jamais supprimé par cascade.

### Comptes et foyer

| Modèle | Champs principaux | Relations et règles |
| --- | --- | --- |
| `User` | email (unique), passwordHash, fullName, role, consentHealthAt, consentLocationAt, householdAccess | Appartient à un `Household` ; role : user ou admin ; householdAccess : droit d'une personne invitée (edit ou view), vide pour le propriétaire |
| `Household` | name, weeklyBudgetFcfa, cuisinesPreferred (Json), equipment (Json), shoppingDay | Propriétaire (`User`), quartier (`Neighborhood`, facultatif) ; plusieurs comptes par foyer : le propriétaire et des personnes invitées |
| `HouseholdInvitation` | codeHash (unique), access, expiresAt, usedAt, revokedAt | Foyer + auteur + personne qui l'a utilisée ; code à 6 caractères jamais stocké en clair, valable 48 h, utilisable une fois, annulable |
| `HouseholdMember` | label, ageGroup, birthDate, schedule (Json) | Appartient à un foyer ; label = surnom choisi par la famille (« Papa », « Awa »), affiché dans l'app et jamais envoyé à l'IA ; birthDate facultative, jamais envoyée à l'IA ; quand elle est connue, ageGroup en est déduit |
| `MemberRestriction` | type, value, severity | Appartient à un membre ; severity strict = filtre dur |
| `DishRating` | rating (1 à 3) | Foyer + recette, couple unique |
| `Neighborhood` | commune, name, latitude, longitude | Centre du quartier, sert aux distances |

### Catalogue et magasins (partagé par tous les foyers)

| Modèle | Champs principaux | Relations et règles |
| --- | --- | --- |
| `Ingredient` | name, category, allergens (liste), shelfLifeDays (Json : ambiant, frigo, congélateur), seasonalMonths (liste), storageTip | Unité par défaut (`MarketUnit`) |
| `MarketUnit` | label, gramsEquivalent | Ingrédient facultatif (vide = unité générique : kg, pièce) |
| `Recipe` | title, cuisine, mealTypes, prepMinutes, cookMinutes, needsCooking, servings, difficulty, tags, steps (Json), leftoverIdeas (Json), source, validated | source : team ou ai ; seules les recettes validées sont proposées |
| `RecipeIngredient` | quantity, optional | Recette + ingrédient + unité |
| `Price` | priceFcfa, placeType, city, source, observedAt | Ingrédient + unité ; magasin et déclarant facultatifs ; source : team (relevé de l'équipe), user (déclaré par une famille) ou estimate (estimation, à défaut de relevé) |
| `Store` | name, type, address, latitude, longitude, openingHours (Json) | Quartier ; type : market, supermarket, shop |

### Planification

| Modèle | Champs principaux | Relations et règles |
| --- | --- | --- |
| `MealPlan` | weekStart, status, estimatedCostFcfa, generationNotes | Foyer ; un seul menu `active` par foyer et par semaine |
| `PlannedMeal` | date, slot, servings, status | Menu + recette ; `leftoverFromId` facultatif (réutilise les restes d'un autre repas du même menu) |
| `MealFeedback` | cooked, liked (1 à 3), leftovers, comment | Repas + utilisateur |

### Courses et stock

| Modèle | Champs principaux | Relations et règles |
| --- | --- | --- |
| `ShoppingList` | estimatedTotalFcfa, sharedAt | Foyer + menu ; au plus une liste par menu |
| `ShoppingListItem` | quantity, estimatedPriceFcfa, placeType, checked | Liste + ingrédient + unité |
| `StockItem` | quantity, location, addedAt, expiresAt, status | Foyer + ingrédient + unité ; quantité jamais négative |
| `StockMovement` | type, quantity, grams, reference | Article de stock ; quantité positive en entrée, négative en sortie ; jamais supprimé |

### Agent et apprentissage

| Modèle | Champs principaux | Relations et règles |
| --- | --- | --- |
| `Conversation` | mode | Foyer + utilisateur |
| `Message` | role, content (Json), model, tokensIn, tokensOut | Conversation |
| `AgentProposal` | type, payload (Json), status, expiresAt | Conversation ; expire 24 h après sa création |
| `LearnedPreference` | key, value, confidence, explanation, source, active | Foyer ; désactivable par la famille |

### Énumérations

| Énumération | Valeurs |
| --- | --- |
| `Role` | user, admin |
| `HouseholdAccess` | edit, view |
| `AgeGroup` | baby, child, teen, adult, senior |
| `RestrictionType` | allergy, diet, dislike, healthGoal |
| `Severity` | strict, preference |
| `PlaceType` | market, supermarket, shop |
| `RecipeSource` | team, ai |
| `PriceSource` | team, user, estimate |
| `PlanStatus` | draft, active, archived |
| `MealSlot` | breakfast, lunch, dinner |
| `MealStatus` | planned, cooked, skipped, replaced |
| `StorageLocation` | fridge, freezer, pantry |
| `StockStatus` | ok, useSoon, used, thrown |
| `MovementType` | purchase, cooked, thrown, correction |
| `ConversationMode` | chat, emergency, onboarding |
| `MessageRole` | user, assistant, tool |
| `ProposalType` | profileUpdate, weekPlan, mealChange, purchase, emergency |
| `ProposalStatus` | pending, accepted, rejected, expired |

### Index à prévoir

Foyer sur toutes les tables de foyer ; `MealPlan` (foyer, weekStart) ; `StockItem` (foyer, expiresAt) ; `Price` (ingrédient, city, placeType, observedAt) ; `Store` (type) ; `AgentProposal` (status, expiresAt). Recherche plein texte PostgreSQL sur le titre et les tags des recettes.
