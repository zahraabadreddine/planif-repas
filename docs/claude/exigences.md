# Exigences, sécurité, tests, données de départ, planning, hors périmètre, glossaire

> Détail extrait de `CLAUDE.md` (même numérotation de sections). Le noyau `CLAUDE.md` reste la référence pour les règles non négociables.

## 2. Périmètre du MVP

### Exigences fonctionnelles (MVP)

| N° | L'application doit permettre de… |
| --- | --- |
| EF-01 | Créer un compte, se connecter, se déconnecter, changer son mot de passe |
| EF-02 | Décrire son foyer en conversation avec l'agent |
| EF-03 | Modifier son foyer et ses membres par un formulaire |
| EF-04 | Noter une vingtaine de plats au départ (aime, bof, n'aime pas) |
| EF-05 | Discuter par écrit avec l'agent, réponse affichée en flux |
| EF-06 | Générer un menu de la semaine (budget, allergies, temps, équipement, variété, saison, restes) |
| EF-07 | Remplacer ou déplacer un repas, par un bouton ou en le demandant à l'agent |
| EF-08 | Confirmer ou refuser chaque proposition de l'agent |
| EF-09 | Générer la liste de courses du menu, stock déjà déduit |
| EF-10 | Afficher la liste en unités du marché avec coût estimé en FCFA |
| EF-11 | Partager la liste ou une recette sur WhatsApp |
| EF-12 | Indiquer où acheter chaque article et les magasins les plus proches, avec itinéraire |
| EF-13 | Déclarer ses achats en une phrase, transformée en stock après confirmation |
| EF-14 | Déduire automatiquement le stock quand un repas est cuisiné |
| EF-15 | Alerter dans l'application avant qu'un produit s'abîme |
| EF-16 | Proposer des recettes faisables avec le stock (« vider le frigo ») |
| EF-17 | Mode urgence « pas le temps » |
| EF-18 | Donner un retour après chaque repas |
| EF-19 | Voir et corriger ce que l'agent a appris |
| EF-20 | Consulter le catalogue et une recette étape par étape |
| EF-21 | Administrer recettes, ingrédients, unités, prix et magasins |
| EF-28 | Réinitialiser le mot de passe d'une utilisatrice depuis l'espace admin (pas d'emails au MVP) |

Les critères d'acceptation détaillés de chaque exigence sont dans le cahier des charges complet (section 6). La numérotation EF-01 à EF-27 est celle du cahier des charges (EF-22 à EF-27 sont reportées après le MVP, voir section 19) ; EF-28 est ajoutée par ce fichier.

### Exigences non fonctionnelles

| N° | Exigence | Seuil |
| --- | --- | --- |
| ENF-01 | Aucun allergène déclaré dans un repas proposé | 0 exception, testé automatiquement |
| ENF-02 | Chiffres calculés par le code uniquement | Aucun calcul confié à l'IA |
| ENF-03 | Application utilisable si l'API Claude est indisponible | Menu, liste et stock accessibles |
| ENF-04 | Début de la réponse de l'agent | Moins de 3 s |
| ENF-05 | Génération du menu de la semaine | Moins de 30 s |
| ENF-06 | Affichage d'une page en 4G | Moins de 2 s |
| ENF-07 | Mobile d'abord | Largeur de référence 360 px |
| ENF-08 | Premier menu pour un nouveau parent | Moins de 10 minutes |
| ENF-09 | Bouton urgence | Visible sur tous les écrans de la famille |
| ENF-10 | Accessibilité | Boutons d'au moins 44 px, contrastes lisibles |
| ENF-11 à ENF-14 | Sécurité | Voir section 13 |
| ENF-15 à ENF-17 | Données personnelles | Voir section 13 |
| ENF-18 | Coût de l'IA | Mesuré par message, plafonné |
| ENF-19 | Navigateurs | Chrome Android, Safari iPhone, navigateurs récents d'ordinateur |
| ENF-20 | Maintenabilité | TypeScript strict, un seul projet |
| ENF-21 | Services externes | Isolés derrière une interface |
| ENF-22 | Langue | Français, jamais d'avis médical |


---

## 13. Sécurité et données personnelles

### Sécurité

- [ ] HTTPS en démonstration et en production.
- [ ] Mots de passe hachés avec bcrypt ; jamais en clair, ni dans les logs.
- [ ] Session Auth.js dans un cookie HttpOnly, Secure, SameSite.
- [ ] Garde de session sur toutes les routes privées ; garde de rôle sur toutes les routes admin, **côté serveur**.
- [ ] Chaque requête de foyer filtrée sur le foyer de la session.
- [ ] Droit de modifier vérifié côté serveur : une personne invitée en lecture seule ne peut rien écrire.
- [ ] Codes d'invitation hachés, valables 48 h, utilisables une fois, annulables ; tentatives limitées comme la connexion.
- [ ] Validation zod de toutes les entrées et de tous les appels d'outils.
- [ ] Limitation du nombre de requêtes sur la connexion et le chat.
- [ ] Aucun secret dans le code, les logs ou les réponses d'erreur.
- [ ] Alertes Dependabot activées sur le dépôt.

### Données personnelles

- Allergies et régimes : données de santé, **consentement explicite** à l'accueil.
- Localisation : quartier avec consentement ; position GPS demandée au moment de la recherche, jamais enregistrée.
- Minimum de données envoyé à l'IA (section 10).
- Suppression du compte : efface le foyer, ses membres, son stock, ses menus, ses conversations et ses préférences.
- Cadre légal : loi ivoirienne n° 2013-450, autorité de contrôle ARTCI. Pilote avec des testeurs informés.

---

## 14. Tests

### Niveaux

| Niveau | Outil | Contenu |
| --- | --- | --- |
| Unitaires | Vitest | Toute la logique de `src/lib/` : filtres, score, vérification, unités, prix, lieux, distances, stock, péremption |
| API | Vitest + base de test | Routes principales, contrôle d'accès, validation |
| Agent | Vitest, Claude simulé | Bons outils appelés, propositions créées, aucune écriture directe |
| Parcours | Playwright | Inscription, accueil, menu, liste, WhatsApp, où acheter, stock, urgence |

### Tests obligatoires (ne doivent jamais échouer)

- [ ] Un foyer allergique à l'arachide ne reçoit jamais de recette avec de l'arachide (menu, remplacement, urgence, vider le frigo).
- [ ] Un menu qui dépasse le budget est refusé par le vérificateur.
- [ ] 1,4 kg de tomates avec un tas de 500 g donne 3 tas.
- [ ] Un ingrédient en stock en quantité suffisante n'apparaît pas dans la liste.
- [ ] Un repas cuisiné crée les mouvements de stock et ne rend jamais une quantité négative.
- [ ] Un compte A ne peut ni lire ni modifier le foyer d'un compte B.
- [ ] Une personne invitée en lecture seule ne peut rien modifier dans le foyer ; un code d'invitation expiré, utilisé ou annulé est refusé.
- [ ] Une proposition ne modifie rien tant qu'elle n'est pas confirmée ; une proposition expirée est refusée.
- [ ] Une route admin refuse un compte non admin.
- [ ] Les magasins sont renvoyés du plus proche au plus loin.
- [ ] Le contexte envoyé à l'IA ne contient ni email, ni nom complet, ni coordonnées GPS, ni surnom ni date de naissance des membres.

### Définition de « terminé »

Une carte Trello est terminée quand : le code respecte ce fichier ; les tests de la fonctionnalité existent et passent ; `npm run lint`, `npm test` et `npm run build` passent ; la pull request est relue et approuvée ; la fonctionnalité a été vérifiée à la main sur mobile.

---

## 15. Données de départ

`prisma/seed.ts` doit pouvoir être relancé sans erreur et créer :

- 20 à 30 recettes validées, ivoiriennes et multiculturelles (garba, sauce graine, placali, alloco, attiéké poisson, riz gras, kedjenou…), avec étapes et ingrédients ;
- les ingrédients avec catégorie, allergènes, conservation et saisons ;
- les unités du marché et leur équivalent en grammes ;
- des prix relevés par l'équipe pour chaque ingrédient, par type de lieu ;
- les quartiers et 20 à 30 magasins des communes du pilote (à confirmer avec le questionnaire) ;
- un compte admin, et deux foyers de test dont un avec une allergie à l'arachide ;
- le foyer de démonstration d'Aminata, réinitialisable par une commande dédiée.

Les données de test ne contiennent aucune donnée personnelle réelle.


---

## 18. Organisation et planning

### Répartition

| Responsable | Domaines |
| --- | --- |
| Fatima Zreik | Foyer, membres, recettes, catalogue, menu de la semaine, retours après repas |
| Zahraa Badreddine | Liste de courses, unités du marché, où acheter, stock, péremption, vider le frigo |
| Ensemble | Schéma de la base, agent IA, mode urgence, tests de bout en bout, soutenance |

### Sprints (environ deux semaines chacun)

| Sprint | Objectif | Livrable |
| --- | --- | --- |
| S0 | Cadrage | Cahier des charges, diagrammes, maquettes, dépôt, ce fichier |
| S1 | Fondations | Projet Next.js, PostgreSQL et Prisma, schéma et migration, seed, connexion, mise en page mobile, questionnaire lancé |
| S2 | Foyer et recettes | Foyer, membres, catalogue, notes de plats |
| S3 | Menu et courses | Menu, remplacement, liste, unités et FCFA, WhatsApp, où acheter |
| S4 | Stock | Achats, déduction, péremption, vider le frigo, retours après repas |
| S5 | Agent IA | Chat, accueil conversationnel, modification en parlant, mode urgence |
| S6 | Finitions | Tests, admin finalisé, pilote, soutenance |

Fin de S3 : le parcours menu, courses et WhatsApp doit fonctionner **sans l'IA** (version de secours). L'agent arrive en S5, quand toutes les fonctions qu'il appelle existent et sont testées.

---

## 19. Hors périmètre

Ne pas implémenter sans demande explicite. Le code peut être préparé pour ces évolutions (interfaces, champs facultatifs), sans les développer.

| Reporté après le MVP | Prévu dans |
| --- | --- |
| Messages vocaux et transcription (EF-23) | Interface `SpeechToTextProvider` |
| Anglais et arabe (EF-27) | i18next, affichage de droite à gauche |
| Application installable et notifications (EF-27) | PWA, Web Push |
| Emails (vérification, mot de passe oublié) | Interface `EmailSender` |
| Bilan du mois (EF-22) | Calculé depuis `StockMovement` et les menus |
| Autres urgences (invités, plus de gaz, fin de mois, malade) (EF-24) | Extension de `planEmergency` |
| Mode événements (EF-25) | Nouveau modèle `Event` |
| Carnet familial, suivi nutritionnel, recettes en audio (EF-26) | Fonctions premium |
| Offre premium et paiement mobile money | Interface `PaymentProvider` |
| Brouillons de recettes rédigés par l'IA | Route admin dédiée, recettes `source = ai` à valider |
| Recherche de magasins élargie | Google Places ou OpenStreetMap derrière `StoreLocator` |
| Bot WhatsApp, applications mobiles | Après le pilote |

---

## 20. Glossaire

| Terme | Signification |
| --- | --- |
| Foyer | Famille ou groupe de personnes qui mangent ensemble |
| Unité de marché | Unité réelle d'achat : tas, morceau, sachet, boîte, pièce |
| Proposition | Modification suggérée par l'agent, appliquée seulement après confirmation |
| Outil | Fonction de notre code que l'agent peut appeler |
| Filtre dur | Règle appliquée par le code qui exclut une recette, sans exception |
| À consommer vite | Article à moins de 2 jours de sa date de péremption estimée |
| Mouvement de stock | Ligne du journal du stock : achat, cuisiné, jeté, correction |
| Menu brouillon | Menu généré, pas encore validé par la famille |
| FCFA | Franc CFA (XOF), monnaie de tous les montants, toujours en entiers |
