export interface ElectronAPI {
    // OBS Path Management
    getObsPath: () => Promise<string | null>;
    selectObsManual: () => Promise<string | null | undefined>;
    validateObsPath: (path: string) => Promise<boolean>;
    resetObsPath: () => Promise<void>;
    isObsRunning: () => Promise<boolean>;

    // Plugin Management
    scanPlugins: (obsPath: string) => Promise<PluginInfo[]>;
    
    // Plugin Catalog
    getCatalogPlugins: () => Promise<CatalogPlugin[]>;
    findCatalogPlugin: (id: string) => Promise<CatalogPlugin | undefined>;

    // Plugin Operations
    installPlugin: (pluginId: string, obsPath: string, releaseTag?: string) => Promise<{ success: boolean; backupPath: string }>;
    updatePlugin: (pluginId: string, obsPath: string) => Promise<{ success: boolean; backupPath: string }>;
    downgradePlugin: (pluginId: string, releaseTag: string, obsPath: string) => Promise<{ success: boolean; backupPath: string }>;
    removePlugin: (pluginInfo: PluginInfo, obsPath: string) => Promise<{ success: boolean; backupPath: string }>;

    // GitHub Releases
    getLatestRelease: (pluginId: string) => Promise<{
        release: { tag: string; name: string; publishedAt: string };
        asset: { name: string; size: number } | null;
    }>;
    getAllReleases: (pluginId: string) => Promise<Array<{ tag: string; name: string; publishedAt: string }>>;
}

export interface PluginInfo {
    id: string;
    name: string;
    displayName: string;
    version: string;
    scope: 'system' | 'user';
    dllPath: string;
    dataPath?: string;
    folderName: string;
}

export interface CatalogPlugin {
    id: string;
    name: string;
    description: string;
    githubOwner: string;
    githubRepo: string;
    windowsAssetPattern?: string;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

