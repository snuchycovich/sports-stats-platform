# Plateforme de statistiques sportives — Vision, marché et stratégie

Date : 3 novembre 2026 · Version : 0.1 · Nom commercial non arrêté.

Document associé : [architecture et modèles métier](sports_stats_architecture_modeles.md).

## 1. Description du projet

Créer une application de collecte, de validation et de diffusion des statistiques sportives, pendant et après les matchs. Le périmètre initial comprend le **football américain avec contact et le flag football**. Une extension à d’autres sports est envisagée, sans chercher à tous les prendre en charge dès le lancement.

La promesse : **saisir chaque jeu une seule fois, produire des statistiques fiables et les rendre accessibles sans attendre une ressaisie ultérieure**.

Trois canaux alimenteront progressivement un même modèle : saisie tactile web/mobile, dictée vocale assistée et propositions issues de l’analyse vidéo. Les tableaux de bord servent les statisticiens, entraîneurs, organisateurs et spectateurs, avec des droits distincts.

## 2. Problème et hypothèses

Le porteur du projet rapporte que des statistiques de matchs ONEFA sont recueillies sur papier, puis saisies sur ordinateur dans la semaine. Ce témoignage motive le projet ; **ce document ne confirme pas que ce fonctionnement soit généralisé à toute l’ONEFA**.

Les problèmes à vérifier sur le terrain sont la double saisie, le délai de publication, les erreurs de transcription, la difficulté des corrections et le manque d’accès immédiat aux résultats. Le papier possède aussi des avantages : autonomie, robustesse et habitudes acquises. Le produit doit démontrer qu’il préserve ces avantages pratiques.

| Hypothèse | Comment la vérifier |
| --- | --- |
| La ressaisie représente un coût significatif | Observer la collecte et mesurer le travail après match |
| Les tableaux de bord immédiats ont de la valeur | Interroger séparément coachs, organisateurs et médias |
| Le dispositif doit fonctionner sans réseau | Tester dans les stades des pilotes |
| Des utilisateurs accepteront de payer | Présenter une offre concrète et proposer un pilote payant |
| La voix accélère la saisie | Comparer temps, erreurs et corrections avec la saisie tactile |

## 3. Utilisateurs et acheteurs

| Acteur | Besoin | Rôle commercial possible |
| --- | --- | --- |
| Statisticien / opérateur | Saisie rapide, rattrapage et corrections | Prescripteur et utilisateur quotidien |
| Prestataire de statistiques | Plusieurs matchs et clients, livrables uniformes | Acheteur potentiel prioritaire |
| Club / université | Historique, rapports, suivi des joueurs | Acheteur potentiel |
| Ligue / organisateur | Données comparables, validation et diffusion | Acheteur potentiel, décision plus collective |
| Coach | Analyse des performances et accès aux séquences | Prescripteur ; usage à encadrer selon la compétition |
| Média / diffuseur | Score et statistiques actualisés | Partenaire ou acheteur d’options |
| Joueur / public | Consultation simple et partage | Audience ; pas nécessairement payeur |

Le premier pilote devrait viser un club ou une équipe de statisticiens accessible au porteur du projet. Son expérience de coach au Mexique et en France facilite la compréhension du travail réel. L’accès à ces utilisateurs doit être confirmé ; il ne constitue pas une adoption acquise.

## 4. Analyse exploratoire du marché

### Périmètre et limites

Il s’agit d’une **analyse qualitative de solutions publiques**, pas d’une étude exhaustive ni d’un chiffrage du marché. Aucun montant de marché, part de marché ou prix concurrent n’est avancé sans preuve. Les budgets, pratiques locales et volumes de matchs restent à rechercher par entretiens.

### Comparatif

| Solution | Capacités publiquement documentées | Enseignement pour le projet |
| --- | --- | --- |
| PrestoStats | Football et flag, saisie en direct ou depuis une feuille, mode connecté/hors ligne, rapports [S1] | Le direct, le multisport et le hors ligne sont déjà proposés |
| PrestoStats Football 2.0 | Modification des jeux et insertion avant/après sous conditions ; contraintes pour modifier des imports XML [S2] | Tester particulièrement les corrections et l’interopérabilité |
| PrestoStats Flag 2.0 | Réglages du terrain, des tentatives, du score et saisie guidée [S3] | La configuration des variantes est une attente crédible |
| Hudl Assist | Statistiques reliées à la vidéo ; service fondé principalement sur des analystes pour la plupart des sports, IA selon le sport [S4] | L’analyse vidéo est un métier complexe, pas une simple fonction automatique |
| TurboStats | Saisie et diffusion de statistiques football, rapports et liens avec la vidéo [S5] | Les usages coach, statistiques et diffusion se recoupent déjà |
| Papier et tableur | Alternative actuelle rapportée par le porteur de projet | Le coût de changement et les habitudes sont des concurrents réels |

