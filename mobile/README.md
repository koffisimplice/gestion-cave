# Gestion Cave — Application mobile

Version mobile native (Android / iOS) de Gestion Cave, construite avec **Expo + React Native** (TypeScript, expo-router). Elle consomme le **même backend Spring Boot** que le frontend web — rien à changer côté serveur.

## Prérequis

- Node.js (installé) et npm
- Le backend Spring Boot démarré et accessible sur le réseau local
- Sur le téléphone : l'application **Expo Go** (Play Store / App Store) pour tester en développement

## Configuration de l'URL du backend

Le téléphone doit joindre le backend par l'**IP de la machine** sur le réseau local, jamais `localhost` (qui désignerait le téléphone lui-même).

Modifiez `.env` à la racine du dossier `mobile/` :

```
EXPO_PUBLIC_API_URL=http://192.168.1.67:8080
```

Remplacez `192.168.1.67` par l'IP de la machine qui héberge le backend (commande `ipconfig` sous Windows → « Adresse IPv4 »). Le téléphone et le PC doivent être sur le **même réseau Wi-Fi**.

> Le backend tourne en HTTP (non HTTPS). Android bloque par défaut le trafic « clair » : c'est déjà autorisé via `usesCleartextTraffic` dans `app.json`.

## Démarrage en développement

```bash
cd mobile
npm install          # déjà fait si le dossier node_modules existe
npm start            # démarre le serveur Expo + QR code
```

Scannez le QR code affiché avec **Expo Go** (Android) ou l'appareil photo (iOS). L'app se charge sur le téléphone et se recharge à chaque modification.

Raccourcis : `npm run android` (émulateur/appareil Android), `npm run ios` (macOS uniquement).

## Générer un APK / une app installable (production)

Via EAS Build (service de build d'Expo, nécessite un compte Expo gratuit) :

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # produit un APK téléchargeable
```

Pour iOS : `eas build --platform ios` (nécessite un compte Apple Developer).

## Structure

```
mobile/
  app/                     # écrans (expo-router, routage par fichiers)
    _layout.tsx            # providers (auth, établissement) + navigation racine
    index.tsx              # redirection selon l'état de session
    login.tsx              # écran de connexion
    (tabs)/                # barre d'onglets du bas
      index.tsx            # tableau de bord
      registre.tsx         # registre du jour (saisie des ventes) — cœur mobile
      achats.tsx           # achats fournisseurs
      boissons.tsx         # catalogue des boissons
      plus.tsx             # menu vers les autres modules + déconnexion
    historique.tsx, marges.tsx, charges.tsx, personnel.tsx,
    fournisseurs.tsx, etablissements.tsx, utilisateurs.tsx, audit.tsx
  src/
    api/client.ts          # client HTTP + gestion du token (AsyncStorage)
    api/endpoints.ts       # toutes les fonctions d'appel au backend
    context/auth.tsx       # session / rôle (PROPRIETAIRE vs GERANT)
    context/etablissement.tsx  # établissement actif / vue consolidée
    components/            # UI réutilisable (cartes, boutons, champs, selects…)
    types/index.ts         # types partagés (identiques au frontend web)
    theme.ts               # couleurs, espacements, formatage FCFA
```

## Rôles

- **PROPRIETAIRE** : accès complet (marges, charges, personnel, fournisseurs, utilisateurs, audit, vue consolidée multi-maquis).
- **GERANT** : saisie du registre et des achats de son maquis ; aucune visibilité financière (prix d'achat, marges, bénéfices masqués par le backend et côté app).

Le contrôle d'accès reste appliqué par le backend ; l'app masque simplement les écrans et champs non autorisés.
