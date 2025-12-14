import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { OBS_PATHS } from '../constants';
import { logger } from '../utils/logger';

const execAsync = util.promisify(exec);

export class ObsDetector {
    /**
     * Attempts to detect the OBS Studio installation path.
     * Priority:
     * 1. Windows Registry (HKLM\SOFTWARE\OBS Studio)
     * 2. Default installation paths
     */
    async detect(): Promise<string | null> {
        logger.info('Starting OBS detection...');

        // 1. Registry Check
        const registryPath = await this.checkRegistry();
        if (registryPath) {
            logger.info(`Registry detection found path: ${registryPath}`);
            if (this.isValid(registryPath)) {
                return registryPath;
            } else {
                logger.debug('Registry path invalid.');
            }
        }

        // 2. Default Paths Check
        const defaultPaths = [
            OBS_PATHS.DEFAULT_X64,
            OBS_PATHS.DEFAULT_X86
        ];

        for (const p of defaultPaths) {
            if (this.isValid(p)) {
                logger.info(`Default path found: ${p}`);
                return p;
            }
        }

        return null;
    }

    /**
     * Queries Windows Registry for OBS Studio path.
     */
    private async checkRegistry(): Promise<string | null> {
        const keys = OBS_PATHS.REGISTRY_KEYS;

        for (const key of keys) {
            try {
                // Try to get specific values that might contain the path
                const valueNames = ['', 'InstallPath', 'Path', 'InstallLocation'];
                
                for (const valueName of valueNames) {
                    try {
                        const query = valueName 
                            ? `reg query "${key}" /v "${valueName}"`
                            : `reg query "${key}" /ve`;
                        
                        const { stdout } = await execAsync(query);
                        
                        // Parse output: "    InstallPath    REG_SZ    C:\Program Files\obs-studio"
                        const match = stdout.match(/REG_SZ\s+(.+)/);
                        if (match) {
                            const candidatePath = match[1].trim();
                            if (this.isValid(candidatePath)) {
                                return candidatePath;
                            }
                        }
                    } catch (err) {
                        // Try next value
                        continue;
                    }
                }

                // Fallback: try to parse all values
                const { stdout } = await execAsync(`reg query "${key}"`);
                const lines = stdout.split('\n');
                for (const line of lines) {
                    const match = line.match(/REG_SZ\s+(.+)/);
                    if (match) {
                        const candidatePath = match[1].trim();
                        // Check if it looks like a path
                        if (candidatePath.match(/^[A-Z]:\\/i) && this.isValid(candidatePath)) {
                            return candidatePath;
                        }
                    }
                }
            } catch (error) {
                // Ignore registry errors (key not found)
            }
        }
        return null;
    }

    /**
     * Validates if the given path contains the critical OBS files.
     * Checks for:
     * - bin/64bit/obs64.exe (or bin/64bit/obs.exe)
     * - obs-plugins folder
     * - data/obs-studio folder (optional but preferred)
     */
    public isValid(obsPath: string): boolean {
        if (!obsPath) return false;

        // Normalize path separators
        let normalizedPath = path.normalize(obsPath);

        // If user selected a parent folder, try to find obs-studio subfolder
        if (!fs.existsSync(path.join(normalizedPath, 'bin', '64bit', 'obs64.exe'))) {
            const obsSubfolder = path.join(normalizedPath, 'obs-studio');
            if (fs.existsSync(obsSubfolder)) {
                normalizedPath = obsSubfolder;
            }
        }

        const exePath64 = path.join(normalizedPath, 'bin', '64bit', 'obs64.exe');
        const exePath32 = path.join(normalizedPath, 'bin', '64bit', 'obs.exe');
        const pluginsPath = path.join(normalizedPath, 'obs-plugins');

        const hasExe = fs.existsSync(exePath64) || fs.existsSync(exePath32);
        const hasPlugins = fs.existsSync(pluginsPath);

        return hasExe && hasPlugins;
    }

    /**
     * Normalizes the OBS path (handles parent folder selection)
     */
    public normalizePath(obsPath: string): string {
        if (!obsPath) return obsPath;

        let normalizedPath = path.normalize(obsPath);

        // If user selected a parent folder, try to find obs-studio subfolder
        if (!fs.existsSync(path.join(normalizedPath, 'bin', '64bit', 'obs64.exe'))) {
            const obsSubfolder = path.join(normalizedPath, 'obs-studio');
            if (fs.existsSync(obsSubfolder)) {
                normalizedPath = obsSubfolder;
            }
        }

        return normalizedPath;
    }
}
