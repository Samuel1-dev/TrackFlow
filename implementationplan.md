# Plan d'Implémentation - Frontend Angular (Inspiration UI Finora)

Création et intégration du frontend web **TaskFlow** en Angular 21, reprenant fidèlement la maquette moderne fournie (inspiration *Finora*), avec navigation modulaire à gauche, panneau de détails d'une tâche à droite, gestion du thème sombre/clair/système et adaptation mobile complète.

---

## 1. Analyse du Design de Référence & Exigences Utilisateur



### Éléments Clés du Design
1. **Panneau Gauche (Sidebar de Navigation)** :
   - Logo de marque TaskFlow avec icône moderne.
   - Menu des modules : **Tableau de bord**, **Projets**, **Tâches**, **Budgets**, **Dépenses**, **Suivi du temps**, **Statistiques**.
   - Raccourcis rapides (*Quick Links*) : `+ Nouvelle tâche`, `+ Nouveau budget`, `+ Nouvelle dépense`.
   - Carte de résumé de productivité en bas de barre latérale.
2. **En-tête Supérieur (Top Header)** :
   - Barre de recherche globale (`Rechercher... ⌘K`).
   - **Bouton de bascule de thème** : Clair / Sombre / Système (par défaut : préférence système `prefers-color-scheme`).
   - Cloche de notification (tâches en retard, alertes de budget).
   - Profil utilisateur connecté avec avatar, nom, devise (XOF) et menu déroulant (déconnexion).
3. **Zone Centrale (Contenu Principal)** :
   - Bannière d'accueil personnalisée (*"Bonjour, [Prénom] 👋"*).
   - 4 Cartes d'indicateurs clés (KPI) au style épuré :
     - *Tâches du jour* (avec indicateur de retard).
     - *Tâches en cours*.
     - *Budget disponible / restant* (en FCFA).
     - *Épargne & Objectif* (pourcentage et écart).
   - Graphique d'évolution des dépenses / temps passé.
   - Graphique circulaire (Donut) de répartition des dépenses par catégorie.
   - Liste des tâches récentes et des dernières dépenses.
4. **Panneau Droit (Détails de la Tâche Sélectionnée)** :
   - Lorsqu'une tâche est cliquée : affichage immédiat de ses détails complets dans le panneau droit :
     - Titre, description, projet associé.
     - Sélecteur de statut (`TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`) et de priorité.
     - **Sous-tâches** avec cases à cocher et barre de progression.
     - **Dépendances bloquantes** avec alerte visuelle si des prérequis ne sont pas terminés.
     - **Enregistreur de temps** (*Time Tracker*) avec calcul de la variance temps passé vs estimé.
     - Boutons d'édition rapide, suppression et fermeture.
   - Lorsqu'aucune tâche n'est sélectionnée : affichage de la carte de budget actif (style carte bancaire violette/dégradée comme sur la maquette) et des objectifs d'épargne.
5. **Mode Sombre & Système** :
   - Détection automatique du thème OS (`prefers-color-scheme: dark`).
   - Bascule manuelle instantanée avec mémorisation dans le `localStorage`.
   - Palette claire douce (surfaces blanches, fond pastel violet très clair `#F8FAFC`, ombres douces) et palette sombre soignée (surfaces ardoise foncé `#1E293B`, fond nuit `#0F172A`, contrastes élevés).
6. **Adaptation Mobile Responsive** :
   - Sidebar transformée en tiroir coulissant (*drawer*) avec bouton hamburger et barre de navigation tactile.
   - Panneau droit de détails de tâche s'ouvrant sous forme de panneau coulissant (*slide-over sheet*) plein écran ou demi-écran sur mobile.
   - Grilles de cartes adaptatives (`grid-cols-1` sur mobile, `grid-cols-2` sur tablette, `grid-cols-4` sur desktop).

---

