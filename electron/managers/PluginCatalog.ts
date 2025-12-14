/**
 * Static plugin catalog (whitelist) for known OBS plugins.
 * Each plugin must have a GitHub repository with releases.
 */
export interface CatalogPlugin {
    id: string;
    name: string;
    description: string;
    githubOwner: string;
    githubRepo: string;
    windowsAssetPattern?: string; // Pattern to match Windows ZIP asset (e.g., "windows", "win64", "x64")
}

export class PluginCatalog {
    private static plugins: CatalogPlugin[] = [
        {
            id: 'obs-websocket',
            name: 'OBS WebSocket',
            description: 'Remote-control OBS Studio from WebSockets',
            githubOwner: 'obsproject',
            githubRepo: 'obs-websocket',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-shaderfilter',
            name: 'Shader Filter',
            description: 'Apply custom shaders to sources',
            githubOwner: 'exeldro',
            githubRepo: 'obs-shaderfilter',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-source-record',
            name: 'Source Record',
            description: 'Record individual sources',
            githubOwner: 'exeldro',
            githubRepo: 'obs-source-record',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-move-transition',
            name: 'Move Transition',
            description: 'Move sources during transitions',
            githubOwner: 'exeldro',
            githubRepo: 'obs-move-transition',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-gradient-source',
            name: 'Gradient Source',
            description: 'Create gradient sources',
            githubOwner: 'exeldro',
            githubRepo: 'obs-gradient-source',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-scene-collection-manager',
            name: 'Scene Collection Manager',
            description: 'Manage scene collections',
            githubOwner: 'exeldro',
            githubRepo: 'obs-scene-collection-manager',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-advanced-scene-switcher',
            name: 'Advanced Scene Switcher',
            description: 'Automated scene switching',
            githubOwner: 'WarmUpTill',
            githubRepo: 'SceneSwitcher',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-text-pthread',
            name: 'Text PThread',
            description: 'Enhanced text source',
            githubOwner: 'exeldro',
            githubRepo: 'obs-text-pthread',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-source-switcher',
            name: 'Source Switcher',
            description: 'Switch between sources',
            githubOwner: 'exeldro',
            githubRepo: 'obs-source-switcher',
            windowsAssetPattern: 'Windows'
        },
        {
            id: 'obs-dynamic-delay',
            name: 'Dynamic Delay',
            description: 'Add dynamic delay to sources',
            githubOwner: 'exeldro',
            githubRepo: 'obs-dynamic-delay',
            windowsAssetPattern: 'Windows'
        }
    ];

    /**
     * Get all catalog plugins
     */
    static getAll(): CatalogPlugin[] {
        return this.plugins;
    }

    /**
     * Find plugin by ID
     */
    static findById(id: string): CatalogPlugin | undefined {
        return this.plugins.find(p => p.id === id);
    }

    /**
     * Find plugin by name (case-insensitive)
     */
    static findByName(name: string): CatalogPlugin | undefined {
        const lowerName = name.toLowerCase();
        return this.plugins.find(p => 
            p.name.toLowerCase() === lowerName || 
            p.id.toLowerCase() === lowerName
        );
    }

    /**
     * Find plugin by GitHub repo
     */
    static findByRepo(owner: string, repo: string): CatalogPlugin | undefined {
        return this.plugins.find(p => 
            p.githubOwner.toLowerCase() === owner.toLowerCase() &&
            p.githubRepo.toLowerCase() === repo.toLowerCase()
        );
    }
}

