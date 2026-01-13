# LamaWorlds OBS Addon Manager

Application WPF moderne pour gérer les plugins OBS Studio (installation, mise à jour, désinstallation).

## Fonctionnalités

### Fonctionnalités principales
- ✅ **Détection automatique** des plugins OBS installés
- ✅ **Mise à jour** des plugins avec vérification de nouvelles versions
- ✅ **Installation** de nouveaux plugins depuis des dépôts
- ✅ **Désinstallation** de plugins avec confirmation
- ✅ **Recherche** de plugins disponibles
- ✅ **Filtrage** par catégorie
- ✅ **Interface moderne** avec design épuré

### Fonctionnalités suggérées (à implémenter)

#### Gestion avancée
- 📦 **Gestionnaire de dépôts** : Support de plusieurs sources (GitHub, dépôt centralisé, fichiers locaux)
- 🔄 **Mises à jour automatiques** : Vérification périodique en arrière-plan
- 📊 **Statistiques** : Historique des installations, plugins les plus utilisés
- 💾 **Sauvegarde/Restauration** : Export/import de la configuration des plugins
- 🔍 **Recherche avancée** : Filtres multiples (auteur, version, date, popularité)

#### Interface utilisateur
- 🌙 **Mode sombre/clair** : Thème personnalisable
- 🌍 **Multilingue** : Support de plusieurs langues (FR, EN, etc.)
- 📱 **Responsive** : Adaptation à différentes tailles d'écran
- 🎨 **Personnalisation** : Thèmes et couleurs personnalisables
- 📈 **Graphiques** : Visualisation des statistiques d'utilisation

#### Sécurité et fiabilité
- ✅ **Vérification de signature** : Validation de l'intégrité des plugins
- 🔒 **Sandbox** : Installation sécurisée avec isolation
- 📝 **Logs détaillés** : Journalisation des opérations
- ⚠️ **Gestion d'erreurs** : Récupération automatique en cas d'échec
- 🔄 **Rollback** : Retour à une version précédente en cas de problème

#### Intégration
- 🔗 **Intégration GitHub** : Recherche et installation directe depuis GitHub
- 📦 **Support ZIP/TAR** : Extraction automatique de différents formats
- 🔌 **API REST** : Service web pour partager des configurations
- 📱 **Notifications** : Alertes pour les nouvelles versions disponibles
- 🔔 **Système de notifications Windows** : Notifications système intégrées

#### Organisation
- 📁 **Groupes de plugins** : Organiser les plugins par projet/configuration
- 🏷️ **Tags personnalisés** : Étiqueter les plugins pour une meilleure organisation
- ⭐ **Favoris** : Marquer les plugins préférés
- 📋 **Listes de souhaits** : Sauvegarder des plugins pour plus tard
- 🔄 **Profils** : Différentes configurations pour différents projets

#### Performance
- ⚡ **Mise en cache** : Cache des métadonnées pour chargement rapide
- 🔄 **Mise à jour incrémentale** : Téléchargement uniquement des fichiers modifiés
- 📊 **Analyse de dépendances** : Détection et gestion des dépendances entre plugins
- 🚀 **Installation parallèle** : Installation de plusieurs plugins simultanément

## Installation

1. Cloner le dépôt
2. Ouvrir le projet dans Visual Studio 2022
3. Restaurer les packages NuGet
4. Compiler et exécuter

## Prérequis

- .NET 8.0 ou supérieur
- Visual Studio 2022
- OBS Studio installé (pour détecter les plugins existants)

## Structure du projet

```
LamaWorlds_OBS_AddonManager/
├── Models/
│   └── PluginInfo.cs          # Modèle de données pour les plugins
├── Services/
│   └── OBSPluginService.cs    # Service de gestion des plugins
├── MainWindow.xaml             # Interface principale
├── MainWindow.xaml.cs          # Logique de l'interface
├── App.xaml                    # Configuration de l'application
├── Styles.xaml                 # Styles et thèmes
└── assets/                     # Ressources (logos, images)
```

## Utilisation

1. **Détection automatique** : L'application détecte automatiquement les plugins installés au démarrage
2. **Recherche** : Utilisez la barre de recherche pour trouver des plugins
3. **Installation** : Cliquez sur "Installer" pour télécharger et installer un plugin
4. **Mise à jour** : Les plugins avec mises à jour disponibles affichent un bouton "Mettre à jour"
5. **Désinstallation** : Cliquez sur "Désinstaller" pour supprimer un plugin

## Développement futur

### Priorité haute
- [ ] Intégration avec l'API GitHub pour les releases
- [ ] Dépôt centralisé de plugins OBS
- [ ] Gestion des dépendances entre plugins
- [ ] Système de notifications

### Priorité moyenne
- [ ] Mode sombre
- [ ] Support multilingue
- [ ] Statistiques et historique
- [ ] Export/import de configuration

### Priorité basse
- [ ] API REST pour partage
- [ ] Graphiques et visualisations
- [ ] Système de profils

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

[À définir]