## 2. Architecture Technique Frontend (Angular 21)

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                    # Services singleton, guards, interceptors
│   │   │   ├── auth/                # AuthService, AuthGuard, TokenInterceptor
│   │   │   ├── theme/               # ThemeService (light / dark / system)
│   │   │   ├── api/                 # ApiService générique avec base URL
│   │   │   └── models/              # Interfaces TypeScript partagées
│   │   ├── shared/                  # Composants et pipes réutilisables
│   │   │   ├── components/          # Boutons, badges de statut, cartes KPI, modales
│   │   │   └── pipes/               # Formatage FCFA/devise, dates relatives
│   │   ├── layout/                  # Structure d'affichage globale
│   │   │   ├── sidebar/             # Panneau de gauche avec navigation & raccourcis
│   │   │   ├── header/              # En-tête avec recherche, sélecteur de thème & profil
│   │   │   ├── task-detail-panel/   # Panneau de droite (Détails tâche / Résumé budget)
│   │   │   └── main-layout.component.ts
│   │   ├── features/                # Modules applicatifs
│   │   │   ├── auth/                # Pages Inscription / Connexion
│   │   │   ├── dashboard/           # Tableau de bord unifié (vue Finora)
│   │   │   ├── projects/            # Gestion des projets & avancement
│   │   │   ├── tasks/               # Gestion des tâches, filtres, sous-tâches & dépendances
│   │   │   └── finance/             # Budgets, dépenses, répartition & alertes
│   │   ├── app.routes.ts            # Routage déclaratif
│   │   └── app.config.ts            # Configuration des providers (HTTP, Router, etc.)
│   ├── styles.css                   # Tailwind CSS + variables CSS thématiques
│   └── index.html
```

---

## 3. Étapes d'Implémentation

### Étape 1 : Initialisation & Outillage
- Scaffold de l'application Angular 21 dans `frontend/` avec standalone components et routing.
- Configuration de **Tailwind CSS** avec prise en charge du dark mode basé sur la classe `dark`.
- Intégration de la police moderne (Inter / Plus Jakarta Sans) et des icônes SVG légères (Lucide Icons).

### Étape 2 : Core, Auth & Thème
- `ThemeService` : gestion des modes `light`, `dark`, `system` avec écouteur d'événement `matchMedia('(prefers-color-scheme: dark)')` et persistance `localStorage`.
- `AuthService` & `AuthInterceptor` : authentification JWT avec injection du token Bearer et gestion transparente du rafraîchissement.
- Pages d'authentification soignées (Connexion & Inscription) dans le même style esthétique.

### Étape 3 : Layout Principal (3 Panneaux)
- `SidebarComponent` (panneau gauche) : liens de navigation actifs, badges de compteurs, boutons de création rapide.
- `HeaderComponent` : recherche, sélecteur de thème, cloche de notifications, profil utilisateur.
- `TaskDetailPanelComponent` (panneau droit) : service partagé `TaskSelectionService` pour ouvrir/fermer et afficher les détails d'une tâche sélectionnée en temps réel, avec repli sur la carte financière si aucune tâche n'est active.
- `MainLayoutComponent` : conteneur responsive gérant le tiroir mobile et la superposition des panneaux.

### Étape 4 : Écrans Métier & Intégration API
- **Tableau de Bord Unifié** : affichage fidèle à la maquette *Finora* (bannière, cartes KPI, donut des dépenses, activité hebdomadaire, tâches urgentes).
- **Gestion des Tâches** : vue en liste/tableau avec filtres (urgentes, en retard, bloquées, par projet), case à cocher rapide, gestion des dépendances bloquantes.
- **Gestion des Projets** : cartes projets avec barre d'avancement pondérée par durée estimée.
- **Module Finance** : création et suivi du budget actif, calculs financiers automatiques, ajout et historique des dépenses par catégorie.

### Étape 5 : Tests, Optimisation Mobile & Déploiement
- Vérification du responsive sur différentes résolutions (Mobile 375px/390px, Tablette 768px, Desktop 1280px+).
- Test du comportement du thème clair/sombre/système.
- Build de production optimisé `ng build`.
- Commit Git et préparation pour la suite (application Flutter).

---

## 4. Questions Ouvertes & Choix de Conception

> [!NOTE]
> 1. **Style du panneau droit sur mobile** : Sur petit écran, le panneau de détails d'une tâche glissera du bas vers le haut (*bottom sheet*) ou depuis la droite (*slide-over drawer*).
> 2. **Devise par défaut** : Comme convenu lors des étapes précédentes, l'affichage utilisera **FCFA (XOF)** par défaut, configurable dans le profil.
