import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { ObsDetector } from './managers/ObsDetector'
import { ObsRunningDetector } from './managers/ObsRunningDetector'
import { PluginManager } from './managers/PluginManager'
import { PluginInstaller } from './managers/PluginInstaller'
import { BackupManager } from './managers/BackupManager'
import { PluginCatalog, CatalogPlugin } from './managers/PluginCatalog'
import { logger } from './utils/logger'
import type { ElectronStore, PluginOperationError } from './types'

// Store reference
let store: ElectronStore | null = null;

// Initialize Store (Dynamic import for ESM compatibility)
async function initStore() {
    const { default: Store } = await import('electron-store');
    store = new Store();
}

const obsDetector = new ObsDetector();
const obsRunningDetector = new ObsRunningDetector();
const pluginManager = new PluginManager();
const pluginInstaller = new PluginInstaller();
const backupManager = new BackupManager();

function createWindow() {
    logger.info('Creating window...');
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        show: false, // Don't show until ready
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#0a0e27',
            symbolColor: '#00d4ff'
        },
        backgroundColor: '#0a0e27',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // Required for preload scripts
            webSecurity: true
        }
    })

    // Development: Load localhost. Production: Load index.html
    const isDev = !app.isPackaged;

    if (isDev) {
        logger.info('Loading development URL: http://localhost:5173');
        win.loadURL('http://localhost:5173')
            .then(() => {
                logger.info('URL loaded successfully');
                win.show();
                win.webContents.openDevTools();
            })
            .catch((err) => {
                logger.error('Failed to load URL', err);
                win.show(); // Show window even if load fails
            });
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
            .then(() => {
                win.show();
            })
            .catch((err) => {
                logger.error('Failed to load file', err);
                win.show();
            });
    }

    win.on('closed', () => {
        logger.info('Window closed');
    });

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logger.error('Failed to load', new Error(`${errorCode}: ${errorDescription}`));
    });

    return win;
}

app.whenReady().then(async () => {
    logger.info('App ready, initializing...');
    try {
        await initStore();
        logger.info('Store initialized');

        setupIpcHandlers();
        logger.info('IPC handlers setup');

        createWindow();
        logger.info('Window created');

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow()
            }
        })
    } catch (error) {
        logger.error('Error during initialization', error);
    }
})

app.on('ready', () => {
    logger.info('App ready event fired');
});

