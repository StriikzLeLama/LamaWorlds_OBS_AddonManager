import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { PluginInfo, CatalogPlugin } from '../electron.d';
import { useToast, ToastContainer } from './Toast';
import { ProgressBar } from './ProgressBar';
import { PluginSkeleton } from './SkeletonLoader';
import { BackupManager } from './BackupManager';
import { ConfigManager } from './ConfigManager';
import { compareVersions, formatVersion } from '../utils/versionCompare';
import { useKeyboardShortcuts } from '../utils/keyboardShortcuts';
import { logger } from '../utils/logger';
import { APP_CONFIG, UI_CONFIG } from '../constants';
import type { 
    FilterStatus, 
    FilterScope, 
    PluginStatus, 
    PluginWithCatalog,
    DowngradeDialogState,
    ProgressState,
    UpdateAllProgress
} from '../types';

interface PluginListProps {
    obsPath: string;
    obsRunning: boolean;
}

export const PluginList: React.FC<PluginListProps> = ({ obsPath, obsRunning }) => {
    const [installedPlugins, setInstalledPlugins] = useState<PluginInfo[]>([]);
    const [catalogPlugins, setCatalogPlugins] = useState<CatalogPlugin[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'installed' | 'available'>('installed');
    const [processingPlugin, setProcessingPlugin] = useState<string | null>(null);
    const [showDowngrade, setShowDowngrade] = useState<DowngradeDialogState | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [filterScope, setFilterScope] = useState<FilterScope>('all');
    const [pluginVersions, setPluginVersions] = useState<Map<string, string>>(new Map());
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [updateAllProgress, setUpdateAllProgress] = useState<UpdateAllProgress | null>(null);

    const toast = useToast();

    // Déclarer les fonctions AVANT de les utiliser
    const loadInstalledPlugins = useCallback(async () => {
        if (!obsPath) return;
        
        setLoading(true);
        try {
            const result = await window.electronAPI.scanPlugins(obsPath);
            setInstalledPlugins(result);
        } catch (err: unknown) {
            logger.error('Failed to load plugins', err);
            toast.error('Failed to scan installed plugins');
        } finally {
            setLoading(false);
        }
    }, [obsPath, toast]);

    const loadCatalogPlugins = useCallback(async () => {
        try {
            const catalog = await window.electronAPI.getCatalogPlugins();
            setCatalogPlugins(catalog);
        } catch (err: unknown) {
            logger.error('Failed to load catalog', err);
            toast.error('Failed to load plugin catalog');
        }
    }, [toast]);

    const loadPluginVersions = useCallback(async () => {
        if (catalogPlugins.length === 0) return;
        
        const versionMap = new Map<string, string>();
        let loadedCount = 0;
        const totalCount = catalogPlugins.length;
        
        // Charger les versions une par une avec délai pour éviter ENOBUFS
        for (const plugin of catalogPlugins) {
            try {
                const latest = await window.electronAPI.getLatestRelease(plugin.id);
                versionMap.set(plugin.id, latest.release.tag);
                loadedCount++;
                
                // Mettre à jour progressivement pour l'UI
                if (loadedCount % 2 === 0 || loadedCount === totalCount) {
                    setPluginVersions(new Map(versionMap));
                }
                
                // Délai entre chaque requête pour éviter la saturation (augmenté à 500ms)
                await new Promise(resolve => setTimeout(resolve, APP_CONFIG.VERSION_LOAD_DELAY));
            } catch (err: unknown) {
                // Ignore errors for individual plugins mais log pour debug
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                logger.debug(`Failed to load version for ${plugin.id}:`, errorMsg);
                
                // Si c'est une erreur réseau, on continue mais on note l'échec
                if (errorMsg.includes('Network error') || errorMsg.includes('ENOBUFS')) {
                    // On peut afficher un toast pour informer l'utilisateur
                    if (loadedCount === 0) {
                        toast.warning('Some plugin versions could not be loaded due to network issues. Retrying...');
                    }
                }
            }
        }
        
        // Mise à jour finale
        setPluginVersions(versionMap);
        
        if (loadedCount < totalCount) {
            toast.info(`Loaded ${loadedCount}/${totalCount} plugin versions. Some may be unavailable.`);
        }
    }, [catalogPlugins, toast]);

    // Raccourcis clavier - après déclaration des fonctions
    useKeyboardShortcuts([
        {
            key: 'r',
            ctrl: true,
            action: loadInstalledPlugins,
            description: 'Refresh plugins',
        },
        {
            key: 'f',
            ctrl: true,
            action: () => {
                const input = document.querySelector('input[placeholder="Search plugins..."]') as HTMLInputElement;
                input?.focus();
            },
            description: 'Focus search',
        },
    ]);

    useEffect(() => {
        if (obsPath) {
            loadInstalledPlugins();
            loadCatalogPlugins();
        }
    }, [obsPath, loadInstalledPlugins, loadCatalogPlugins]);

    // Charger les versions des plugins depuis GitHub
    useEffect(() => {
        if (catalogPlugins.length > 0 && installedPlugins.length > 0) {
            loadPluginVersions();
        }
    }, [catalogPlugins.length, installedPlugins.length, loadPluginVersions]);

    const findInstalledPlugin = useCallback((pluginId: string): PluginInfo | undefined => {
        if (!pluginId) return undefined;
        return installedPlugins.find(p => 
            p.id === pluginId || 
            p.name?.toLowerCase() === pluginId.toLowerCase() ||
            p.folderName?.toLowerCase() === pluginId.toLowerCase()
        );
    }, [installedPlugins]);

    // Filtrage et recherche
    const filteredPlugins = useMemo(() => {
        try {
            const plugins = activeTab === 'installed' 
                ? installedPlugins.map(p => {
                    const catalog = catalogPlugins.find(cp => 
                        cp.id === p.id || 
                        cp.name.toLowerCase() === p.displayName.toLowerCase()
                    );
                    return { installed: p, catalog };
                })
                : catalogPlugins.map(cp => {
                    const installed = findInstalledPlugin(cp.id);
                    return { installed, catalog: cp };
                });

            return plugins.filter(({ installed, catalog }) => {
                // Recherche
                if (searchQuery) {
                    const query = searchQuery.toLowerCase().trim();
                    if (query) {
                        const matchesInstalled = installed && (
                            installed.displayName?.toLowerCase().includes(query) ||
                            installed.name?.toLowerCase().includes(query) ||
                            installed.folderName?.toLowerCase().includes(query)
                        );
                        const matchesCatalog = catalog && (
                            catalog.name?.toLowerCase().includes(query) ||
                            catalog.description?.toLowerCase().includes(query) ||
                            catalog.githubRepo?.toLowerCase().includes(query)
                        );
                        if (!matchesInstalled && !matchesCatalog) return false;
                    }
                }

                // Filtre par statut
                if (activeTab === 'available' && filterStatus !== 'all') {
                    if (filterStatus === 'installed' && !installed) return false;
                    if (filterStatus === 'not-installed' && installed) return false;
                    if (filterStatus === 'update-available' && installed && catalog) {
                        const latestVersion = pluginVersions.get(catalog.id);
                        if (latestVersion) {
                            try {
                                const status = compareVersions(installed.version || 'Unknown', latestVersion);
                                if (status !== 'update-available') return false;
                            } catch (err) {
                                // If version comparison fails, don't filter out
                                return false;
                            }
                        } else {
                            return false;
                        }
                    }
                }

                // Filtre par scope
                if (activeTab === 'installed' && filterScope !== 'all' && installed) {
                    if (installed.scope !== filterScope) return false;
                }

                return true;
            });
        } catch (error) {
            logger.error('Error filtering plugins', error);
            return [];
        }
    }, [installedPlugins, catalogPlugins, activeTab, searchQuery, filterStatus, filterScope, pluginVersions, findInstalledPlugin]);

    const getPluginStatus = (plugin: CatalogPlugin, installed?: PluginInfo): PluginStatus => {
        if (!installed) return 'not-installed';
        
        const latestVersion = pluginVersions.get(plugin.id);
        if (!latestVersion) return 'up-to-date';
        
        return compareVersions(installed.version, latestVersion);
    };

    const handleInstall = useCallback(async (plugin: CatalogPlugin) => {
        if (!plugin || !obsPath) {
            toast.error('Invalid plugin or OBS path');
            return;
        }

        if (obsRunning) {
            toast.warning('OBS Studio is running. Please close it before installing plugins.');
            return;
        }

        if (processingPlugin) {
            toast.warning('Another operation is in progress');
            return;
        }

        setProcessingPlugin(plugin.id);
        setProgress({ pluginId: plugin.id, progress: 0, stage: 'Starting...' });

        try {
            const result = await window.electronAPI.installPlugin(plugin.id, obsPath);
            toast.success(`Plugin "${plugin.name}" installed successfully!`);
            setProgress(null);
            await loadInstalledPlugins();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err) || 'Installation failed';
            logger.error('Plugin installation failed', err);
            toast.error(errorMessage);
            setProgress(null);
        } finally {
            setProcessingPlugin(null);
        }
    }, [obsPath, obsRunning, processingPlugin, toast, loadInstalledPlugins]);

    const handleUpdate = async (plugin: CatalogPlugin) => {
        if (obsRunning) {
            toast.warning('OBS Studio is running. Please close it before updating plugins.');
            return;
        }

        setProcessingPlugin(plugin.id);
        setProgress({ pluginId: plugin.id, progress: 0, stage: 'Starting update...' });

        try {
            const result = await window.electronAPI.updatePlugin(plugin.id, obsPath);
            toast.success(`Plugin "${plugin.name}" updated successfully!`);
            setProgress(null);
            await loadInstalledPlugins();
            await loadPluginVersions();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Update failed';
            logger.error('Plugin update failed', err);
            toast.error(errorMessage);
            setProgress(null);
        } finally {
            setProcessingPlugin(null);
        }
    };

    const handleUpdateAll = async () => {
        if (obsRunning) {
            toast.warning('OBS Studio is running. Please close it before updating plugins.');
            return;
        }

        const pluginsToUpdate = catalogPlugins.filter(plugin => {
            const installed = findInstalledPlugin(plugin.id);
            if (!installed) return false;
            const status = getPluginStatus(plugin, installed);
            return status === 'update-available';
        });

        if (pluginsToUpdate.length === 0) {
            toast.info('All plugins are up to date!');
            return;
        }

        setUpdateAllProgress({ current: 0, total: pluginsToUpdate.length });

        for (let i = 0; i < pluginsToUpdate.length; i++) {
            const plugin = pluginsToUpdate[i];
            setUpdateAllProgress({ current: i + 1, total: pluginsToUpdate.length });
            setProgress({ pluginId: plugin.id, progress: 0, stage: `Updating ${plugin.name}...` });

            try {
                await window.electronAPI.updatePlugin(plugin.id, obsPath);
                toast.success(`Updated ${plugin.name} (${i + 1}/${pluginsToUpdate.length})`);
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                logger.error(`Failed to update ${plugin.name}`, err);
                toast.error(`Failed to update ${plugin.name}: ${errorMessage}`);
            }
        }

        setUpdateAllProgress(null);
        setProgress(null);
        await loadInstalledPlugins();
        await loadPluginVersions();
    };

    const handleRemove = async (plugin: PluginInfo) => {
        if (obsRunning) {
            toast.warning('OBS Studio is running. Please close it before removing plugins.');
            return;
        }

        if (!confirm(`Are you sure you want to remove "${plugin.displayName}"?`)) {
            return;
        }

        setProcessingPlugin(plugin.id);

        try {
            const result = await window.electronAPI.removePlugin(plugin, obsPath);
            toast.success(`Plugin "${plugin.displayName}" removed successfully!`);
            await loadInstalledPlugins();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Removal failed';
            logger.error('Plugin removal failed', err);
            toast.error(errorMessage);
        } finally {
            setProcessingPlugin(null);
        }
    };

    const handleDowngrade = async (pluginId: string, releaseTag: string) => {
        if (obsRunning) {
            toast.warning('OBS Studio is running. Please close it before downgrading plugins.');
            return;
        }

        setProcessingPlugin(pluginId);
        setShowDowngrade(null);

        try {
            const result = await window.electronAPI.downgradePlugin(pluginId, releaseTag, obsPath);
            toast.success(`Plugin downgraded successfully!`);
            await loadInstalledPlugins();
            await loadPluginVersions();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Downgrade failed';
            logger.error('Plugin downgrade failed', err);
            toast.error(errorMessage);
        } finally {
            setProcessingPlugin(null);
        }
    };

    const openDowngradeDialog = async (plugin: CatalogPlugin) => {
        try {
            const releases = await window.electronAPI.getAllReleases(plugin.id);
            setShowDowngrade({ pluginId: plugin.id, releases });
        } catch (err: unknown) {
            logger.error('Failed to load releases', err);
            toast.error('Failed to load releases');
        }
    };

    const pluginsNeedingUpdate = useMemo(() => {
        return catalogPlugins.filter(plugin => {
            const installed = findInstalledPlugin(plugin.id);
            if (!installed) return false;
            return getPluginStatus(plugin, installed) === 'update-available';
        }).length;
    }, [catalogPlugins, findInstalledPlugin, pluginVersions]);

    return (
        <>
            <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
            <div className="glass-panel p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Plugins</h2>
                    <div className="flex gap-2">
                        <BackupManager />
                        <ConfigManager installedPlugins={installedPlugins} />
                        <button
                            onClick={() => setActiveTab('installed')}
                            className={`btn ${activeTab === 'installed' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Installed ({installedPlugins.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('available')}
                            className={`btn ${activeTab === 'available' ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            Available ({catalogPlugins.length})
                            {pluginsNeedingUpdate > 0 && (
                                <span className="ml-2 status-badge status-update-available">
                                    {pluginsNeedingUpdate} updates
                                </span>
                            )}
                        </button>
                        {activeTab === 'available' && pluginsNeedingUpdate > 0 && (
                            <button
                                onClick={handleUpdateAll}
                                disabled={obsRunning || processingPlugin !== null}
                                className="btn btn-primary"
                            >
                                Update All ({pluginsNeedingUpdate})
                            </button>
                        )}
                        <button
                            onClick={loadInstalledPlugins}
                            disabled={loading}
                            className="btn btn-secondary"
                        >
                            {loading ? <div className="spinner"></div> : '↻ Refresh'}
                        </button>
                    </div>
                </div>

                {/* Barre de recherche et filtres */}
                <div className="mb-4 flex gap-3 flex-wrap">
                    <input
                        type="text"
                        placeholder="Search plugins..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input flex-1 min-w-[200px]"
                    />
                    {activeTab === 'available' && (
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                            className="input"
                        >
                            <option value="all">All Status</option>
                            <option value="installed">Installed</option>
                            <option value="update-available">Update Available</option>
                            <option value="not-installed">Not Installed</option>
                        </select>
                    )}
                    {activeTab === 'installed' && (
                        <select
                            value={filterScope}
                            onChange={(e) => setFilterScope(e.target.value as FilterScope)}
                            className="input"
                        >
                            <option value="all">All Scopes</option>
                            <option value="system">System</option>
                            <option value="user">User</option>
                        </select>
                    )}
                </div>

                {updateAllProgress && (
                    <div className="mb-4">
                        <ProgressBar
                            progress={(updateAllProgress.current / updateAllProgress.total) * 100}
                            label={`Updating plugins: ${updateAllProgress.current}/${updateAllProgress.total}`}
                        />
                    </div>
                )}

                {progress && (
                    <div className="mb-4">
                        <ProgressBar
                            progress={progress.progress}
                            label={progress.stage}
                        />
                    </div>
                )}

                {obsRunning && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                        ⚠️ OBS Studio is running. Plugin operations are disabled for safety.
                    </div>
                )}

                {loading && activeTab === 'installed' ? (
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => <PluginSkeleton key={i} />)}
                    </div>
                ) : filteredPlugins.length === 0 ? (
                    <p className="text-gray-400 text-center p-8">
                        {searchQuery ? 'No plugins match your search.' : 
                         activeTab === 'installed' ? 'No plugins found. Install plugins from the "Available" tab.' :
                         'No plugins available.'}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {filteredPlugins.map(({ installed, catalog }) => {
                            if (activeTab === 'installed' && installed) {
                                const status = catalog ? getPluginStatus(catalog, installed) : 'up-to-date';
                                const isProcessing = processingPlugin === (catalog?.id || installed.id);

                                return (
                                    <div
                                        key={installed.id}
                                        className="glass-panel p-4 hover:glow transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-bold text-white text-lg">
                                                        {installed.displayName}
                                                    </h3>
                                                    <span className={`status-badge status-${installed.scope}`}>
                                                        {installed.scope}
                                                    </span>
                                                    <span className={`status-badge ${
                                                        status === 'update-available' ? 'status-update-available' :
                                                        status === 'up-to-date' ? 'status-up-to-date' :
                                                        'status-unknown'
                                                    }`}>
                                                        v{formatVersion(installed.version)}
                                                        {status === 'update-available' && catalog && (
                                                            <span className="ml-1">
                                                                → v{formatVersion(pluginVersions.get(catalog.id) || '?')}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {installed.dllPath}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {catalog && (
                                                    <>
                                                        {status === 'update-available' && (
                                                            <button
                                                                onClick={() => handleUpdate(catalog)}
                                                                disabled={obsRunning || processingPlugin !== null}
                                                                className="btn btn-primary text-xs"
                                                            >
                                                                {isProcessing ? (
                                                                    <div className="spinner"></div>
                                                                ) : (
                                                                    'Update'
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openDowngradeDialog(catalog)}
                                                            disabled={obsRunning || processingPlugin !== null}
                                                            className="btn btn-secondary text-xs"
                                                        >
                                                            Downgrade
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleRemove(installed)}
                                                    disabled={obsRunning || processingPlugin !== null}
                                                    className="btn btn-danger text-xs"
                                                >
                                                    {isProcessing ? (
                                                        <div className="spinner"></div>
                                                    ) : (
                                                        'Remove'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else if (activeTab === 'available' && catalog) {
                                const status = getPluginStatus(catalog, installed);
                                const isProcessing = processingPlugin === catalog.id;

                                return (
                                    <div
                                        key={catalog.id}
                                        className="glass-panel p-4 hover:glow transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-bold text-white text-lg">
                                                        {catalog.name}
                                                    </h3>
                                                    {status !== 'not-installed' && status === 'up-to-date' && (
                                                        <span className="status-badge status-up-to-date">
                                                            Installed
                                                        </span>
                                                    )}
                                                    {status === 'update-available' && (
                                                        <span className="status-badge status-update-available">
                                                            Update Available
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-300 mb-2">
                                                    {catalog.description}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    GitHub: {catalog.githubOwner}/{catalog.githubRepo}
                                                    {installed && ` • Installed: v${formatVersion(installed.version)}`}
                                                    {pluginVersions.has(catalog.id) && ` • Latest: v${formatVersion(pluginVersions.get(catalog.id)!)}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {status === 'not-installed' ? (
                                                    <button
                                                        onClick={() => handleInstall(catalog)}
                                                        disabled={obsRunning || isProcessing}
                                                        className="btn btn-primary"
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <div className="spinner mr-2"></div>
                                                                Installing...
                                                            </>
                                                        ) : (
                                                            'Install'
                                                        )}
                                                    </button>
                                                ) : (
                                                    <>
                                                        {status === 'update-available' && (
                                                            <button
                                                                onClick={() => handleUpdate(catalog)}
                                                                disabled={obsRunning || isProcessing}
                                                                className="btn btn-primary"
                                                            >
                                                                {isProcessing ? (
                                                                    <>
                                                                        <div className="spinner mr-2"></div>
                                                                        Updating...
                                                                    </>
                                                                ) : (
                                                                    'Update'
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => openDowngradeDialog(catalog)}
                                                            disabled={obsRunning || isProcessing}
                                                            className="btn btn-secondary"
                                                        >
                                                            Downgrade
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                )}

                {showDowngrade && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="glass-panel p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">Select Version to Install</h3>
                                <button
                                    onClick={() => setShowDowngrade(null)}
                                    className="btn btn-secondary text-xs"
                                >
                                    ✕ Close
                                </button>
                            </div>
                            <div className="space-y-2">
                                {showDowngrade.releases.map((release: any) => (
                                    <div
                                        key={release.tag}
                                        className="glass-panel p-3 flex items-center justify-between hover:glow cursor-pointer"
                                        onClick={() => handleDowngrade(showDowngrade.pluginId, release.tag)}
                                    >
                                        <div>
                                            <div className="font-semibold text-white">{release.name || release.tag}</div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(release.publishedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <button className="btn btn-primary text-xs">
                                            Install
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