Les descriptions sont limitées aux pages citées. Une fonction non mentionnée n’est pas présumée absente chez un concurrent. Aucun test complet des logiciels ni comparaison tarifaire contractuelle n’a été effectué.

### Opportunité envisagée

L’opportunité n’est pas de revendiquer une invention des statistiques en direct. L’hypothèse est qu’un service ciblé peut mieux convenir à certains clubs et prestataires : interface en espagnol, prise en main courte, livraison adaptée aux compétitions, fonctionnement terrain fiable et accompagnement proche des utilisateurs.

Le Mexique constitue un point d’entrée à valider, pas une garantie de marché disponible. Commencer par un segment précis permettra d’éviter de concurrencer immédiatement toutes les suites sportives.

## 5. Axes d’amélioration à tester

Ces axes sont des **objectifs produit**, et non des lacunes prouvées de tous les concurrents.

| Axe | Proposition | Preuve attendue |
| --- | --- | --- |
| Ergonomie terrain | Gros boutons, numéros accessibles, parcours selon le jeu, raccourcis | Moins de jeux manqués et saisie avant le jeu suivant |
| Corrections | Modifier un jeu, voir les conséquences et relancer les calculs | Totaux cohérents après correction et insertion |
| Hors ligne explicite | État local/synchronisé/conflit et sauvegarde récupérable | Aucun doublon ni perte dans les scénarios testés |
| Localisation | Espagnol prioritaire, puis français et anglais | Termes compris par les opérateurs |
| Voix | Dictée courte, interprétation structurée et confirmation | Gain net même après les corrections |
| Interopérabilité | Import des effectifs, CSV/JSON et rapports attendus | Livrables utilisables sans ressaisie |
| Traçabilité | Auteur, source, historique et statut provisoire/validé | Corrections explicables et contrôle simple |
| Règlements | Profil versionné par compétition | Calculs acceptés par le responsable des statistiques |

## 6. Expérience cible

### Avant le match

Créer ou sélectionner les équipes, importer les effectifs, choisir le règlement et le référentiel statistique, attribuer un opérateur, puis télécharger le match pour l’usage hors ligne. Une vérification de préparation indique ce qui manque.

### Pendant le match

Afficher score, période, possession et situation. L’opérateur choisit course, passe ou autre événement, renseigne uniquement les informations nécessaires et vérifie le résumé. Une fois enregistré localement, le jeu apparaît dans l’historique et les statistiques locales sont actualisées. Sa synchronisation est visible séparément.

Le formulaire doit permettre de marquer une donnée inconnue ou à vérifier plutôt que d’inventer un joueur ou une valeur. Un opérateur peut noter rapidement un événement incomplet et le compléter lors d’un arrêt de jeu.

### Après le match

Vérifier les incohérences, compléter les informations, produire les rapports et valider les statistiques. Une réouverture nécessite un droit spécifique et crée une trace. Les pages publiques indiquent si les statistiques sont provisoires ou validées.

## 7. MVP et trajectoire

Le produit cible les deux disciplines. **Le premier pilote implémente un règlement concret**, choisi avec ses utilisateurs, puis un second pilote vérifie le passage à l’autre discipline.

| Étape | Contenu | Critère de passage |
| --- | --- | --- |
| Découverte | Feuilles, rapports, observation, entretiens | Problème et utilisateur payeur identifiés |
| Tranche fonctionnelle | Préparation, course/passe, historique, calculs et correction sur vidéo enregistrée | Parcours compris et totaux vérifiés |
| Pilote terrain | Tous les événements nécessaires au règlement retenu, mode hors ligne, export et vue publique | Match complet couvert de façon fiable |
| Deuxième discipline | Règles et interface adaptées au contact ou au flag | Même socle, résultats conformes |
| Voix | Enregistrement, transcription et proposition validée | Gain de temps mesuré |
| Vidéo assistée | Liens temporels puis détection ciblée | Qualité et coût acceptables |

Le MVP terrain doit couvrir les cas décisifs du règlement retenu, notamment pénalités, conversions et changements de possession. Un prototype limité aux courses et passes ne doit pas être présenté comme un outil prêt à produire des statistiques officielles.

Hors premier MVP : reconnaissance vidéo complète, applications natives séparées, recrutement, CRM de clubs, gestion de tous les sports et collaboration simultanée complexe.

## 8. Modèle économique à tester

- Abonnement par organisation et saison, adapté à la saisonnalité.
- Forfait par tournoi pour les organisateurs occasionnels.
- Offre prestataire avec plusieurs clients et matchs.
- Options : voix, stockage vidéo, intégrations de diffusion ou personnalisation.

L’accès public aux résultats peut rester gratuit pour favoriser la consultation. Aucun tarif n’est fixé à ce stade. La valeur facturable doit être confrontée au budget du décideur et aux coûts : hébergement, assistance les jours de match, transcription, stockage et traitement vidéo.

