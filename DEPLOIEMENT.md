# Déploiement en ligne (Render) + connexion de l'app mobile

Objectif : rendre le backend accessible depuis Internet en **HTTPS**, pour que le gérant puisse travailler depuis son téléphone (4G ou n'importe quel Wi-Fi), en toute sécurité.

Architecture finale :

```
Téléphone (4G/Wi-Fi) ──HTTPS──> Backend Render ──> PostgreSQL Render
```

---

## Étape 1 — Mettre le projet sur GitHub

Render déploie à partir d'un dépôt GitHub. Le projet n'est pas encore un dépôt git.

```bash
cd C:\Users\asimplice\Documents\GestionCave
git init
git add .
git commit -m "Projet Gestion Cave (backend + web + mobile) prêt pour déploiement"
```

Puis crée un dépôt **privé** sur https://github.com/new (ex. `gestioncave`), et pousse :

```bash
git remote add origin https://github.com/TON_COMPTE/gestioncave.git
git branch -M main
git push -u origin main
```

> Garde le dépôt **privé** : il contient toute ta logique métier.

---

## Étape 2 — Créer le backend + la base sur Render

1. Crée un compte sur https://render.com (connexion avec GitHub recommandée).
2. Dans le dashboard : **New ➜ Blueprint**.
3. Sélectionne ton dépôt `gestioncave`. Render détecte automatiquement le fichier **`render.yaml`** à la racine et propose de créer :
   - `gestioncave-db` (PostgreSQL, plan gratuit)
   - `gestioncave-api` (service web Docker, plan gratuit)
4. Render demande la valeur du secret **`JWT_SECRET`** (marqué « sync: false »). Génère une
   clé aléatoire Base64 (≥ 32 octets) et colle-la dans le dashboard — par exemple :

   ```bash
   openssl rand -base64 48
   ```

   > ⚠️ Ne mets jamais cette clé dans le dépôt (il est public). Si tu la changes plus tard,
   > tous les utilisateurs devront se reconnecter.
5. Clique **Apply**. Render construit l'image Docker (quelques minutes la première fois), applique les migrations Flyway, et démarre l'API.
6. Une fois « Live », note l'URL publique du service, de la forme :

   ```
   https://gestioncave-api.onrender.com
   ```

### Vérifier que ça tourne

Ouvre dans un navigateur :
```
https://gestioncave-api.onrender.com/swagger-ui.html
```
Tu dois voir la documentation Swagger de l'API.

---

## Étape 3 — Première connexion

Sur une base vierge, l'application crée automatiquement deux comptes de départ :

| Rôle | Identifiant (email ou téléphone) | Mot de passe |
|---|---|---|
| **Propriétaire** | `proprietaire@gestioncave.local` ou `0700000001` | `Proprio@2026` |
| **Gérant** | `gerant@gestioncave.local` ou `0700000002` | `Gerant@2026` |

> ⚠️ **Change ces mots de passe dès la première connexion** (écran Utilisateurs, côté propriétaire), et crée le vrai compte du gérant qui utilisera le téléphone.

---

## Étape 4 — Pointer l'app mobile vers le serveur en ligne

Dans `mobile/.env`, remplace l'adresse locale par l'URL HTTPS de Render :

```
EXPO_PUBLIC_API_URL=https://gestioncave-api.onrender.com
```

Comme on passe en HTTPS, le trafic « clair » n'est plus nécessaire : dans `mobile/app.json`,
mets `android.usesCleartextTraffic` à `false` (plus sécurisé).

Puis relance l'app : `cd mobile && npm start`.

---

## Étape 5 — Générer l'APK à installer sur le téléphone

```bash
npm install -g eas-cli
eas login
cd mobile
eas build --platform android --profile preview
```

Render fournit un lien de téléchargement de l'APK. Installe-le sur le téléphone du gérant — il n'a plus besoin d'Expo Go ni d'ordinateur.

---

## ⚠️ Limites du plan gratuit Render (à connaître)

- **Mise en veille** : après 15 min sans requête, le service s'endort. La **première** requête suivante prend ~30–60 s (le temps du réveil), puis c'est de nouveau rapide. Gênant mais utilisable pour tester.
- **Base gratuite** : expire après **90 jours**. Pense à exporter régulièrement (écran Sauvegardes) ou à passer en payant avant.

### Pour un usage quotidien fiable
Passe les deux services en payant (~7 $/mois chacun) : plus de mise en veille, base pérenne.
Rien d'autre à changer — mêmes URL, même configuration.

---

## Dépannage

- **L'app affiche « Impossible de joindre le serveur »** : vérifie que l'URL dans `.env` est bien en `https://…onrender.com` sans slash final, et que le service Render est « Live » (réveille-le en ouvrant l'URL Swagger dans un navigateur).
- **Build Render échoue** : regarde les logs de build. Le plus souvent c'est la mémoire du plan gratuit pendant le build Maven ; relance le déploiement.
- **Erreur de connexion à la base** : vérifie dans le dashboard que les variables `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` sont bien liées à `gestioncave-db`.
