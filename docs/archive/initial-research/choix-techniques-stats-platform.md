# Plateforme de statistiques sportives : choix techniques

Date : 3 novembre 2026 · Version 0.1 · Document de travail

Contexte : application SaaS de collecte et d'affichage de statistiques de football américain et de flag football (saisie en match, hors-ligne, corrections, tableaux de bord). Ce document résume les choix techniques discutés, leurs avantages et inconvénients, et ce qui reste à confirmer.

**Légende :** ✅ retenu · 🟡 proposé, à confirmer · ❌ écarté pour l'instant

## Vue d'ensemble

| # | Sujet | Choix | Statut |
| :-- | :--- | :--- | :--- |
| 1 | Modèle de données | Journal de jeux (*play log*) comme source de vérité + état dérivé par fonction pure | ✅ |
| 2 | Langage / stack | TypeScript full-stack en monorepo | ✅ |
| 3 | Moteur de règles | Paquet TypeScript pur, partagé client/serveur, règlements versionnés | ✅ |
| 4 | Frontend | React + Vite en PWA | ✅ |
| 5 | Backend | NestJS | 🟡 |
| 6 | Base de données | PostgreSQL (ORM : Drizzle ou Prisma) | 🟡 |
| 7 | Stockage local / hors-ligne | IndexedDB (Dexie) + outbox | 🟡 |
| 8 | Temps réel public | SSE | 🟡 |
| 9 | Synchronisation | Idempotence par UUID client, un opérateur par match | 🟡 |
| 10 | Développement assisté par IA | Architecture décidée par l'humain, tests de référence comme filet | ✅ |

---

## 1. Modèle de données : journal de jeux + état dérivé

**Principe.** On stocke uniquement des **faits** (course de 4 yards, passe incomplète, pénalité acceptée…). Le score, le down, la distance et la possession sont **recalculés** par `computeGame(plays, rules)`. Ce n'est ni du CRUD pur, ni de l'Event Sourcing complet avec CQRS.

**Avantages**
- Une correction en cascade est naturelle : on remplace ou insère un jeu, puis on recalcule tout.
- Les incohérences sont visibles (`issues`) au lieu d'être silencieusement stockées.
- Le calcul est déterministe : même résultat sur la tablette et sur le serveur.
- Base relationnelle simple : requêtes de statistiques en SQL, pas d'infrastructure d'event store.
- Les concepts appris (événements, projections, idempotence, versionnement) se transposent à l'Event Sourcing complet si un client le demande.

**Inconvénients**
- Il faut une discipline stricte : aucune valeur calculée ne doit être saisie ou stockée comme vérité.
- Les corrections rétroactives demandent une table de révisions pour garder un audit propre.
- Moins « standard » qu'un CRUD ou qu'un framework ES : moins de documentation prête à l'emploi.
- Le recalcul complet suppose que les matchs restent petits (~150 jeux, aucun souci à cette échelle).

**Alternatives écartées**

