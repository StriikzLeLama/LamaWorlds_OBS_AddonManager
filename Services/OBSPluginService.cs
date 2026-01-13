using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows;
using LamaWorlds_OBS_AddonManager.Models;

namespace LamaWorlds_OBS_AddonManager.Services
{
    public class OBSPluginService
    {
        private readonly HttpClient _httpClient;
        private readonly ConfigurationService _configService;
        private readonly string _cachePath;

        public OBSPluginService(ConfigurationService? configService = null)
        {
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "LamaWorlds-OBS-AddonManager/1.0");
            _configService = configService ?? new ConfigurationService();
            _cachePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LamaWorlds", "OBS_AddonManager", "cache");

            // Créer le dossier de cache si nécessaire
            if (!Directory.Exists(_cachePath))
            {
                Directory.CreateDirectory(_cachePath);
            }
        }

        private string GetOBSPluginsPath()
        {
            if (_configService == null)
            {
                // Chemin par défaut si le service de configuration n'est pas disponible
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "obs-studio", "obs-plugins", "64bit");
            }

            var config = _configService.GetConfiguration();
            if (config == null)
            {
                // Chemin par défaut si la configuration n'est pas disponible
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "obs-studio", "obs-plugins", "64bit");
            }
            
            if (!string.IsNullOrEmpty(config.CustomOBSPath))
            {
                // Si un chemin personnalisé est défini, utiliser celui-ci
                var customPath = Path.Combine(config.CustomOBSPath, "obs-plugins", "64bit");
                if (Directory.Exists(customPath))
                {
                    return customPath;
                }
                // Si le sous-dossier n'existe pas, essayer directement le chemin fourni
                if (Directory.Exists(config.CustomOBSPath))
                {
                    return config.CustomOBSPath;
                }
            }

            // Chemin par défaut
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "obs-studio", "obs-plugins", "64bit");
        }

        private string GetOBSUserPluginsPath()
        {
            if (_configService == null)
            {
                // Chemin par défaut si le service de configuration n'est pas disponible
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "obs-studio", "plugins");
            }

            var config = _configService.GetConfiguration();
            if (config == null)
            {
                // Chemin par défaut si la configuration n'est pas disponible
                return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "obs-studio", "plugins");
            }
            
            if (!string.IsNullOrEmpty(config.CustomOBSUserPluginsPath))
            {
                if (Directory.Exists(config.CustomOBSUserPluginsPath))
                {
                    return config.CustomOBSUserPluginsPath;
                }
            }

            // Chemin par défaut
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "obs-studio", "plugins");
        }

        /// <summary>
        /// Détecte les plugins OBS installés
        /// </summary>
        public async Task<List<PluginInfo>> GetInstalledPluginsAsync()
        {
            var plugins = new List<PluginInfo>();

            try
            {
                // Scanner les plugins système
                var obsPluginsPath = GetOBSPluginsPath();
                if (Directory.Exists(obsPluginsPath))
                {
                    var systemPlugins = ScanPluginsDirectory(obsPluginsPath);
                    plugins.AddRange(systemPlugins);
                }

                // Scanner les plugins utilisateur
                var obsUserPluginsPath = GetOBSUserPluginsPath();
                if (Directory.Exists(obsUserPluginsPath))
                {
                    var userPlugins = ScanPluginsDirectory(obsUserPluginsPath);
                    plugins.AddRange(userPlugins);
                }

                // Vérifier les mises à jour disponibles
                foreach (var plugin in plugins)
                {
                    if (plugin != null)
                    {
                        await CheckForUpdatesAsync(plugin);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur lors de la détection des plugins: {ex.Message}");
                // Ne pas afficher de MessageBox ici car cela peut causer des problèmes au démarrage
                // L'erreur sera gérée par l'appelant
            }

            return plugins ?? new List<PluginInfo>();
        }

        /// <summary>
        /// Scanne un répertoire pour trouver les plugins
        /// </summary>
        private List<PluginInfo> ScanPluginsDirectory(string directory)
        {
            var plugins = new List<PluginInfo>();

            try
            {
                if (string.IsNullOrEmpty(directory) || !Directory.Exists(directory))
                {
                    return plugins;
                }

                var subDirectories = Directory.GetDirectories(directory);
                foreach (var subDir in subDirectories)
                {
                    try
                    {
                        if (string.IsNullOrEmpty(subDir))
                            continue;

                        var dllFiles = Directory.GetFiles(subDir, "*.dll", SearchOption.AllDirectories);
                        if (dllFiles.Length > 0)
                        {
                            var pluginName = Path.GetFileName(subDir);
                            if (string.IsNullOrEmpty(pluginName))
                                continue;

                            var plugin = new PluginInfo
                            {
                                Id = pluginName.ToLower().Replace(" ", "-"),
                                Name = pluginName,
                                InstallPath = subDir,
                                IsInstalled = true,
                                Version = GetVersionFromDll(dllFiles[0])
                            };

                            plugins.Add(plugin);
                        }
                    }
                    catch (Exception ex)
                    {
                        // Ignorer les erreurs pour un plugin spécifique
                        System.Diagnostics.Debug.WriteLine($"Erreur lors du scan du plugin {subDir}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                // Ignorer les erreurs de lecture
                System.Diagnostics.Debug.WriteLine($"Erreur lors du scan de {directory}: {ex.Message}");
            }

            return plugins;
        }

        /// <summary>
        /// Extrait la version depuis un fichier DLL
        /// </summary>
        private string GetVersionFromDll(string dllPath)
        {
            try
            {
                var versionInfo = System.Diagnostics.FileVersionInfo.GetVersionInfo(dllPath);
                return versionInfo.FileVersion ?? "1.0.0";
            }
            catch
            {
                return "1.0.0";
            }
        }

        /// <summary>
        /// Vérifie si une mise à jour est disponible pour un plugin
        /// </summary>
        public async Task<bool> CheckForUpdatesAsync(PluginInfo plugin)
        {
            try
            {
                // Ici, vous pourriez interroger une API ou un dépôt GitHub
                // Pour l'instant, on simule une vérification
                // TODO: Implémenter la vérification réelle via GitHub API ou un dépôt centralisé
                
                // Exemple: si le plugin a un RepositoryUrl, on pourrait vérifier les releases GitHub
                if (!string.IsNullOrEmpty(plugin.RepositoryUrl))
                {
                    // Logique de vérification GitHub API
                }

                return plugin.HasUpdate;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Télécharge et installe un plugin
        /// </summary>
        public async Task<bool> InstallPluginAsync(PluginInfo plugin)
        {
            try
            {
                if (string.IsNullOrEmpty(plugin.DownloadUrl))
                {
                    MessageBox.Show("URL de téléchargement non disponible pour ce plugin.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return false;
                }

                // Télécharger le plugin
                var zipPath = Path.Combine(_cachePath, $"{plugin.Id}.zip");
                await DownloadFileAsync(plugin.DownloadUrl, zipPath);

                // Extraire dans le dossier des plugins utilisateur
                var obsUserPluginsPath = GetOBSUserPluginsPath();
                var extractPath = Path.Combine(obsUserPluginsPath, plugin.Name);
                if (Directory.Exists(extractPath))
                {
                    Directory.Delete(extractPath, true);
                }
                Directory.CreateDirectory(extractPath);

                ZipFile.ExtractToDirectory(zipPath, extractPath);

                // Nettoyer le fichier zip
                File.Delete(zipPath);

                plugin.IsInstalled = true;
                plugin.InstallPath = extractPath;

                return true;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de l'installation: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        /// <summary>
        /// Met à jour un plugin
        /// </summary>
        public async Task<bool> UpdatePluginAsync(PluginInfo plugin)
        {
            try
            {
                // Sauvegarder l'ancienne version si nécessaire
                if (Directory.Exists(plugin.InstallPath))
                {
                    // Créer une sauvegarde
                    var backupPath = Path.Combine(_cachePath, "backups", plugin.Name, DateTime.Now.ToString("yyyyMMdd_HHmmss"));
                    Directory.CreateDirectory(backupPath);
                    
                    // Copier les fichiers
                    CopyDirectory(plugin.InstallPath, backupPath);
                }

                // Installer la nouvelle version
                return await InstallPluginAsync(plugin);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la mise à jour: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        /// <summary>
        /// Désinstalle un plugin
        /// </summary>
        public bool UninstallPlugin(PluginInfo plugin)
        {
            try
            {
                if (string.IsNullOrEmpty(plugin.InstallPath) || !Directory.Exists(plugin.InstallPath))
                {
                    MessageBox.Show("Le plugin n'est pas installé ou le chemin est introuvable.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return false;
                }

                var result = MessageBox.Show(
                    $"Êtes-vous sûr de vouloir désinstaller {plugin.Name}?",
                    "Confirmation",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (result == MessageBoxResult.Yes)
                {
                    Directory.Delete(plugin.InstallPath, true);
                    plugin.IsInstalled = false;
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors de la désinstallation: {ex.Message}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return false;
            }
        }

        /// <summary>
        /// Recherche des plugins disponibles (exemple avec une liste prédéfinie)
        /// </summary>
        public async Task<List<PluginInfo>> SearchPluginsAsync(string searchTerm = "")
        {
            // TODO: Implémenter la recherche via une API ou un dépôt centralisé
            // Pour l'instant, on retourne une liste d'exemple
            var availablePlugins = new List<PluginInfo>
            {
                new PluginInfo
                {
                    Id = "obs-websocket",
                    Name = "OBS WebSocket",
                    Description = "Plugin WebSocket pour contrôler OBS à distance",
                    Author = "Palakis",
                    Version = "5.0.0",
                    LatestVersion = "5.1.0",
                    Category = "Intégration",
                    DownloadUrl = "https://github.com/obsproject/obs-websocket/releases/latest",
                    RepositoryUrl = "https://github.com/obsproject/obs-websocket"
                },
                new PluginInfo
                {
                    Id = "obs-shaderfilter",
                    Name = "Shader Filter",
                    Description = "Applique des shaders aux sources OBS",
                    Author = "exeldro",
                    Version = "2.0.0",
                    LatestVersion = "2.1.0",
                    Category = "Effets",
                    DownloadUrl = "https://github.com/exeldro/obs-shaderfilter/releases/latest",
                    RepositoryUrl = "https://github.com/exeldro/obs-shaderfilter"
                }
            };

            if (!string.IsNullOrEmpty(searchTerm))
            {
                availablePlugins = availablePlugins.Where(p =>
                    p.Name.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) ||
                    p.Description.Contains(searchTerm, StringComparison.OrdinalIgnoreCase) ||
                    p.Category.Contains(searchTerm, StringComparison.OrdinalIgnoreCase)
                ).ToList();
            }

            return await Task.FromResult(availablePlugins);
        }

        /// <summary>
        /// Télécharge un fichier
        /// </summary>
        private async Task DownloadFileAsync(string url, string destinationPath)
        {
            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            using (var fileStream = new FileStream(destinationPath, FileMode.Create))
            {
                await response.Content.CopyToAsync(fileStream);
            }
        }

        /// <summary>
        /// Copie un répertoire
        /// </summary>
        private void CopyDirectory(string sourceDir, string destDir)
        {
            Directory.CreateDirectory(destDir);

            foreach (var file in Directory.GetFiles(sourceDir))
            {
                var fileName = Path.GetFileName(file);
                File.Copy(file, Path.Combine(destDir, fileName), true);
            }

            foreach (var subDir in Directory.GetDirectories(sourceDir))
            {
                var dirName = Path.GetFileName(subDir);
                CopyDirectory(subDir, Path.Combine(destDir, dirName));
            }
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
}
