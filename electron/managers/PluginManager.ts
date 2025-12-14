import fs from 'fs';
import path from 'path';
import os from 'os';
import { PLUGIN_PATHS } from '../constants';
import { logger } from '../utils/logger';

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

export class PluginManager {
    /**
     * Scans both system and user plugin directories.
     * System: <OBS_PATH>/obs-plugins/
     * User: %APPDATA%/obs-studio/plugins/
     */
    async scanPlugins(obsPath: string): Promise<PluginInfo[]> {
        const plugins: PluginInfo[] = [];

        // Scan system plugins
        const systemPluginsPath = path.join(obsPath, PLUGIN_PATHS.SYSTEM_PLUGINS);
        if (fs.existsSync(systemPluginsPath)) {
            const systemPlugins = await this.scanPluginDirectory(systemPluginsPath, 'system');
            plugins.push(...systemPlugins);
        }

        // Scan user plugins
        const userPluginsPath = path.join(os.homedir(), PLUGIN_PATHS.USER_PLUGINS);
        if (fs.existsSync(userPluginsPath)) {
            const userPlugins = await this.scanPluginDirectory(userPluginsPath, 'user');
            plugins.push(...userPlugins);
        }

        return plugins;
    }

    /**
     * Scans a plugin directory for installed plugins
     */
    private async scanPluginDirectory(pluginsDir: string, scope: 'system' | 'user'): Promise<PluginInfo[]> {
        const plugins: PluginInfo[] = [];

        try {
            // Check 64bit subdirectory (system plugins)
            const bit64Path = path.join(pluginsDir, '64bit');
            if (fs.existsSync(bit64Path)) {
                const dlls = await this.findDlls(bit64Path);
                for (const dll of dlls) {
                    const plugin = await this.analyzePlugin(dll, scope, pluginsDir);
                    if (plugin) {
                        plugins.push(plugin);
                    }
                }
            } else {
                // User plugins might be directly in plugins folder
                const dlls = await this.findDlls(pluginsDir);
                for (const dll of dlls) {
                    const plugin = await this.analyzePlugin(dll, scope, pluginsDir);
                    if (plugin) {
                        plugins.push(plugin);
                    }
                }
            }

            // Also check for plugin folders (some plugins install as folders)
            const entries = await fs.promises.readdir(pluginsDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name !== '64bit') {
                    const folderPath = path.join(pluginsDir, entry.name);
                    const folderDlls = await this.findDlls(folderPath);
                    for (const dll of folderDlls) {
                        const plugin = await this.analyzePlugin(dll, scope, pluginsDir, entry.name);
                        if (plugin) {
                            plugins.push(plugin);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`Failed to scan ${scope} plugins`, error);
        }

        return plugins;
    }

    /**
     * Finds all DLL files in a directory recursively
     */
    private async findDlls(dir: string): Promise<string[]> {
        const dlls: string[] = [];
        
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    const subDlls = await this.findDlls(fullPath);
                    dlls.push(...subDlls);
                } else if (entry.name.endsWith('.dll') || entry.name.endsWith('.so')) {
                    dlls.push(fullPath);
                }
            }
        } catch (error) {
            // Ignore permission errors
        }

        return dlls;
    }

    /**
     * Analyzes a plugin DLL and extracts metadata
     */
    private async analyzePlugin(
        dllPath: string,
        scope: 'system' | 'user',
        pluginsBaseDir: string,
        folderName?: string
    ): Promise<PluginInfo | null> {
        const dllName = path.basename(dllPath);
        const baseName = dllName.replace(/\.(dll|so)$/, '');
        
        // Determine folder name
        let pluginFolderName = folderName || baseName;
        const dllDir = path.dirname(dllPath);
        if (!folderName && dllDir !== pluginsBaseDir && dllDir !== path.join(pluginsBaseDir, '64bit')) {
            pluginFolderName = path.basename(dllDir);
        }

        // Try to detect version
        const version = await this.detectVersion(dllDir, pluginFolderName);

        // Find data folder
        let dataPath: string | undefined;
        if (scope === 'system') {
            const systemDataPath = path.join(pluginsBaseDir, '..', 'data', 'obs-studio', 'plugin_config', pluginFolderName);
            if (fs.existsSync(systemDataPath)) {
                dataPath = systemDataPath;
            }
        } else {
            const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'obs-studio', 'plugin_config', pluginFolderName);
            if (fs.existsSync(userDataPath)) {
                dataPath = userDataPath;
            }
        }

        return {
            id: pluginFolderName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: baseName,
            displayName: this.formatPluginName(pluginFolderName),
            version: version,
            scope: scope,
            dllPath: dllPath,
            dataPath: dataPath,
            folderName: pluginFolderName
        };
    }

    /**
     * Attempts to detect plugin version from various sources
     */
    private async detectVersion(pluginDir: string, folderName: string): Promise<string> {
        // Try manifest.json
        const manifestPath = path.join(pluginDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            try {
                const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
                if (manifest.version) return manifest.version;
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Try plugin.json
        const pluginJsonPath = path.join(pluginDir, 'plugin.json');
        if (fs.existsSync(pluginJsonPath)) {
            try {
                const pluginJson = JSON.parse(await fs.promises.readFile(pluginJsonPath, 'utf-8'));
                if (pluginJson.version) return pluginJson.version;
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Try version.txt
        const versionTxtPath = path.join(pluginDir, 'version.txt');
        if (fs.existsSync(versionTxtPath)) {
            try {
                const version = (await fs.promises.readFile(versionTxtPath, 'utf-8')).trim();
                if (version) return version;
            } catch (e) {
                // Ignore read errors
            }
        }

        // Try README for version pattern
        const readmePath = path.join(pluginDir, 'README.md');
        if (fs.existsSync(readmePath)) {
            try {
                const readme = await fs.promises.readFile(readmePath, 'utf-8');
                const versionMatch = readme.match(/version[:\s]+([\d.]+)/i);
                if (versionMatch) return versionMatch[1];
            } catch (e) {
                // Ignore read errors
            }
        }

        return 'Unknown';
    }

    /**
     * Formats plugin name for display
     */
    private formatPluginName(name: string): string {
        return name
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Removes a plugin (DLL and data folder)
     */
    async removePlugin(plugin: PluginInfo, obsPath: string): Promise<void> {
        // Remove DLL
        if (fs.existsSync(plugin.dllPath)) {
            await fs.promises.unlink(plugin.dllPath);
        }

        // Remove plugin folder if it exists
        const pluginFolder = path.dirname(plugin.dllPath);
        if (pluginFolder !== path.join(obsPath, 'obs-plugins', '64bit') && 
            pluginFolder !== path.join(os.homedir(), 'AppData', 'Roaming', 'obs-studio', 'plugins')) {
            try {
                await this.deleteDirectory(pluginFolder);
            } catch (e) {
                // Ignore if folder contains other files
            }
        }

        // Remove data folder
        if (plugin.dataPath && fs.existsSync(plugin.dataPath)) {
            await this.deleteDirectory(plugin.dataPath);
        }
    }

    /**
     * Deletes a directory recursively
     */
    private async deleteDirectory(dir: string): Promise<void> {
        if (!fs.existsSync(dir)) return;

        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await this.deleteDirectory(entryPath);
            } else {
                await fs.promises.unlink(entryPath);
            }
        }

        await fs.promises.rmdir(dir);
    }
}
