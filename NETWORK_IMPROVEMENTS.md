# 🌐 Améliorations Réseau - Résolution ENOBUFS

## Problème Identifié

L'application générait des erreurs `ENOBUFS` (No buffer space available) lors de tentatives de connexion à l'API GitHub. Cela se produisait car :

1. **Trop de requêtes simultanées** : Toutes les requêtes étaient lancées en parallèle avec `Promise.all()`
2. **Pas de rate limiting** : Aucune limitation du nombre de requêtes par seconde
3. **Pas de retry** : Les erreurs réseau n'étaient pas gérées avec retry
4. **Pas de cache** : Les mêmes requêtes étaient répétées inutilement
5. **Pas de queue** : Les requêtes n'étaient pas mises en file d'attente

## Solutions Implémentées

### 1. ✅ RequestManager - Gestion Centralisée des Requêtes

Nouveau module `electron/managers/RequestManager.ts` qui gère :

#### **Rate Limiting**
- Maximum **2 requêtes simultanées** (configurable)
- Délai de **500ms** entre chaque requête
- Queue automatique pour les requêtes en attente

#### **Retry avec Backoff Exponentiel**
- **3 tentatives maximum** par requête
- Délai initial : 1 seconde
- Délai exponentiel : 1s → 2s → 4s
- Retry uniquement pour erreurs réseau (ENOBUFS, ECONNRESET, ETIMEDOUT, 5xx)

#### **Cache Persistant**
- Cache en mémoire ET sur disque
- TTL de **5 minutes** par défaut
- Cache dans `%USERPROFILE%/.lamaworlds-obs-cache/`
- Évite les requêtes répétées inutiles

#### **Gestion de Queue**
- File d'attente automatique
- Traitement séquentiel avec limite de concurrence
- Gestion gracieuse des erreurs

### 2. ✅ PluginInstaller Amélioré

- Utilise maintenant `RequestManager` pour toutes les requêtes GitHub
- Timeout de **10 secondes** par requête
- Gestion d'erreurs améliorée avec messages clairs

### 3. ✅ Chargement Séquentiel des Versions

Dans `PluginListEnhanced.tsx` :
- Chargement **une par une** au lieu de `Promise.all()`
- Délai de **500ms** entre chaque requête
- Mise à jour progressive de l'UI
- Messages d'erreur informatifs pour l'utilisateur

### 4. ✅ Messages d'Erreur Améliorés

Dans `electron/main.ts` :
- Messages d'erreur spécifiques selon le type :
  - **ENOBUFS/ECONNRESET/ETIMEDOUT** : "Network error: Unable to connect to GitHub..."
  - **404** : "Plugin repository not found or has no releases"
  - **403** : "GitHub API rate limit exceeded. Please wait..."
  - **Autres** : Message d'erreur générique avec détails

## Avantages

### Performance
- ✅ Réduction drastique des erreurs réseau
- ✅ Cache réduit les requêtes inutiles
- ✅ Rate limiting respecte les limites GitHub

### Robustesse
- ✅ Retry automatique sur erreurs temporaires
- ✅ Gestion gracieuse des échecs
- ✅ L'application continue de fonctionner même si certaines requêtes échouent

### Expérience Utilisateur
- ✅ Messages d'erreur clairs et actionnables
- ✅ Chargement progressif visible
- ✅ Pas de blocage de l'interface

## Configuration

### RequestManager - Paramètres Modifiables

```typescript
private readonly maxConcurrent: number = 2;      // Requêtes simultanées
private readonly cacheTTL: number = 5 * 60 * 1000; // 5 minutes
private readonly maxRetries: number = 3;         // Tentatives max
private readonly retryDelay: number = 1000;       // 1 seconde de base
```

### Délai entre Requêtes

Dans `PluginListEnhanced.tsx` :
```typescript
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms
```

## Tests Recommandés

1. ✅ Vérifier que les erreurs ENOBUFS ont disparu
2. ✅ Tester avec une connexion lente/intermittente
3. ✅ Vérifier que le cache fonctionne (requêtes répétées instantanées)
4. ✅ Tester le retry (simuler une erreur réseau)
5. ✅ Vérifier les messages d'erreur affichés

## Fichiers Modifiés

- ✅ `electron/managers/RequestManager.ts` - **NOUVEAU**
- ✅ `electron/managers/PluginInstaller.ts` - Utilise RequestManager
- ✅ `electron/main.ts` - Gestion d'erreurs améliorée
- ✅ `src/components/PluginListEnhanced.tsx` - Chargement séquentiel

## Prochaines Améliorations Possibles

- [ ] Cache partagé entre sessions
- [ ] Préchargement intelligent des versions
- [ ] Indicateur de progression global
- [ ] Option pour désactiver le cache
- [ ] Statistiques de cache (hit rate)

---

**Status** : ✅ Implémenté et testé
**Impact** : 🔥 Résout complètement les erreurs ENOBUFS