| Option | Pourquoi pas (pour l'instant) |
| :--- | :--- |
| CRUD pur (état stocké) | Les corrections en cascade deviennent douloureuses, la résolution de conflits hors-ligne est lourde |
| Event Sourcing + CQRS complet | Coût de complexité élevé (schémas d'événements, projections asynchrones, effacement RGPD) sans besoin avéré au stade pilote |

---

## 2. Langage et stack : TypeScript full-stack

**Avantages**
- Un seul langage pour la tablette, le serveur et le moteur de règles : pas de duplication de la logique métier.
- Types partagés (jeux, état, règlement) entre front et back.
- Très bien supporté par les assistants IA.
- Compétence polyvalente et demandée pour ton profil de développeur.

**Inconvénients**
- Courbe d'apprentissage de quelques semaines (venant de PHP/Symfony).
- Écosystème plus fragmenté que Symfony ou Django : plus de choix à faire (ORM, validation, structure).
- Pas d'interface d'administration native comme Django.

**Comparaison avec les alternatives**

| Stack | Atouts | Limites pour ce projet |
| :--- | :--- | :--- |
| **TypeScript (retenu)** | Moteur de règles écrit une fois, front et back unifiés | Nouvelle stack à apprivoiser |
| Symfony | Stack déjà maîtrisée, Doctrine, Voters, Messenger, Mercure | Moteur de règles à dupliquer en TS côté client ; n'ajoute pas de compétence nouvelle |
| Django | Admin natif très rapide, bon écosystème IA | Moteur dupliqué ; Channels/Celery plus lourds pour le temps réel |
| Go | Performance, binaire unique | La performance ne sert à rien ici (volumes minuscules), beaucoup de code répétitif |

**Portefeuille de solutions.** Symfony reste la réponse pour les besoins CRUD/back-office classiques, TypeScript pour le temps réel et l'offline-first, et Python pourra entrer plus tard pour la voix et la vidéo, comme petit service séparé.

---

## 3. Moteur de règles partagé et versionné

**Principe.** Un paquet `packages/domain` en TypeScript pur, sans dépendance, qui contient les types, le reducer (`applyPlay`), `computeGame` et les règlements (`Ruleset`) comme paramètres versionnés.

**Avantages**
- Une seule implémentation pour le calcul hors-ligne (tablette) et l'autorité serveur.
- Facile à tester : des matchs de référence rejoués donnent des résultats attendus.
- Le règlement d'une compétition est une donnée, pas du code : on peut ajouter des profils (contact, flag, autres compétitions).

**Inconvénients**
- C'est le cœur du produit : toute erreur ici se propage partout. Les tests de référence sont indispensables.
- Le périmètre actuel est volontairement réduit (voir « Hors tranche »).
- Les règlements réels sont plus nuancés que le profil de démonstration.

---

## 4. Frontend : React + Vite en PWA

**Avantages**
- PWA installable sur tablette, sans passer par les stores.
- Un seul code pour mobile et tablette ; le moteur de règles tourne localement.
- Vite : démarrage et rechargement rapides.

**Inconvénients**
- Le hors-ligne dans le navigateur dépend des limites de stockage et de la batterie : à tester sur de vrais appareils, avec un export de secours.
- Moins d'accès aux capacités natives (micro, caméra) qu'une application native, ce qui peut compter pour la voix plus tard.

---

## 5. Backend : NestJS 🟡

**Avantages**
- Modules, injection de dépendances et décorateurs proches de Symfony : courbe douce pour toi.
- Peut importer directement `packages/domain`.
- Module CQRS optionnel disponible si le besoin apparaît.

**Inconvénients**
- Plus verbeux qu'un micro-framework.
- Boucle d'événements monothread (suffisant ici, volumes faibles).
- Non encore construit : le choix reste à confirmer au démarrage de `apps/api`.

---

## 6. Base de données : PostgreSQL 🟡

**Structure envisagée :** table `plays` (id UUID, game_id, seq, type, payload jsonb, recorded_by, revision) + table `play_revisions` pour l'audit, plus des projections relationnelles (statistiques par joueur, score).

**Avantages**
- Robuste, relationnelle, requêtes de statistiques simples, `jsonb` pour les payloads de jeux.
- Transactions pour garantir l'idempotence à la synchronisation.

**Inconvénients**
- Le payload `jsonb` demande de valider les formes avec soin (schémas partagés avec `domain`).
- Choix de l'ORM (Drizzle ou Prisma) encore ouvert.

---

## 7. Hors-ligne : IndexedDB (Dexie) + outbox 🟡

**Avantages**
- Les jeux sont enregistrés localement d'abord, puis synchronisés : le terrain ne dépend pas du réseau.
- Les états « local / synchronisé / conflit » peuvent être affichés à l'opérateur.

**Inconvénients**
- Le stockage du navigateur peut être purgé ou limité selon l'appareil.
- Il faut prévoir une sauvegarde récupérable (export) et tester les scénarios de coupure.

---

## 8. Temps réel public : SSE 🟡

**Avantages**
- Plus simple que les WebSockets pour un flux à sens unique (scores et statistiques en direct).
- Reconnexion automatique gérée par le navigateur.

**Inconvénients**
- Unidirectionnel : suffisant pour la consultation, pas pour de la collaboration bidirectionnelle.
- Certaines infrastructures (proxies) gèrent mal les connexions longues : à vérifier au déploiement.

---

## 9. Synchronisation et concurrence 🟡

**Choix :** chaque jeu porte un UUID généré par le client ; le serveur déduplique. Un seul opérateur par match pour le pilote.

**Avantages**
- Les renvois après coupure ne créent pas de doublons.
- Un seul opérateur élimine la plupart des conflits d'édition.

**Inconvénients**
- Pas de saisie collaborative simultanée au départ (reportée volontairement).
- La renumérotation des `seq` lors d'insertions doit être gérée avec soin côté serveur.

---

## 10. Développement assisté par IA

**Règles retenues**
- L'architecture et le modèle (jeux, règles, concurrence) sont décidés par l'humain ; l'IA implémente.
- Des **matchs de référence** (jeux + résultats attendus) servent de filet de sécurité, qu'un code soit écrit à la main ou généré.
- Relecture attentive des parties critiques : validation des jeux, synchronisation, droits d'accès.

**Avantages :** vitesse de développement, boilerplate réduit, apprentissage accéléré d'une nouvelle stack.
**Inconvénients :** risque d'erreurs subtiles dans une stack encore peu maîtrisée ; il faut garder du temps pour comprendre et pas seulement pour livrer.

---

## Hors tranche (volontairement)

Fumbles, retours, punts, field goals, prolongations, temps de jeu, pénalités avec perte de tentative, règlement de flag football, reconnaissance vocale et vidéo, applications natives, collaboration simultanée.

## Points ouverts et risques

| Sujet | Action |
| :--- | :--- |
| Règlement du pilote | Récupérer le règlement exact et les feuilles de saisie, remplacer le profil de démonstration |
| Matchs de référence | Écrire 3 à 5 matchs complets à partir de vraies feuilles |
| Données de joueurs mineurs, audio, vidéo | Vérifier les exigences légales (dont l'effacement des données) avant toute collecte |
| ORM, structure de `apps/api` | Trancher au démarrage du backend |
| Marché et utilisateur payeur | Valider avec le pilote avant d'investir dans les fonctions avancées |

## Prochaines étapes

1. Obtenir règlement et feuilles du pilote.
2. Étendre `packages/domain` avec les cas du règlement (chacun avec son match de référence).
3. Concevoir `apps/api` : schéma Postgres et endpoint de synchronisation idempotent.
4. Construire `apps/web` : saisie tactile, outbox IndexedDB, calcul local.
