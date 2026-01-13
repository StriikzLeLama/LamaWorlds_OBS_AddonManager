using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using LamaWorlds_OBS_AddonManager.Models;
using LamaWorlds_OBS_AddonManager.Services;

namespace LamaWorlds_OBS_AddonManager
{
    public partial class MainWindow : Window
    {
        private ConfigurationService? _configService;
        private OBSPluginService? _pluginService;
        private List<PluginInfo> _allPlugins;
        private string _currentView = "Installed";

        public MainWindow()
        {
            InitializeComponent();
            _allPlugins = new List<PluginInfo>();
            
            try
            {
                _configService = new ConfigurationService();
                _pluginService = new OBSPluginService(_configService);
            }
            catch (Exception ex)
            {
                // Afficher l'erreur mais continuer - on pourra réessayer plus tard
                System.Diagnostics.Debug.WriteLine($"Erreur lors de l'initialisation des services: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack trace: {ex.StackTrace}");
                
                // Essayer d'initialiser sans ConfigurationService en cas d'erreur
                try
                {
                    _pluginService = new OBSPluginService(null);
                }
                catch
                {
                    // Si même ça échoue, on laisse null et on gérera dans LoadPluginsAsync
                }
            }

            Loaded += MainWindow_Loaded;
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            // Attendre un court instant pour s'assurer que tous les contrôles sont initialisés
            await Task.Delay(100);
            await LoadPluginsAsync();
        }

        private async Task LoadPluginsAsync()
        {
            try
            {
                // Essayer d'initialiser le service s'il n'est pas déjà fait
                if (_pluginService == null)
                {
                    try
                    {
                        if (_configService == null)
                        {
                            _configService = new ConfigurationService();
                        }
                        _pluginService = new OBSPluginService(_configService);
                    }
                    catch (Exception initEx)
                    {
                        if (StatusText != null)
                            StatusText.Text = "Erreur d'initialisation";
                        MessageBox.Show(
                            $"Impossible d'initialiser le service de plugins.\n\nErreur: {initEx.Message}\n\nVeuillez vérifier que OBS Studio est installé et que vous avez les permissions nécessaires.",
                            "Erreur d'initialisation",
                            MessageBoxButton.OK,
                            MessageBoxImage.Error);
                        return;
                    }
                }

                if (StatusText != null)
                    StatusText.Text = "Chargement des plugins...";
                if (ProgressBar != null)
                    ProgressBar.Visibility = Visibility.Visible;

                if (_currentView == "Installed")
                {
                    _allPlugins = await _pluginService.GetInstalledPluginsAsync() ?? new List<PluginInfo>();
                }
                else if (_currentView == "Search")
                {
                    _allPlugins = await _pluginService.SearchPluginsAsync() ?? new List<PluginInfo>();
                }
                else if (_currentView == "Updates")
                {
                    var installed = await _pluginService.GetInstalledPluginsAsync() ?? new List<PluginInfo>();
                    _allPlugins = installed.Where(p => p.HasUpdate).ToList();
                }
                else
                {
                    _allPlugins = new List<PluginInfo>();
                }

                ApplyFilters();
                if (StatusText != null)
                    StatusText.Text = $"{_allPlugins?.Count ?? 0} plugin(s) trouvé(s)";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erreur lors du chargement: {ex.Message}\n\nDétails: {ex.StackTrace}", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                if (StatusText != null)
                    StatusText.Text = "Erreur";
            }
            finally
            {
                if (ProgressBar != null)
                    ProgressBar.Visibility = Visibility.Collapsed;
            }
        }

        private void ApplyFilters()
        {
            if (_allPlugins == null)
            {
                _allPlugins = new List<PluginInfo>();
            }

            var filtered = _allPlugins.AsEnumerable();

            // Filtre par catégorie
            if (CategoryFilter != null && CategoryFilter.SelectedItem is ComboBoxItem selectedCategory && 
                selectedCategory.Content?.ToString() != "Toutes les catégories")
            {
                var category = selectedCategory.Content?.ToString();
                if (!string.IsNullOrEmpty(category))
                {
                    filtered = filtered.Where(p => p.Category == category);
                }
            }

            // Filtre par recherche
            if (SearchTextBox != null && !string.IsNullOrWhiteSpace(SearchTextBox.Text))
            {
                var searchTerm = SearchTextBox.Text.ToLower();
                filtered = filtered.Where(p =>
                    (!string.IsNullOrEmpty(p.Name) && p.Name.ToLower().Contains(searchTerm)) ||
                    (!string.IsNullOrEmpty(p.Description) && p.Description.ToLower().Contains(searchTerm)) ||
                    (!string.IsNullOrEmpty(p.Author) && p.Author.ToLower().Contains(searchTerm)));
            }

            if (PluginsList != null)
            {
                PluginsList.ItemsSource = filtered.ToList();
            }
        }