app.on('window-all-closed', () => {
    logger.info('All windows closed');
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('will-quit', () => {
    logger.info('App will quit');
});

function setupIpcHandlers() {
    // OBS Path Management
    ipcMain.handle('obs:get-path', async () => {
        if (store && store.has('obsPath')) {
            const storedPath = store.get('obsPath');
            const normalizedPath = obsDetector.normalizePath(storedPath);
            if (obsDetector.isValid(normalizedPath)) {
                return normalizedPath;
            }
        }

        const detectedPath = await obsDetector.detect();
        if (detectedPath) {
            const normalizedPath = obsDetector.normalizePath(detectedPath);
            if (store) store.set('obsPath', normalizedPath);
            return normalizedPath;
        }

        return null;
    });

    ipcMain.handle('obs:select-manual', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select OBS Studio Installation Folder'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const selectedPath = result.filePaths[0];
            const normalizedPath = obsDetector.normalizePath(selectedPath);
            if (obsDetector.isValid(normalizedPath)) {
                if (store) store.set('obsPath', normalizedPath);
                return normalizedPath;
            } else {
                return null;
            }
        }
        return undefined;
    });

    ipcMain.handle('obs:validate', async (_, p: string) => {
        const normalizedPath = obsDetector.normalizePath(p);
        return obsDetector.isValid(normalizedPath);
    });

    ipcMain.handle('obs:reset-path', async () => {
        if (store) store.delete('obsPath');
    });

    // OBS Running Check
    ipcMain.handle('obs:is-running', async () => {
        return await obsRunningDetector.isRunning();
    });

    // Plugin Management
    ipcMain.handle('plugins:scan', async (_, obsPath: string) => {
        const normalizedPath = obsDetector.normalizePath(obsPath);
        return await pluginManager.scanPlugins(normalizedPath);
    });

    ipcMain.handle('plugins:catalog:all', async () => {
        return PluginCatalog.getAll();
    });

    ipcMain.handle('plugins:catalog:find', async (_, id: string) => {
        return PluginCatalog.findById(id);
    });

    // Plugin Installation
    ipcMain.handle('plugins:install', async (_, pluginId: string, obsPath: string, releaseTag?: string) => {
        // Check if OBS is running
        if (await obsRunningDetector.isRunning()) {
            throw new Error('OBS Studio is currently running. Please close it before installing plugins.');
        }

        const plugin = PluginCatalog.findById(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found in catalog`);
        }

        const normalizedPath = obsDetector.normalizePath(obsPath);
        if (!obsDetector.isValid(normalizedPath)) {
            throw new Error('Invalid OBS path');
        }

        // Create backup
        const backupPath = await backupManager.createBackup(normalizedPath);

        try {
            // Install plugin
            await pluginInstaller.installPlugin(plugin, normalizedPath, releaseTag);
            return { success: true, backupPath };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Plugin installation failed', error);
            throw new Error(`Installation failed: ${errorMessage}`);
        }
    });

    // Plugin Update
    ipcMain.handle('plugins:update', async (_, pluginId: string, obsPath: string) => {
        if (await obsRunningDetector.isRunning()) {
            throw new Error('OBS Studio is currently running. Please close it before updating plugins.');
        }

        const plugin = PluginCatalog.findById(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found in catalog`);
        }

        const normalizedPath = obsDetector.normalizePath(obsPath);
        if (!obsDetector.isValid(normalizedPath)) {
            throw new Error('Invalid OBS path');
        }

        const backupPath = await backupManager.createBackup(normalizedPath);

        try {
            await pluginInstaller.installPlugin(plugin, normalizedPath);
            return { success: true, backupPath };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Plugin update failed', error);
            throw new Error(`Update failed: ${errorMessage}`);
        }
    });

    // Plugin Downgrade
    ipcMain.handle('plugins:downgrade', async (_, pluginId: string, releaseTag: string, obsPath: string) => {
        if (await obsRunningDetector.isRunning()) {
            throw new Error('OBS Studio is currently running. Please close it before downgrading plugins.');
        }

        const plugin = PluginCatalog.findById(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found in catalog`);
        }

        const normalizedPath = obsDetector.normalizePath(obsPath);
        if (!obsDetector.isValid(normalizedPath)) {
            throw new Error('Invalid OBS path');
        }

        const backupPath = await backupManager.createBackup(normalizedPath);

        try {
            await pluginInstaller.installPlugin(plugin, normalizedPath, releaseTag);
            return { success: true, backupPath };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Plugin downgrade failed', error);
            throw new Error(`Downgrade failed: ${errorMessage}`);
        }
    });

    // Plugin Remove
    ipcMain.handle('plugins:remove', async (_, pluginInfo: PluginInfo, obsPath: string) => {
        if (await obsRunningDetector.isRunning()) {
            throw new Error('OBS Studio is currently running. Please close it before removing plugins.');
        }

        const normalizedPath = obsDetector.normalizePath(obsPath);
        if (!obsDetector.isValid(normalizedPath)) {
            throw new Error('Invalid OBS path');
        }

        const backupPath = await backupManager.createBackup(normalizedPath);

        try {
            await pluginManager.removePlugin(pluginInfo, normalizedPath);
            return { success: true, backupPath };
        } catch (error: any) {
            throw new Error(`Removal failed: ${error.message}`);
        }
    });

    // GitHub Releases
    ipcMain.handle('plugins:releases:latest', async (_, pluginId: string) => {
        const plugin = PluginCatalog.findById(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found in catalog`);
        }

        try {
            const release = await pluginInstaller.getLatestRelease(plugin.githubOwner, plugin.githubRepo);
            const asset = pluginInstaller.findWindowsAsset(release, plugin.windowsAssetPattern);
            return {
                release: {
                    tag: release.tag_name,
                    name: release.name,
                    publishedAt: release.published_at
                },
                asset: asset ? {
                    name: asset.name,
                    size: asset.size
                } : null
            };
        } catch (error: any) {
            // Améliorer les messages d'erreur réseau
            if (error.code === 'ENOBUFS' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                throw new Error(`Network error: Unable to connect to GitHub. Please check your internet connection and try again.`);
            }
            if (error.response?.status === 404) {
                throw new Error(`Plugin repository not found or has no releases.`);
            }
            if (error.response?.status === 403) {
                throw new Error(`GitHub API rate limit exceeded. Please wait a few minutes and try again.`);
            }
            throw new Error(`Failed to fetch release: ${error.message || 'Unknown error'}`);
        }
    });

    ipcMain.handle('plugins:releases:all', async (_, pluginId: string) => {
        const plugin = PluginCatalog.findById(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found in catalog`);
        }

        try {
            const releases = await pluginInstaller.getAllReleases(plugin.githubOwner, plugin.githubRepo);
            return releases.map(release => ({
                tag: release.tag_name,
                name: release.name,
                publishedAt: release.published_at
            }));
        } catch (error: any) {
            // Améliorer les messages d'erreur réseau
            if (error.code === 'ENOBUFS' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                throw new Error(`Network error: Unable to connect to GitHub. Please check your internet connection and try again.`);
            }
            if (error.response?.status === 404) {
                throw new Error(`Plugin repository not found or has no releases.`);
            }
            if (error.response?.status === 403) {
                throw new Error(`GitHub API rate limit exceeded. Please wait a few minutes and try again.`);
            }
            throw new Error(`Failed to fetch releases: ${error.message || 'Unknown error'}`);
        }
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
