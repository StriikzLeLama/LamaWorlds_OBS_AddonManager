import React, { useEffect, useState } from 'react';
import type { PluginInfo, CatalogPlugin } from '../electron.d';

interface PluginListProps {
    obsPath: string;
    obsRunning: boolean;
}

export const PluginList: React.FC<PluginListProps> = ({ obsPath, obsRunning }) => {
    const [installedPlugins, setInstalledPlugins] = useState<PluginInfo[]>([]);
    const [catalogPlugins, setCatalogPlugins] = useState<CatalogPlugin[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'installed' | 'available'>('installed');
    const [processingPlugin, setProcessingPlugin] = useState<string | null>(null);
    const [showDowngrade, setShowDowngrade] = useState<{ pluginId: string; releases: any[] } | null>(null);

    useEffect(() => {
        if (obsPath) {
            loadInstalledPlugins();
            loadCatalogPlugins();
        }
    }, [obsPath]);

    const loadInstalledPlugins = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.scanPlugins(obsPath);
            setInstalledPlugins(result);
        } catch (err: any) {
            console.error('Failed to load plugins', err);
            setError('Failed to scan installed plugins');
        } finally {
            setLoading(false);
        }
    };

    const loadCatalogPlugins = async () => {
        try {
            const catalog = await window.electronAPI.getCatalogPlugins();
            setCatalogPlugins(catalog);
        } catch (err: any) {
            console.error('Failed to load catalog', err);
        }
    };

    const findInstalledPlugin = (pluginId: string): PluginInfo | undefined => {
        return installedPlugins.find(p => 
            p.id === pluginId || 
            p.name.toLowerCase() === pluginId.toLowerCase() ||
            p.folderName.toLowerCase() === pluginId.toLowerCase()
        );
    };

    const handleInstall = async (plugin: CatalogPlugin) => {
        if (obsRunning) {
            setError('OBS Studio is running. Please close it before installing plugins.');
            return;
        }

        setProcessingPlugin(plugin.id);
        setError(null);
        setSuccess(null);

        try {
            const result = await window.electronAPI.installPlugin(plugin.id, obsPath);
            setSuccess(`Plugin "${plugin.name}" installed successfully! Backup created: ${result.backupPath}`);
            await loadInstalledPlugins();
        } catch (err: any) {
            setError(err.message || 'Installation failed');
        } finally {
            setProcessingPlugin(null);
        }
    };

    const handleUpdate = async (plugin: CatalogPlugin) => {
        if (obsRunning) {
            setError('OBS Studio is running. Please close it before updating plugins.');
            return;
        }

        setProcessingPlugin(plugin.id);
        setError(null);
        setSuccess(null);

        try {
            const result = await window.electronAPI.updatePlugin(plugin.id, obsPath);
            setSuccess(`Plugin "${plugin.name}" updated successfully! Backup created: ${result.backupPath}`);
            await loadInstalledPlugins();
        } catch (err: any) {
            setError(err.message || 'Update failed');
        } finally {
            setProcessingPlugin(null);
        }
    };

    const handleRemove = async (plugin: PluginInfo) => {
        if (obsRunning) {
            setError('OBS Studio is running. Please close it before removing plugins.');
            return;
        }

        if (!confirm(`Are you sure you want to remove "${plugin.displayName}"?`)) {
            return;
        }

        setProcessingPlugin(plugin.id);
        setError(null);
        setSuccess(null);

        try {
            const result = await window.electronAPI.removePlugin(plugin, obsPath);
            setSuccess(`Plugin "${plugin.displayName}" removed successfully! Backup created: ${result.backupPath}`);
            await loadInstalledPlugins();
        } catch (err: any) {
            setError(err.message || 'Removal failed');
        } finally {
            setProcessingPlugin(null);
        }
    };

    const handleDowngrade = async (pluginId: string, releaseTag: string) => {
        if (obsRunning) {
            setError('OBS Studio is running. Please close it before downgrading plugins.');
            return;
        }

        setProcessingPlugin(pluginId);
        setError(null);
        setSuccess(null);
        setShowDowngrade(null);

        try {
            const result = await window.electronAPI.downgradePlugin(pluginId, releaseTag, obsPath);
            setSuccess(`Plugin downgraded successfully! Backup created: ${result.backupPath}`);
            await loadInstalledPlugins();
        } catch (err: any) {
            setError(err.message || 'Downgrade failed');
        } finally {
            setProcessingPlugin(null);
        }
    };

    const openDowngradeDialog = async (plugin: CatalogPlugin) => {
        try {
            const releases = await window.electronAPI.getAllReleases(plugin.id);
            setShowDowngrade({ pluginId: plugin.id, releases });
        } catch (err: any) {
            setError('Failed to load releases');
        }
    };

    const getPluginStatus = (plugin: CatalogPlugin): 'installed' | 'update-available' | 'not-installed' => {
        const installed = findInstalledPlugin(plugin.id);
        if (!installed) return 'not-installed';

        // Try to check if update is available (simplified - would need version comparison)
        return 'installed';
    };

    return (
        <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Plugins</h2>
                <div className="flex gap-2">
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
                    </button>
                    <button
                        onClick={loadInstalledPlugins}
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        {loading ? <div className="spinner"></div> : '↻ Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-sm">
                    {success}
                </div>
            )}

            {obsRunning && (
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                    ⚠️ OBS Studio is running. Plugin operations are disabled for safety.
                </div>
            )}

            {loading && activeTab === 'installed' ? (
                <div className="flex items-center justify-center p-8">
                    <div className="spinner mr-3"></div>
                    <span className="text-gray-300">Scanning plugins...</span>
                </div>
            ) : activeTab === 'installed' ? (
                <div className="space-y-2">
                    {installedPlugins.length === 0 ? (
                        <p className="text-gray-400 text-center p-8">
                            No plugins found. Install plugins from the "Available" tab.
                        </p>
                    ) : (
                        installedPlugins.map((plugin) => {
                            const catalogPlugin = catalogPlugins.find(cp => 
                                cp.id === plugin.id || 
                                cp.name.toLowerCase() === plugin.displayName.toLowerCase()
                            );

                            return (
                                <div
                                    key={plugin.id}
                                    className="glass-panel p-4 hover:glow transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-white text-lg">
                                                    {plugin.displayName}
                                                </h3>
                                                <span className={`status-badge status-${plugin.scope}`}>
                                                    {plugin.scope}
                                                </span>
                                                <span className="status-badge status-unknown">
                                                    v{plugin.version}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {plugin.dllPath}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {catalogPlugin && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdate(catalogPlugin)}
                                                        disabled={obsRunning || processingPlugin !== null}
                                                        className="btn btn-primary text-xs"
                                                    >
                                                        {processingPlugin === catalogPlugin.id ? (
                                                            <div className="spinner"></div>
                                                        ) : (
                                                            'Update'
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => openDowngradeDialog(catalogPlugin)}
                                                        disabled={obsRunning || processingPlugin !== null}
                                                        className="btn btn-secondary text-xs"
                                                    >
                                                        Downgrade
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleRemove(plugin)}
                                                disabled={obsRunning || processingPlugin !== null}
                                                className="btn btn-danger text-xs"
                                            >
                                                {processingPlugin === plugin.id ? (
                                                    <div className="spinner"></div>
                                                ) : (
                                                    'Remove'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {catalogPlugins.map((plugin) => {
                        const status = getPluginStatus(plugin);
                        const installed = findInstalledPlugin(plugin.id);
                        const isProcessing = processingPlugin === plugin.id;

                        return (
                            <div
                                key={plugin.id}
                                className="glass-panel p-4 hover:glow transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-white text-lg">
                                                {plugin.name}
                                            </h3>
                                            {status === 'installed' && (
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
                                            {plugin.description}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            GitHub: {plugin.githubOwner}/{plugin.githubRepo}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {status === 'not-installed' ? (
                                            <button
                                                onClick={() => handleInstall(plugin)}
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
                                                <button
                                                    onClick={() => handleUpdate(plugin)}
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
                                                <button
                                                    onClick={() => openDowngradeDialog(plugin)}
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
    );
};
