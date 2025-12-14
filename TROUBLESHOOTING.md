# 🔧 Guide de Dépannage

## Problème : L'application Electron ne s'affiche pas

### Solution 1 : Vérifier que Vite est démarré
Assurez-vous que le serveur Vite fonctionne sur `http://localhost:5173`. Vous pouvez le vérifier en ouvrant cette URL dans votre navigateur.

### Solution 2 : Lancer Electron manuellement
Si `npm run dev` ne fonctionne pas, essayez de lancer les commandes séparément :

```bash
# Terminal 1 : Démarrer Vite
npm run vite
# ou
npx vite

# Terminal 2 : Compiler et lancer Electron
npm run dev:electron
```

### Solution 3 : Vérifier les logs
Regardez la console du terminal où vous avez lancé `npm run dev`. Vous devriez voir des messages comme :
- "App ready, initializing..."
- "Store initialized"
- "Creating window..."
- "Loading development URL: http://localhost:5173"

Si vous voyez des erreurs, notez-les.

### Solution 4 : Vérifier que les fichiers sont compilés
Assurez-vous que le dossier `dist-electron` contient :
- `main.js`
- `preload.js`
- `managers/` (avec tous les fichiers .js)

Si ces fichiers n'existent pas, exécutez :
```bash
npm run compile:electron
```

### Solution 5 : Vérifier le chemin preload
Si vous voyez une erreur concernant `preload.js`, vérifiez que le fichier existe dans `dist-electron/preload.js`.

### Solution 6 : Désactiver DevTools automatique
Si l'ouverture automatique des DevTools cause un problème, modifiez `electron/main.ts` et commentez la ligne :
```typescript
// win.webContents.openDevTools();
```

### Solution 7 : Vérifier les ports
Assurez-vous que le port 5173 n'est pas utilisé par une autre application. Vous pouvez changer le port dans `vite.config.ts` si nécessaire.

### Solution 8 : Réinstaller les dépendances
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### Solution 9 : Vérifier la version de Node.js
L'application nécessite Node.js 18+. Vérifiez avec :
```bash
node --version
```

### Solution 10 : Lancer avec des logs détaillés
```bash
DEBUG=* npm run dev
```

Ou sur Windows PowerShell :
```powershell
$env:DEBUG="*"; npm run dev
```

## Problèmes courants

### "Cannot find module"
- Vérifiez que `npm install` a été exécuté
- Vérifiez que les fichiers dans `dist-electron` existent

### "Port 5173 already in use"
- Fermez l'autre application qui utilise le port
- Ou changez le port dans `vite.config.ts`

### La fenêtre s'ouvre mais est blanche
- Vérifiez que Vite fonctionne sur http://localhost:5173
- Ouvrez les DevTools (F12) pour voir les erreurs
- Vérifiez la console du terminal pour les erreurs

### Electron se ferme immédiatement
- Vérifiez les logs dans le terminal
- Il peut y avoir une erreur dans l'initialisation
- Vérifiez que tous les managers peuvent être instanciés

## Obtenir de l'aide

Si le problème persiste :
1. Notez tous les messages d'erreur
2. Vérifiez la version de Node.js et npm
3. Vérifiez que tous les fichiers sont présents
4. Essayez de lancer les commandes une par une pour isoler le problème

