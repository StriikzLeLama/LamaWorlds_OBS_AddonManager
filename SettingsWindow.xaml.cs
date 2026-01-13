using System;
using System.IO;
using System.Windows;
using System.Windows.Forms;
using FormsDialogResult = System.Windows.Forms.DialogResult;
using LamaWorlds_OBS_AddonManager.Services;

namespace LamaWorlds_OBS_AddonManager
{
    public partial class SettingsWindow : Window
    {
        private readonly ConfigurationService _configService;

        public SettingsWindow()
        {
            InitializeComponent();
            _configService = new ConfigurationService();
            LoadSettings();
            DisplayDefaultPaths();
        }

        private void LoadSettings()
        {
            var config = _configService.GetConfiguration();
            OBSPathTextBox.Text = config.CustomOBSPath ?? string.Empty;
            OBSUserPluginsPathTextBox.Text = config.CustomOBSUserPluginsPath ?? string.Empty;
            ValidatePaths();
        }

        private void DisplayDefaultPaths()
        {
            var defaultSystemPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "obs-studio",
                "obs-plugins",
                "64bit"
            );
            DefaultSystemPathText.Text = defaultSystemPath;

            var defaultUserPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "obs-studio",
                "plugins"
            );
            DefaultUserPathText.Text = defaultUserPath;
        }

        private void ValidatePaths()
        {
            // Valider le chemin OBS
            if (string.IsNullOrWhiteSpace(OBSPathTextBox.Text))
            {
                OBSPathStatus.Text = "Utilisation du chemin par défaut";
                OBSPathStatus.Foreground = System.Windows.Media.Brushes.Gray;
            }
            else if (Directory.Exists(OBSPathTextBox.Text))
            {
                OBSPathStatus.Text = "✓ Chemin valide";
                OBSPathStatus.Foreground = System.Windows.Media.Brushes.Green;
            }
            else
            {
                OBSPathStatus.Text = "⚠ Chemin introuvable - sera ignoré";
                OBSPathStatus.Foreground = System.Windows.Media.Brushes.Orange;
            }

            // Valider le chemin plugins utilisateur
            if (string.IsNullOrWhiteSpace(OBSUserPluginsPathTextBox.Text))
            {
                OBSUserPluginsPathStatus.Text = "Utilisation du chemin par défaut";
                OBSUserPluginsPathStatus.Foreground = System.Windows.Media.Brushes.Gray;
            }
            else if (Directory.Exists(OBSUserPluginsPathTextBox.Text))
            {
                OBSUserPluginsPathStatus.Text = "✓ Chemin valide";
                OBSUserPluginsPathStatus.Foreground = System.Windows.Media.Brushes.Green;
            }
            else
            {
                OBSUserPluginsPathStatus.Text = "⚠ Chemin introuvable - sera ignoré";
                OBSUserPluginsPathStatus.Foreground = System.Windows.Media.Brushes.Orange;
            }
        }

        private void OBSPathTextBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            ValidatePaths();
        }

        private void OBSUserPluginsPathTextBox_TextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            ValidatePaths();
        }

        private void BrowseOBSPath_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new FolderBrowserDialog
            {
                Description = "Sélectionnez le dossier d'installation d'OBS Studio",
                ShowNewFolderButton = false
            };

            if (!string.IsNullOrEmpty(OBSPathTextBox.Text) && Directory.Exists(OBSPathTextBox.Text))
            {
                dialog.SelectedPath = OBSPathTextBox.Text;
            }

            if (dialog.ShowDialog() == FormsDialogResult.OK)
            {
                OBSPathTextBox.Text = dialog.SelectedPath;
            }
        }

        private void BrowseOBSUserPluginsPath_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new FolderBrowserDialog
            {
                Description = "Sélectionnez le dossier des plugins utilisateur OBS",
                ShowNewFolderButton = true
            };

            if (!string.IsNullOrEmpty(OBSUserPluginsPathTextBox.Text) && Directory.Exists(OBSUserPluginsPathTextBox.Text))
            {
                dialog.SelectedPath = OBSUserPluginsPathTextBox.Text;
            }

            if (dialog.ShowDialog() == FormsDialogResult.OK)
            {
                OBSUserPluginsPathTextBox.Text = dialog.SelectedPath;
            }
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            var config = _configService.GetConfiguration();
            config.CustomOBSPath = OBSPathTextBox.Text.Trim();
            config.CustomOBSUserPluginsPath = OBSUserPluginsPathTextBox.Text.Trim();

            _configService.SaveConfiguration(config);

            System.Windows.MessageBox.Show(
                "Les paramètres ont été enregistrés avec succès.\n\n" +
                "Vous devrez peut-être actualiser la liste des plugins pour voir les changements.",
                "Paramètres enregistrés",
                MessageBoxButton.OK,
                MessageBoxImage.Information);

            DialogResult = true;
            Close();
        }

        private void ResetButton_Click(object sender, RoutedEventArgs e)
        {
            var result = System.Windows.MessageBox.Show(
                "Êtes-vous sûr de vouloir réinitialiser tous les chemins personnalisés ?",
                "Confirmation",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (result == MessageBoxResult.Yes)
            {
                OBSPathTextBox.Text = string.Empty;
                OBSUserPluginsPathTextBox.Text = string.Empty;
                ValidatePaths();
            }
        }
    }
}
