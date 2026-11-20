# Analyse Comparative des Architectures : Modèle Traditionnel (DDD) vs Event Sourcing

Ce document compare l'architecture proposée initialement (Modèle Traditionnel structuré via DDD et base relationnelle) avec une architecture purement orientée événements (Event Sourcing). Il intègre également l'impact de ces choix sur le frontend et propose une évaluation de trois écosystèmes backend : Python/Django, Go, et TypeScript/NestJS.

## 1. Définition des deux modèles

### Modèle A : Le Modèle Traditionnel Structuré (State-Based)
Il s'agit d'une approche basée sur l'état, couplée à un design métier fort (Domain-Driven Design).
* **Stockage :** La base de données PostgreSQL stocke l'état *actuel* du match et un historique relationnel des actions (`Play`, `PlaySegment`, `Penalty`).
* **Fonctionnement :** Lorsqu'une action se produit, le système valide les règles métier, met à jour les compteurs (yards, score, tentatives) et sauvegarde l'état final dans les tables relationnelles.
* **Synchronisation hors-ligne :** Utilise le pattern *Outbox* (file d'attente de commandes locales) et gère la concurrence via des numéros de version (concurrence optimiste).

### Modèle B : Event Sourcing & CQRS (Event-Based)
Il s'agit d'une approche basée strictement sur les faits.
* **Stockage :** La base de données stocke uniquement un flux d'événements métiers immuables (`MatchDemarre`, `CourseValidee`, `PenaliteAppliquee`). L'état actuel n'est jamais stocké de manière centrale en écriture.
* **Fonctionnement :** Pour connaître le score ou la position du ballon, le système "rejoue" et additionne tous les événements depuis le début du match (via des fonctions de réduction pures).
* **Synchronisation hors-ligne :** Le client accumule les événements localement et les "pousse" vers le serveur au retour du réseau. Les vues de lecture pour le public (CQRS) sont générées en arrière-plan.

## 2. Impact sur l'Interface Utilisateur (React)

Le choix de l'architecture backend modifie radicalement la conception du frontend.

| Critère | En Modèle Traditionnel (Data-Driven) | En Event Sourcing (Task-Based) |
| :--- | :--- | :--- |
| **Philosophie** | L'interface agit comme un éditeur. L'opérateur "modifie la ligne 4 de la table des jeux". | L'interface rapporte des faits bruts. L'opérateur signale "Une course du joueur 12 de 15 yards". |
| **Payload Réseau** | Envoi d'un état calculé (`PUT {yards: 15, next_down: 2}`). Risque de corruption si la tablette calcule mal. | Envoi d'une intention (`POST {type: RecordPlay, yards: 15}`). La logique reste 100% côté serveur. |
| **État React** | Nécessite des requêtes `GET` fréquentes pour rafraîchir l'interface après une action ou une correction complexe. | Utilisation d'un `useReducer`. Les mêmes événements rejouent l'interface localement, rendant la correction fluide. |
| **Mode Hors-ligne** | Résolution des conflits lourde et complexe au retour du réseau (fusion d'états). | Trivial : envoi d'une simple liste ordonnée d'actions (Append-Only) au retour de la connexion. |

## 3. Comparatif Technologique Backend

Le choix de la stack backend est crucial selon le modèle d'architecture retenu. Voici les trois voies principales pour ce projet :

### Option 1 : Python / Django (La Productivité Initiale)
* **Idéal pour :** Le Modèle Traditionnel (State-Based) et les lancements rapides.
* **Avantages :** Outillage exceptionnel (interface d'administration native, gestion de l'authentification, migrations ORM). L'équipe peut construire le MVP très rapidement.
* **Inconvénients :** Le langage interprété et le *Global Interpreter Lock* (GIL) rendent Python moins performant pour traiter des milliers d'événements simultanés ou rejouer des historiques d'Event Sourcing à haute fréquence. Déploiement plus lourd (environnements virtuels, WSGI/ASGI).

### Option 2 : Go / Golang (La Performance Brute)
* **Idéal pour :** L'Event Sourcing pur et l'ingénierie temps-réel de pointe.
* **Avantages :** Langage compilé ultra-rapide, gestion native de la très forte charge (Goroutines). Déploiement radicalement simplifié : l'application est compilée en un binaire exécutable unique (quelques Mo), sans dépendances externes. Le typage strict s'accorde parfaitement avec le DDD.
* **Inconvénients :** Plus de code "boilerplate". Pas de panel d'administration généré automatiquement ni d'ORM magique. Courbe d'apprentissage si l'équipe vient de Python.

### Option 3 : TypeScript / NestJS (L'Unification Monorepo)
* **Idéal pour :** L'Event Sourcing CQRS tout en gardant une synergie totale avec le frontend React.
* **Avantages :** Un seul langage (TypeScript) pour toute l'équipe. Les types métiers et les interfaces d'événements (`PlayCompleted`, `PenaltyCalled`) sont partagés entre la tablette (React) et le serveur (NestJS). Le framework NestJS possède un module CQRS/Event Sourcing natif très robuste.
* **Inconvénients :** Reste lié à la boucle d'événements (Event Loop) monothread de Node.js, ce qui est très performant pour l'I/O asynchrone mais moins puissant que Go pour des calculs CPU lourds. Plus verbeux que Python.

## 4. Guide de décision

**Choisis le Modèle Traditionnel avec Python/Django si :**
1. L'équipe maîtrise cet écosystème à la perfection.
2. Le "Time-to-Market" du premier pilote (ONEFA) est la priorité absolue, quitte à refondre l'architecture dans 2 ans.
3. Tu acceptes que les fonctionnalités de "correction d'erreurs passées" soient laborieuses à concevoir au début.

**Choisis l'Event Sourcing avec TypeScript/NestJS si :**
1. Tu veux capitaliser sur les compétences TypeScript (Vite/React) de ton équipe en créant un Monorepo fluide entre front et back.
2. La robustesse du mode hors-ligne et la facilité à corriger des données sur le terrain sont non-négociables.
3. Tu cherches un bon équilibre entre architecture asynchrone moderne et productivité d'équipe.

**Choisis l'Event Sourcing avec Go si :**
1. Tu vises une application massive avec des sports à la volumétrie ultra-rapide (basket, flag football à très haut niveau).
2. L'optimisation des coûts d'infrastructure et la simplicité de déploiement (binaire unique Dockerisé) sont au centre de ta stratégie SaaS.