# Lama Worlds OBS Addon Manager

Gestionnaire d'addons OBS Studio rapide, local et convivial.

## 🚀 Installation et Lancement

### Prérequis
- Node.js 18+ installé
- OBS Studio installé (optionnel pour le développement)

### Installation des dépendances
```bash
npm install
```

### Lancement en mode développement
```bash
npm run dev
```

Cette commande va :
1. Démarrer le serveur Vite (React)
2. Compiler le code TypeScript Electron
3. Lancer l'application Electron

### Build de production
```bash
npm run build
```

Cette commande va :
1. Compiler le code TypeScript
2. Builder l'application React
3. Compiler Electron
4. Créer un exécutable avec electron-builder

## 📋 Fonctionnalités

- ✅ Détection automatique d'OBS Studio (Registry Windows + chemins par défaut)
- ✅ Sélection manuelle du dossier OBS
- ✅ Scan des plugins système et utilisateur
- ✅ Détection de version (manifest.json, plugin.json, version.txt, README)
- ✅ Installation de plugins depuis GitHub Releases
- ✅ Mise à jour vers la dernière version
- ✅ Downgrade vers une version spécifique
- ✅ Suppression sécurisée de plugins
- ✅ Détection si OBS est en cours d'exécution (bloque les opérations)
- ✅ Sauvegardes automatiques avant toute modification
- ✅ Interface moderne avec glassmorphism et accents néon

## 🎨 Interface

L'interface utilise un style "Lama Worlds" avec :
- Fond sombre (navy/black)
- Panneaux glassmorphism
- Accents bleu/cyan néon
- Effets de lueur douce

## 📦 Plugins Supportés

Le catalogue inclut 10 plugins populaires pré-configurés :
- OBS WebSocket
- Shader Filter
- Source Record
- Move Transition
- Gradient Source
- Scene Collection Manager
- Advanced Scene Switcher
- Text PThread
- Source Switcher
- Dynamic Delay

## 🔧 Structure du Projet

```
├── electron/           # Processus principal Electron
│   ├── main.ts        # Point d'entrée Electron
│   ├── preload.ts    # Bridge IPC sécurisé
│   └── managers/     # Modules de gestion
│       ├── ObsDetector.ts
│       ├── ObsRunningDetector.ts
│       ├── PluginManager.ts
│       ├── PluginInstaller.ts
│       ├── BackupManager.ts
│       └── PluginCatalog.ts
├── src/               # Application React
│   ├── App.tsx
│   ├── components/
│   │   ├── PathSelector.tsx
│   │   └── PluginList.tsx
│   └── index.css
└── package.json
```

## 🛡️ Sécurité

- Context isolation activé
- Pas de nodeIntegration dans le renderer
- Validation de tous les chemins de fichiers
- Vérification que OBS n'est pas en cours d'exécution avant modifications

## 📝 Notes

- Les sauvegardes sont stockées dans `%USERPROFILE%\LamaWorlds_OBS_Backups`
- L'application fonctionne uniquement en local (pas de backend cloud)
- Support Windows en priorité, architecture prête pour cross-platform

