# 🏗️ Guide de Build

## Problèmes de Build Résolus

### 1. ✅ Métadonnées Manquantes
- Ajout de `description` dans package.json
- Ajout de `author` dans package.json
- Ajout de `productName` pour electron-builder

### 2. ✅ Configuration Electron-Builder
- Configuration complète ajoutée dans `package.json`
- Timeout augmenté à 60 secondes pour les téléchargements
- Cache Electron configuré dans `.electron-cache`
- Support pour installer NSIS et portable

## Configuration Build

### Options Disponibles

#### Build NSIS (Installeur Windows)
```bash
npm run build
```
Crée un installateur `.exe` dans `release/`

#### Build Portable
Le build crée aussi une version portable (pas d'installation nécessaire)

### Résolution des Problèmes de Téléchargement

Si vous rencontrez des erreurs de timeout lors du téléchargement d'Electron :

#### Option 1 : Utiliser le Cache
```bash
# Le cache est maintenant dans .electron-cache
# Supprimez-le si vous avez des problèmes
rm -rf .electron-cache
npm run build
```

#### Option 2 : Télécharger Electron Manuellement
1. Téléchargez Electron depuis : https://github.com/electron/electron/releases
2. Placez-le dans `.electron-cache/electron-v25.9.8-win32-x64/`
3. Relancez `npm run build`

#### Option 3 : Utiliser des Variables d'Environnement
```bash
# Augmenter le timeout via variable d'environnement (si supporté)
set ELECTRON_GET_USE_PROXY=1
npm run build
```

#### Option 4 : Utiliser un Proxy/Mirror
```bash
# Linux/Mac
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# Windows PowerShell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm run build
```

## Structure de Build

```
release/
├── win-unpacked/          # Application non packagée
├── *.exe                  # Installateur NSIS
└── *.exe                  # Version portable
```

## Variables d'Environnement Utiles

```bash
# Désactiver la signature (pour tests)
export CSC_IDENTITY_AUTO_DISCOVERY=false

# Utiliser un mirror différent
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# Augmenter le timeout
export ELECTRON_BUILDER_CACHE=/path/to/cache
```

## Dépannage

### Erreur : "dial tcp: connectex: A connection attempt failed"
- **Cause** : Problème de connexion réseau ou timeout
- **Solution** : 
  1. Vérifiez votre connexion internet
  2. Augmentez le timeout dans `package.json`
  3. Utilisez un mirror Electron
  4. Téléchargez Electron manuellement

### Erreur : "ERR_ELECTRON_BUILDER_CANNOT_EXECUTE"
- **Cause** : Problème avec app-builder.exe
- **Solution** :
  1. Supprimez `node_modules` et réinstallez : `rm -rf node_modules && npm install`
  2. Vérifiez que vous avez les droits d'administration
  3. Désactivez temporairement l'antivirus

### Build Réussi mais Application ne Lance Pas
- Vérifiez que `dist-electron/main.js` existe
- Vérifiez que `dist/index.html` existe
- Vérifiez les logs dans `release/win-unpacked/`

## Commandes Utiles

```bash
# Build uniquement (sans packager)
npm run compile:electron
npx vite build

# Build complet
npm run build

# Nettoyer et rebuild
rm -rf dist dist-electron release .electron-cache
npm run build
```

---

**Note** : Le premier build peut prendre du temps car Electron doit être téléchargé (~100MB). Les builds suivants seront plus rapides grâce au cache.

