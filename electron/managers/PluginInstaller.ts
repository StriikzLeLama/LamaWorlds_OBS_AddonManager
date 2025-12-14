import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as yauzl from 'yauzl';
import os from 'os';
import { CatalogPlugin } from './PluginCatalog';
import { RequestManager } from './RequestManager';

export interface GitHubRelease {
    tag_name: string;
    name: string;
    published_at: string;
    assets: GitHubAsset[];
}

export interface GitHubAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

export class PluginInstaller {
    private requestManager: RequestManager;

    constructor() {
        this.requestManager = new RequestManager();
    }

    /**
     * Fetches latest release from GitHub with retry and cache
     */
    async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
        const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
        return await this.requestManager.get<GitHubRelease>(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LamaWorlds-OBS-AddonManager'
            },
            timeout: 10000 // 10 secondes timeout
        });
    }

    /**
     * Fetches a specific release by tag with retry and cache
     */
    async getReleaseByTag(owner: string, repo: string, tag: string): Promise<GitHubRelease> {
        const url = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
        return await this.requestManager.get<GitHubRelease>(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LamaWorlds-OBS-AddonManager'
            },
            timeout: 10000
        });
    }

    /**
     * Lists all releases with retry and cache
     */
    async getAllReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
        const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
        return await this.requestManager.get<GitHubRelease[]>(url, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LamaWorlds-OBS-AddonManager'
            },
            timeout: 10000
        });
    }

    /**
     * Finds the Windows ZIP asset from a release
     */
    findWindowsAsset(release: GitHubRelease, pattern?: string): GitHubAsset | null {
        const searchPattern = pattern || 'Windows';
        const lowerPattern = searchPattern.toLowerCase();

        // First, try exact pattern match
        let asset = release.assets.find(a => 
            a.name.toLowerCase().includes(lowerPattern) && 
            a.name.toLowerCase().endsWith('.zip')
        );

        // Fallback: look for any Windows-related ZIP
        if (!asset) {
            asset = release.assets.find(a => 
                (a.name.toLowerCase().includes('win') || 
                 a.name.toLowerCase().includes('windows') ||
                 a.name.toLowerCase().includes('x64')) &&
                a.name.toLowerCase().endsWith('.zip')
            );
        }

        // Last resort: any ZIP file
        if (!asset && release.assets.length > 0) {
            asset = release.assets.find(a => a.name.toLowerCase().endsWith('.zip'));
        }

        return asset || null;
    }

    /**
     * Downloads a file from URL
     */
    async downloadFile(url: string, destPath: string, onProgress?: (progress: number) => void): Promise<void> {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'LamaWorlds-OBS-AddonManager'
            }
        });

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        return new Promise((resolve, reject) => {
            const writer = fs.createWriteStream(destPath);
            
            response.data.on('data', (chunk: Buffer) => {
                downloadedSize += chunk.length;
                if (onProgress && totalSize > 0) {
                    onProgress((downloadedSize / totalSize) * 100);
                }
            });

            response.data.pipe(writer);

            writer.on('finish', resolve);
            writer.on('error', reject);
            response.data.on('error', reject);
        });
    }

    /**
     * Extracts ZIP file to destination
     */
    async extractZip(zipPath: string, destDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!zipfile) {
                    reject(new Error('Failed to open ZIP file'));
                    return;
                }

                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    if (/\/$/.test(entry.fileName)) {
                        // Directory entry
                        const dirPath = path.join(destDir, entry.fileName);
                        if (!fs.existsSync(dirPath)) {
                            fs.mkdirSync(dirPath, { recursive: true });
                        }
                        zipfile.readEntry();
                    } else {
                        // File entry
                        zipfile.openReadStream(entry, (err, readStream) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            if (!readStream) {
                                reject(new Error('Failed to open read stream'));
                                return;
                            }

                            const filePath = path.join(destDir, entry.fileName);
                            const dirPath = path.dirname(filePath);
                            
                            if (!fs.existsSync(dirPath)) {
                                fs.mkdirSync(dirPath, { recursive: true });
                            }

                            const writeStream = fs.createWriteStream(filePath);
                            readStream.pipe(writeStream);
                            
                            writeStream.on('close', () => {
                                zipfile.readEntry();
                            });
                            writeStream.on('error', reject);
                        });
                    }
                });

                zipfile.on('end', () => {
                    resolve();
                });

                zipfile.on('error', reject);
            });
        });
    }

    /**
     * Installs a plugin from GitHub release
     */
    async installPlugin(
        plugin: CatalogPlugin,
        obsPath: string,
        releaseTag?: string,
        onProgress?: (stage: string, progress: number) => void
    ): Promise<void> {
        // 1. Get release
        onProgress?.('Fetching release...', 0);
        const release = releaseTag
            ? await this.getReleaseByTag(plugin.githubOwner, plugin.githubRepo, releaseTag)
            : await this.getLatestRelease(plugin.githubOwner, plugin.githubRepo);

        // 2. Find Windows asset
        onProgress?.('Finding Windows package...', 10);
        const asset = this.findWindowsAsset(release, plugin.windowsAssetPattern);
        if (!asset) {
            throw new Error(`No Windows ZIP asset found in release ${release.tag_name}`);
        }

        // 3. Download ZIP
        onProgress?.('Downloading...', 20);
        const tempDir = path.join(os.tmpdir(), `obs-plugin-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
        const zipPath = path.join(tempDir, asset.name);

        try {
            await this.downloadFile(asset.browser_download_url, zipPath, (progress) => {
                onProgress?.('Downloading...', 20 + (progress * 0.5));
            });

            // 4. Extract ZIP
            onProgress?.('Extracting...', 70);
            const extractDir = path.join(tempDir, 'extracted');
            fs.mkdirSync(extractDir, { recursive: true });
            await this.extractZip(zipPath, extractDir);

            // 5. Find obs-plugins and data folders in extracted content
            onProgress?.('Installing...', 80);
            const extractedContents = fs.readdirSync(extractDir);
            
            // Handle nested folder structure (common in GitHub releases)
            let sourceDir = extractDir;
            if (extractedContents.length === 1) {
                const firstItem = path.join(extractDir, extractedContents[0]);
                if (fs.statSync(firstItem).isDirectory()) {
                    sourceDir = firstItem;
                }
            }

            // Copy obs-plugins folder
            const sourcePluginsPath = path.join(sourceDir, 'obs-plugins');
            if (fs.existsSync(sourcePluginsPath)) {
                await this.mergeDirectory(sourcePluginsPath, path.join(obsPath, 'obs-plugins'));
            }

            // Copy data folder (for plugin data/config)
            const sourceDataPath = path.join(sourceDir, 'data');
            if (fs.existsSync(sourceDataPath)) {
                const obsDataPath = path.join(obsPath, 'data', 'obs-studio');
                if (!fs.existsSync(obsDataPath)) {
                    fs.mkdirSync(obsDataPath, { recursive: true });
                }
                await this.mergeDirectory(sourceDataPath, obsDataPath);
            }

            // Also check for user plugins location
            const userPluginsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'obs-studio', 'plugins');
            const sourceUserPluginsPath = path.join(sourceDir, 'plugins');
            if (fs.existsSync(sourceUserPluginsPath)) {
                if (!fs.existsSync(userPluginsPath)) {
                    fs.mkdirSync(userPluginsPath, { recursive: true });
                }
                await this.mergeDirectory(sourceUserPluginsPath, userPluginsPath);
            }

            onProgress?.('Complete', 100);

            // Cleanup
            await this.deleteDirectory(tempDir);
        } catch (error) {
            // Cleanup on error
            if (fs.existsSync(tempDir)) {
                await this.deleteDirectory(tempDir);
            }
            throw error;
        }
    }

    /**
     * Merges source directory into destination (copies files, overwrites existing)
     */
    private async mergeDirectory(src: string, dest: string): Promise<void> {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = await fs.promises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.mergeDirectory(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
            }
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

