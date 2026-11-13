# Journal d'apprentissage frontend

## Objectif de la séance

Construire la première version de l'écran **Live Capture** en React et TypeScript dans le cadre de l'issue GitHub #1, avec une interface responsive, testée et prête à être intégrée.

## Notions pratiquées

- Découpage d'un écran en composants React responsables d'une seule fonction.
- Définition de props et de modèles immuables avec TypeScript.
- Gestion d'un formulaire contrôlé avec `useState` et `SubmitEvent`.
- Dérivation de l'état de l'interface (`canSave`) plutôt que stockage d'un état redondant.
- Communication parent-enfant avec des props et des callbacks.
- Affichage conditionnel et rendu de listes avec une clé stable.
- Accessibilité : labels, rôles, `aria-pressed`, état `disabled` et message de statut.
- Mise en page responsive avec une approche mobile-first.
- Tests de composants et d'interactions avec Vitest et Testing Library.
- Mise en place des contrôles de qualité avec lint, build, pre-commit et GitHub Actions.
- Première revue de sécurité frontend : XSS, CSRF, injection SQL, dépendances et en-têtes HTTP.

## Ce que je sais refaire seul

- Créer et typer un composant React simple.
- Créer une structure de dossiers par fonctionnalité.
- Définir des types métier et les utiliser dans les props.
- Gérer la sélection d'une action et la saisie d'un formulaire.
- Désactiver ou activer un contrôle à partir de l'état courant.
- Ajouter une nouvelle ligne à une liste immuable.
- Écrire des tests qui simulent les actions d'un utilisateur.
- Ajouter les styles responsive d'un composant.
- Exécuter les commandes de lint, de test et de build.

## Ce qui reste à consolider

- Choisir précisément dans quel composant placer chaque responsabilité.
- Distinguer l'état stocké de l'état qui peut être calculé.
- Renforcer la validation métier, notamment les limites autorisées pour les yards.
- Tester systématiquement les cas limites et les variantes singulier/pluriel.
- Approfondir la sécurité lors de l'arrivée de l'API : authentification, CSRF, CORS, validation serveur et politique CSP.
- Configurer les en-têtes de sécurité sur la future plateforme d'hébergement.

## Prochain exercice

Ajouter la suppression d'une action récemment enregistrée :

1. Ajouter un bouton **Supprimer** sur chaque ligne de `RecentPlaysList`.
2. Faire remonter l'identifiant de l'action avec une prop callback `onDelete`.
3. Mettre à jour la liste de manière immuable dans `LiveCaptureScreen`.
4. Demander une confirmation accessible avant la suppression.
5. Tester qu'une action est supprimée sans modifier les autres.
6. Tester le retour du message vide après la suppression de la dernière action.

## État actuel du projet

- L'écran Live Capture de l'issue #1 est fonctionnel et responsive.
- Les tests, le lint et le build passent.
- L'audit `npm audit` ne signale aucune vulnérabilité connue au 10 novembre 2026.
- Avant la mise en production, il faudra configurer les en-têtes HTTP de sécurité et renforcer la chaîne CI.
