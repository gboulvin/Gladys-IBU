# Biathlon IBU

Suivez le biathlon dans Gladys avec les données officielles de l'Union
internationale de biathlon (datacenter IBU, les données de
biathlonresults.com) : dates et heures des prochaines courses, classements de
Coupe du monde / IBU Cup, résultats des courses et statistiques de tir de vos
athlètes préférés.

C'est une intégration **cloud** : les données viennent d'Internet, rien ne
tourne sur votre réseau local.

## 1. Obtenir une clé d'API IBU

Le datacenter IBU ne répond qu'aux requêtes portant une clé d'API (en-tête
`apikey`). Deux façons d'en obtenir une :

- **Une clé personnelle** — demandez à l'IBU un accès à l'API de son
  datacenter (voir [biathlonworld.com](https://www.biathlonworld.com/contact)).
  C'est la solution la plus propre.
- **La clé du site public** — biathlonresults.com envoie une clé avec chaque
  requête de votre navigateur. Pour la lire :
  1. ouvrez <https://www.biathlonresults.com> dans un navigateur d'ordinateur
     (Chrome, Firefox, Edge) ;
  2. appuyez sur **F12** pour ouvrir les outils de développement, puis
     l'onglet **Réseau** ;
  3. rechargez la page (**F5**) ;
  4. tapez `sportapi` dans le champ de filtre et cliquez sur l'une des
     requêtes (`Events`, `Competitions`…) ;
  5. dans **En-têtes → En-têtes de requête**, copiez la valeur de `apikey`.

  Cette clé appartient au site de l'IBU et peut changer à tout moment : si
  l'intégration indique « L'API IBU a refusé la clé (401) », relisez-la.
  Utilisez-la raisonnablement, pour un usage personnel.

La clé est stockée par Gladys comme un secret, envoyée uniquement à
biathlonresults.com et jamais écrite dans les logs.

## 2. Configurer l'intégration

1. Ouvrez l'onglet **Configuration** de l'intégration.
2. Collez la **clé d'API IBU**, puis cliquez sur **Tester la connexion IBU**.
3. **Athlètes suivis** : cliquez sur **Trouver un athlète**, tapez un nom
   (ex. `Jeanmonnot`, `Perrot`, `Simon`) et copiez l'IBU ID affiché (ex.
   `BTFRA21503199701`) dans le champ. Séparez plusieurs ID par des virgules
   (20 au maximum).
4. Choisissez le **niveau de compétition** (Coupe du monde par défaut), la
   **langue** des textes des appareils, votre **fuseau horaire**
   (`Europe/Paris` par défaut), l'**intervalle de rafraîchissement**
   (15 minutes par défaut, 5 minimum) et le délai de **rappel avant course**
   (30 minutes par défaut).
5. Enregistrez : les appareils apparaissent dans l'onglet **Découverte**,
   prêts à être ajoutés.

## Appareils

- **Calendrier biathlon** — prochaine course (nom, lieu, date et heure),
  minutes avant la prochaine course, dernier vainqueur.
- **Classement biathlon — Hommes / Femmes** — leader du général et ses points.
- **Biathlète _nom_** (un par athlète suivi) — rang et points au général,
  réussite au tir de la saison (totale, couché, debout, en %), rang et
  résultat de la dernière course.

La réussite au tir est calculée sur les courses individuelles de la saison en
cours (sprint, poursuite, individuel, mass start), 5 cibles par tir. Les
relais sont exclus : leurs balles de pioche ne sont pas comparables.

## Widgets du tableau de bord

- **Prochaines courses de biathlon** — les prochaines courses avec date et
  heure, un badge peu avant le départ et un badge **EN DIRECT** pendant la
  course. Réglages : catégorie, nombre de courses.
- **Classement biathlon** — général, sprint, poursuite, individuel, mass start
  ou coupe des nations, hommes ou femmes, podium, top 5 ou top 10, athlètes
  suivis en vert.
- **Biathlète** — un athlète suivi, choisi en tapant une partie de son nom ou
  son IBU ID (vide : le premier athlète suivi) : rang, points, jauge de tir,
  réussite couché et debout, dernière course.
- **Derniers résultats de biathlon** — podium de la dernière course et places
  de vos athlètes suivis.

Les widgets suivent la langue de chaque utilisateur de Gladys.

## Scènes

Déclencheurs (éditeur de scènes, catégorie **Intégrations**) :

- **Course de biathlon bientôt au départ** — une course part dans le délai de
  rappel. Filtres : catégorie, discipline. Variables :
  `{{triggerEvent.data.race}}`, `location`, `start_time_local`, `minutes`…
- **Résultats d'une course de biathlon** — les résultats d'une course sont
  disponibles. Variables : `winner`, `winner_nation`, `second`, `third`,
  `race`, `location`…
- **Résultat d'un athlète suivi** — un athlète suivi a terminé une course.
  Filtres : athlète, classement (victoire, 2e/3e, top 10, 11e–40e, au-delà).
  Variables : `athlete_name`, `rank`, `shootings` (ex. `0+1+0+0`), `misses`,
  `behind`, `race`.
- **Nouveau leader du général** — le dossard jaune a changé d'épaules.
  Variables : `leader`, `leader_nation`, `points`, `previous_leader`.

Actions :

- **Obtenir la prochaine course de biathlon** — sorties `found`, `race`,
  `location`, `start_time_local`, `minutes_until`.
- **Obtenir les statistiques d'un athlète** — sorties `rank`, `points`,
  `shooting_accuracy`, `prone_accuracy`, `standing_accuracy`, `last_rank`…
- **Obtenir le leader d'un classement** — sorties `leader`, `nation`,
  `points`, `second`, `gap`.
- **Actualiser les données biathlon** — lit les données IBU immédiatement.

Exemple : _« Course bientôt au départ » → envoyer le message
« {{triggerEvent.data.race}} à {{triggerEvent.data.location}} part à
{{triggerEvent.data.start_time_local}} » et allumer la télé._

Les textes des variables de scène utilisent la langue choisie dans la
configuration. Une détection ne se déclenche qu'une fois : l'intégration se
souvient de ce qu'elle a déjà annoncé, même après un redémarrage. Juste après
l'installation, le premier rafraîchissement apprend le passé sans rien
déclencher.

## Dépannage

- **« Saisissez votre clé d'API IBU »** — le champ de la clé est vide.
- **« L'API IBU a refusé la clé (401) »** — la clé est fausse ou a expiré :
  récupérez-en une nouvelle (voir l'étape 1).
- **Aucune course** — entre deux saisons, le calendrier peut être vide ;
  vérifiez le niveau de compétition.
- Consultez les logs de l'intégration depuis l'interface de Gladys
  (`LOG_LEVEL=debug` pour le détail complet).

Les données appartiennent à l'IBU. Cette intégration n'est pas affiliée à
l'IBU.
