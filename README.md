# Gestion Cave / Maquis

Application de gestion de stock, ventes, marges, bénéfices et charges pour points de vente de boissons (caves/maquis). Digitalise la logique du registre papier avec calculs automatiques.

## Stack

- **Backend** : Java 17 + Spring Boot 3.3 (Web, Data JPA, Security/JWT, Validation), PostgreSQL, Flyway, OpenAPI/Swagger
- **Frontend** : Next.js 14 (App Router, TypeScript), Tailwind CSS, composants style shadcn/ui

## Prérequis

- JDK 17, Maven 3.9+
- Node.js 20+, npm
- PostgreSQL 15+ en écoute sur `localhost:5432`

## Base de données

Créer la base et l'utilisateur dédiés (une seule fois) :

```bash
psql -U postgres -c "CREATE USER gestioncave WITH PASSWORD 'gestioncave';" -c "CREATE DATABASE gestioncave OWNER gestioncave;"
```

Les variables surchargeables : `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ORIGINS`.

## Lancer le backend

```bash
cd backend
mvn spring-boot:run
```

- API : http://localhost:8080
- Swagger : http://localhost:8080/swagger-ui.html

Au premier démarrage, des comptes de démonstration sont créés :

| Rôle | Email | Mot de passe |
|---|---|---|
| Propriétaire | proprietaire@gestioncave.local | Proprio@2026 |
| Gérant | gerant@gestioncave.local | Gerant@2026 |

## Lancer le frontend

```bash
cd frontend
npm run dev
```

Application : http://localhost:3000

## Tests backend

```bash
cd backend
mvn test
```

## Avancement des modules

- [x] **Module 1 — Authentification & utilisateurs** (JWT, rôles PROPRIETAIRE/GERANT)
- [x] **Module 2 — Multi-établissements** (CRUD sécurisé, sélecteur + vue consolidée)
- [x] **Module 3 — Catalogue produits (boissons)** (partage multi-maquis, coûts réservés au propriétaire, `CalculService` testé)
- [x] **Module 4 — Registre journalier (stock)** (saisie colonnes registre papier, calculs auto, report veille, « Arrêter le point », alertes)
- [x] **Module 5 — Achats / commandes fournisseurs** (casiers → bouteilles ajoutées au stock du jour, historique, coûts réservés au propriétaire)
- [x] **Module 6 — Prix de revient, marges, bénéfices** (analyse par période/maquis/consolidé, valorisation du stock, PROPRIETAIRE uniquement)
- [x] **Module 7 — Charges & rentabilité nette** (CRUD charges par catégorie, bénéfice net, seuil de rentabilité mensuel, PROPRIETAIRE uniquement)
- [x] **Module 8 — Tableau de bord & rapports** (synthèse ventes/stock/bénéfices, meilleures ventes, historique filtrable, export PDF & Excel)
- [x] **Module 9 — Sauvegarde & fiabilité** (snapshot JSON, sauvegarde auto planifiée, export/import, restauration — PROPRIETAIRE)
