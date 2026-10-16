# TaskFlow

TaskFlow est une application web moderne de productivité personnelle combinant :
1. **La gestion intelligente des tâches et des projets** (statuts, priorités, sous-tâches, dépendances bloquantes, estimation et suivi du temps).
2. **Le suivi du budget personnel et de l'épargne déclarée** (budgets hebdomadaires/mensuels, dépenses catégorisées, comparaison prévisionnel vs réel).
3. **Un tableau de bord unifié** consolidant les indicateurs clés des deux modules.

---

## Architecture

- **Backend** : NestJS (v11) avec TypeScript strict, Swagger OpenAPI sur `/api/docs` et préfixe `/api/v1`.
- **Base de données & ORM** : PostgreSQL avec Prisma ORM et migrations déclaratives.
- **Sécurité** : JWT (Access Token) + Cookie HTTP-Only sécurisé (Refresh Token), hachage bcrypt, Helmet, Throttler et isolation stricte par utilisateur.
- **Frontend** : Angular (Standalone components, Signals, Tailwind CSS).

---

## Installation et Démarrage Local

### Prérequis
- Node.js (v20+)
- PostgreSQL (v15+)
- Git

### 1. Configuration de la Base de Données
Créer l'utilisateur et la base de données PostgreSQL :
```sql
CREATE USER taskflow_user WITH PASSWORD 'taskflow_pass' SUPERUSER;
CREATE DATABASE taskflow OWNER taskflow_user;
```

### 2. Démarrage du Backend
```bash
cd backend

# Copier le fichier d'environnement
cp .env.example .env

# Installer les dépendances
npm install

# Appliquer les migrations Prisma
npx prisma migrate dev

# Lancer les tests unitaires
npm test

# Démarrer le serveur en mode développement
npm run start:dev
```

- **API REST** : `http://localhost:3000/api/v1`
- **Documentation Swagger** : `http://localhost:3000/api/docs`
