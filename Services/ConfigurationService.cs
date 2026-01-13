using System;
using System.IO;
using Newtonsoft.Json;

namespace LamaWorlds_OBS_AddonManager.Services
{
    public class AppConfiguration
    {
        public string CustomOBSPath { get; set; } = string.Empty;
        public string CustomOBSUserPluginsPath { get; set; } = string.Empty;
    }

    public class ConfigurationService
    {
        private readonly string _configPath;
        private AppConfiguration _configuration;

        public ConfigurationService()
        {
            var appDataPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "LamaWorlds",
                "OBS_AddonManager"
            );

            if (!Directory.Exists(appDataPath))
            {
                Directory.CreateDirectory(appDataPath);
            }

            _configPath = Path.Combine(appDataPath, "config.json");
            _configuration = LoadConfiguration();
        }

        public AppConfiguration GetConfiguration()
        {
            return _configuration;
        }

        public void SaveConfiguration(AppConfiguration config)
        {
            _configuration = config;
            try
            {
                var json = JsonConvert.SerializeObject(config, Formatting.Indented);
                File.WriteAllText(_configPath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur lors de la sauvegarde de la configuration: {ex.Message}");
            }
        }

        private AppConfiguration LoadConfiguration()
        {
            try
            {
                if (File.Exists(_configPath))
                {
                    var json = File.ReadAllText(_configPath);
                    return JsonConvert.DeserializeObject<AppConfiguration>(json) ?? new AppConfiguration();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Erreur lors du chargement de la configuration: {ex.Message}");
            }

            return new AppConfiguration();
        }

        public void UpdateOBSPath(string obsPath)
        {
            _configuration.CustomOBSPath = obsPath;
            SaveConfiguration(_configuration);
        }

        public void UpdateOBSUserPluginsPath(string userPluginsPath)
        {
            _configuration.CustomOBSUserPluginsPath = userPluginsPath;
            SaveConfiguration(_configuration);
        }
    }
}