        private async void RefreshButton_Click(object sender, RoutedEventArgs e)
        {
            await LoadPluginsAsync();
        }

        private async void SearchButton_Click(object sender, RoutedEventArgs e)
        {
            _currentView = "Search";
            await LoadPluginsAsync();
        }

        private async void InstalledPlugins_Checked(object sender, RoutedEventArgs e)
        {
            _currentView = "Installed";
            await LoadPluginsAsync();
        }

        private async void SearchPlugins_Checked(object sender, RoutedEventArgs e)
        {
            _currentView = "Search";
            await LoadPluginsAsync();
        }

        private async void Updates_Checked(object sender, RoutedEventArgs e)
        {
            _currentView = "Updates";
            await LoadPluginsAsync();
        }

        private void CategoryFilter_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ApplyFilters();
        }

        private void SearchTextBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            ApplyFilters();
        }

        private async void InstallPlugin_Click(object sender, RoutedEventArgs e)
        {
            if (_pluginService == null)
            {
                MessageBox.Show("Le service de plugins n'est pas initialisé.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            if (sender is Button button && button.Tag is PluginInfo plugin)
            {
                if (StatusText != null)
                    StatusText.Text = $"Installation de {plugin.Name}...";
                if (ProgressBar != null)
                    ProgressBar.Visibility = Visibility.Visible;

                var success = await _pluginService.InstallPluginAsync(plugin);

                if (success)
                {
                    MessageBox.Show($"{plugin.Name} a été installé avec succès!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    await LoadPluginsAsync();
                }

                if (ProgressBar != null)
                    ProgressBar.Visibility = Visibility.Collapsed;
                if (StatusText != null)
                    StatusText.Text = "Prêt";
            }
        }

        private async void UpdatePlugin_Click(object sender, RoutedEventArgs e)
        {
            if (_pluginService == null)
            {
                MessageBox.Show("Le service de plugins n'est pas initialisé.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            if (sender is Button button && button.Tag is PluginInfo plugin)
            {
                if (StatusText != null)
                    StatusText.Text = $"Mise à jour de {plugin.Name}...";
                if (ProgressBar != null)
                    ProgressBar.Visibility = Visibility.Visible;

                var success = await _pluginService.UpdatePluginAsync(plugin);

                if (success)
                {
                    MessageBox.Show($"{plugin.Name} a été mis à jour avec succès!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    await LoadPluginsAsync();
                }

                if (ProgressBar != null)
                    ProgressBar.Visibility = Visibility.Collapsed;
                if (StatusText != null)
                    StatusText.Text = "Prêt";
            }
        }

        private async void UninstallPlugin_Click(object sender, RoutedEventArgs e)
        {
            if (_pluginService == null)
            {
                MessageBox.Show("Le service de plugins n'est pas initialisé.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            if (sender is Button button && button.Tag is PluginInfo plugin)
            {
                var success = _pluginService.UninstallPlugin(plugin);

                if (success)
                {
                    MessageBox.Show($"{plugin.Name} a été désinstallé avec succès!", "Succès", MessageBoxButton.OK, MessageBoxImage.Information);
                    await LoadPluginsAsync();
                }
            }
        }

        private async void SettingsButton_Click(object sender, RoutedEventArgs e)
        {
            if (_configService == null)
            {
                MessageBox.Show("Le service de configuration n'est pas initialisé.", "Erreur", MessageBoxButton.OK, MessageBoxImage.Error);
                return;
            }

            var settingsWindow = new SettingsWindow
            {
                Owner = this
            };

            if (settingsWindow.ShowDialog() == true)
            {
                // Le service lit la configuration à chaque appel, donc pas besoin de le recréer
                // Recharger les plugins après modification des paramètres
                await LoadPluginsAsync();
            }
        }

        protected override void OnClosed(EventArgs e)
        {
            _pluginService?.Dispose();
            base.OnClosed(e);
        }
    }
}
