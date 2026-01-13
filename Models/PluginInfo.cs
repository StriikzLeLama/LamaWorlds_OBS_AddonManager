using System;

namespace LamaWorlds_OBS_AddonManager.Models
{
    public class PluginInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string LatestVersion { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public string RepositoryUrl { get; set; } = string.Empty;
        public bool IsInstalled { get; set; }
        public string InstallPath { get; set; } = string.Empty;
        public bool HasUpdate { get; set; }
    }
}
