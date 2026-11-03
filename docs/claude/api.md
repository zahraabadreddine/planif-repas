# API du backend

> Détail extrait de `CLAUDE.md` (même numérotation de sections). Le noyau `CLAUDE.md` reste la référence pour les règles non négociables.

## 9. API du backend

Routes Next.js sous `src/app/api/`. Toutes exigent une session sauf `register` et Auth.js. Les routes `admin` exigent le rôle admin. Toutes répondent en JSON, sauf le chat (flux SSE).

| Méthode | Route | Rôle | Exigence |
| --- | --- | --- | --- |
| POST | `/api/register` | Créer un compte (email, mot de passe, nom, consentements) | EF-01 |
| — | `/api/auth/…` | Connexion, déconnexion, session (Auth.js) | EF-01 |
| PUT | `/api/account/password` | Changer son mot de passe | EF-01 |
| PUT | `/api/account/consent` | Donner après l'inscription son consentement aux données de santé | ENF-15 |
| DELETE | `/api/account` | Supprimer son compte et son foyer | ENF-16 |
| GET, PUT | `/api/household` | Lire ou modifier le foyer | EF-03 |
| POST | `/api/household/members` | Ajouter un membre | EF-03 |
| PUT, DELETE | `/api/household/members/:id` | Modifier ou retirer un membre et ses restrictions | EF-03 |
| GET, POST | `/api/household/invitations` | Comptes et invitations du foyer ; créer un code d'invitation (propriétaire) | EF-03 |
| DELETE | `/api/household/invitations/:id` | Annuler un code d'invitation (propriétaire) | EF-03 |
| POST | `/api/household/join` | Rejoindre un foyer avec un code | EF-03 |
| PATCH, DELETE | `/api/household/users/:id` | Changer le droit d'une personne invitée, ou la retirer du foyer (propriétaire) | EF-03 |
| POST | `/api/household/leave` | Quitter le foyer (personne invitée) | EF-03 |
| POST | `/api/household/ratings` | Notes de plats du départ | EF-04 |
| GET | `/api/household/learned` | Préférences apprises | EF-19 |
| PATCH | `/api/household/learned/:id` | Corriger ou désactiver une préférence | EF-19 |
| POST | `/api/chat/messages` | Message à l'agent (identifiant de conversation facultatif) ; réponse en flux | EF-05 |
| GET | `/api/chat/conversations/:id` | Historique | EF-05 |
| POST | `/api/chat/proposals/:id/accept` | Appliquer une proposition après revérification | EF-08 |
| POST | `/api/chat/proposals/:id/reject` | Refuser une proposition | EF-08 |
| POST | `/api/emergency` | Mode urgence ; réponse en flux | EF-17 |
| POST | `/api/meal-plans/generate` | Générer un menu brouillon (date de début de semaine) | EF-06 |
| GET | `/api/meal-plans/current` | Menu de la semaine en cours | EF-06 |
| POST | `/api/meal-plans/:id/activate` | Valider le menu et générer la liste | EF-06 |
| PATCH | `/api/planned-meals/:id` | Déplacer, remplacer, changer les portions | EF-07 |
| POST | `/api/planned-meals/:id/cooked` | Marquer cuisiné (déduit le stock) | EF-14 |
| POST | `/api/planned-meals/:id/feedback` | Retour après repas | EF-18 |
| POST | `/api/meal-plans/:id/shopping-list` | (Re)générer la liste | EF-09 |
| GET | `/api/shopping-lists/:id` | Liste avec coûts | EF-10 |
| PATCH | `/api/shopping-lists/:id/items/:itemId` | Cocher un article | EF-10 |
| GET | `/api/shopping-lists/:id/share` | Texte et lien WhatsApp | EF-11 |
| GET | `/api/shopping-lists/:id/where-to-buy` | Découpage par lieu et magasins conseillés | EF-12 |
| GET | `/api/stores` | Magasins triés par distance (latitude et longitude, ou quartier ; type) | EF-12 |
| GET | `/api/stock` | Stock, produits à consommer vite en premier | EF-15 |
| POST | `/api/stock/purchases` | Déclarer des achats (structurés ou phrase) | EF-13 |
| PATCH | `/api/stock/:id` | Corriger une quantité (crée un mouvement de correction) | EF-14 |
| POST | `/api/stock/:id/thrown` | Déclarer un produit jeté | EF-14 |
| GET | `/api/recipes` | Catalogue filtré (texte, durée maximale, cuisine, sans cuisson, faisable avec le stock) | EF-20 |
| GET | `/api/recipes/:id` | Détail et étapes | EF-20 |
| POST | `/api/prices/report` | Déclarer un prix observé | EF-21 |
| CRUD | `/api/admin/recipes` | Gérer et valider les recettes | EF-21 |
| CRUD | `/api/admin/ingredients` | Ingrédients et unités | EF-21 |
| CRUD | `/api/admin/prices` | Relevés de prix | EF-21 |
| CRUD | `/api/admin/stores` | Magasins | EF-21 |
| POST | `/api/admin/users/:id/reset-password` | Réinitialiser le mot de passe d'une utilisatrice | EF-28 |
| GET | `/api/admin/stats` | Usage, coût de l'IA, indicateurs | ENF-18 |

