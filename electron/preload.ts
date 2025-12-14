import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    // OBS Path Management
    getObsPath: () => ipcRenderer.invoke('obs:get-path'),
    selectObsManual: () => ipcRenderer.invoke('obs:select-manual'),
    validateObsPath: (path: string) => ipcRenderer.invoke('obs:validate', path),
    resetObsPath: () => ipcRenderer.invoke('obs:reset-path'),
    isObsRunning: () => ipcRenderer.invoke('obs:is-running'),

    // Plugin Management
    scanPlugins: (obsPath: string) => ipcRenderer.invoke('plugins:scan', obsPath),
    
    // Plugin Catalog
    getCatalogPlugins: () => ipcRenderer.invoke('plugins:catalog:all'),
    findCatalogPlugin: (id: string) => ipcRenderer.invoke('plugins:catalog:find', id),

    // Plugin Operations
    installPlugin: (pluginId: string, obsPath: string, releaseTag?: string) => 
        ipcRenderer.invoke('plugins:install', pluginId, obsPath, releaseTag),
    updatePlugin: (pluginId: string, obsPath: string) => 
        ipcRenderer.invoke('plugins:update', pluginId, obsPath),
    downgradePlugin: (pluginId: string, releaseTag: string, obsPath: string) => 
        ipcRenderer.invoke('plugins:downgrade', pluginId, releaseTag, obsPath),
    removePlugin: (pluginInfo: any, obsPath: string) => 
        ipcRenderer.invoke('plugins:remove', pluginInfo, obsPath),

    // GitHub Releases
    getLatestRelease: (pluginId: string) => 
        ipcRenderer.invoke('plugins:releases:latest', pluginId),
    getAllReleases: (pluginId: string) => 
        ipcRenderer.invoke('plugins:releases:all', pluginId)
})