Éviter une offre illimitée audio/vidéo avant de mesurer le coût par match. Prévoir une exportabilité des données pour rassurer les clients.

## 9. Validation et indicateurs

Proposition initiale : rencontrer 5 à 10 utilisateurs de profils différents, observer au moins un match et reproduire un match enregistré. Ces nombres constituent un plan de travail proposé, pas une étude réalisée.

Mesurer : temps de préparation, temps médian et haut de distribution de saisie par jeu, actions manquées, corrections, délai du rapport final, incidents de synchronisation, autonomie de l’opérateur et intention de renouvellement payant.

Objectifs à convenir avant le pilote : rapport acceptable pour le destinataire, absence de perte dans les scénarios hors ligne testés, déduplication des renvois et rapprochement des totaux avec un jeu de référence. Les statistiques de qualité doivent distinguer les erreurs d’observation des erreurs du logiciel.

## 10. Enjeux et risques

| Enjeu | Réponse proposée |
| --- | --- |
| Confiance dans les statistiques | Référentiel explicite, validation humaine et audit |
| Connexion, batterie, stockage du navigateur | Préchargement, indicateurs, tests sur appareils et export de secours |
| Règles variables | Règlement sportif et conventions statistiques versionnés séparément |
| Adoption | Co-conception avec opérateurs et accompagnement au premier match |
| Dépendance à un gros client | Piloter avec un club et un prestataire avant un contrat de ligue |
| Publicité des données | Publication volontaire ; séparation des données internes et publiques |
| Joueurs mineurs, audio et vidéo | Définir les autorisations, accès et durées de conservation avant collecte |
| Charge de développement | Livrer par parcours ; éviter de lancer voix, vidéo et multisport complet ensemble |

Les exigences juridiques précises concernant les données et l’image devront être vérifiées selon les pays de déploiement. Ce document est un cadrage produit, pas un avis juridique.

## 11. Noms possibles

La marque devrait rester multisport. Les noms spécifiques au yard, au snap ou au down peuvent plutôt désigner des modules.

| Nom | Positionnement | État de recherche |
| --- | --- | --- |
| Statelivo | Statistiques en direct | Recherche Web antérieure sans utilisation exacte pertinente trouvée ; non garanti |
| Athloriva | Athlètes et mouvement | Même niveau de vérification exploratoire |
| Sportelyo | Marque sportive générale | Même niveau de vérification exploratoire |
| ProStats | Professionnalisme et statistiques | Générique ; disponibilité non vérifiée |
| ProStatéo | Variante de marque autour de ProStats | Disponibilité non vérifiée ; envisager aussi l’écriture sans accent |
| ProStadio | Pro, statistiques et estadio | Disponibilité non vérifiée |
| ProStatik | Variante plus technique | Disponibilité non vérifiée |
| Yardevio / Downlivo / Gridovio / Snaporya | Football américain et flag | Pistes précédentes, moins adaptées au multisport |

Préférence de travail : **Statelivo** pour une fonction immédiatement compréhensible ; **ProStats** reste une piste appréciée à explorer. Aucun nom n’est choisi ou réservé. Les recherches exploratoires ne prouvent ni la liberté d’usage ni la disponibilité des domaines. Avant adoption : vérifier les usages proches, noms de domaine, réseaux, stores et marques dans les territoires visés.

Signature proposée : **Chaque action compte / Cada acción cuenta / Every play counts**. La formulation anglaise peut être adaptée au sport.

## 12. Décisions à prendre

1. Choisir un utilisateur pilote et son règlement exact.
2. Récupérer ses feuilles de saisie et ses rapports attendus.
3. Choisir le référentiel statistique avec lui.
4. Déterminer le minimum de données publiques et les données privées.
5. Valider une offre commerciale avec un décideur.
6. Tester et réserver une marque avant communication commerciale.

## Sources et portée

Sources consultées le 3 novembre 2026. Les fonctions décrites sont celles documentées publiquement ; offres et interfaces peuvent évoluer.

- [S1 — PrestoStats Overview](https://help.prestosports.com/PrestoStats/v1/prestostats-live-scoring-overview)
- [S2 — Editing stats in PrestoStats 2.0 Football](https://help.prestosports.com/PrestoStats/v1/editing-stats-in-prestostats-2-0-football)
- [S3 — PrestoStats 2.0 Flag Football Instructional Guide](https://help.prestosports.com/PrestoStats/v1/prestostats-flag-football-instructional-guide)
- [S4 — Hudl Assist FAQ](https://www.hudl.com/products/assist/faq)
- [S5 — TurboStats Football](https://www.turbostats.com/football.htm)

Le processus papier ONEFA provient du témoignage du porteur du projet. Les axes de différenciation, l’offre et la stratégie sont des propositions à valider.
