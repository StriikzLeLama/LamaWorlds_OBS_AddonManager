import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import { BACKUP_CONFIG } from '../constants';
import { logger } from '../utils/logger';

const execAsync = util.promisify(exec);

export class BackupManager {
    private backupDir: string;

    constructor() {
        // Store backups in user home directory
        this.backupDir = path.join(os.homedir(), BACKUP_CONFIG.DIR_NAME);
        this.ensureBackupDir();
    }

    private ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Creates a timestamped ZIP backup of OBS plugin folders.
     * Backs up both system and user plugin folders.
     */
    async createBackup(obsPath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFileName = `obs-plugins-backup-${timestamp}.zip`;
        const backupPath = path.join(this.backupDir, backupFileName);

        const systemPluginsPath = path.join(obsPath, 'obs-plugins');
        const userPluginsPath = path.join(os.homedir(), 'AppData', 'Roaming', 'obs-studio', 'plugins');

        const tempDir = path.join(os.tmpdir(), `obs-backup-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });

        try {
            // Copy system plugins if they exist
            if (fs.existsSync(systemPluginsPath)) {
                const systemBackupPath = path.join(tempDir, 'system-plugins');
                await this.copyDirectory(systemPluginsPath, systemBackupPath);
            }

            // Copy user plugins if they exist
            if (fs.existsSync(userPluginsPath)) {
                const userBackupPath = path.join(tempDir, 'user-plugins');
                await this.copyDirectory(userPluginsPath, userBackupPath);
            }

            // Create ZIP using PowerShell on Windows (built-in)
            if (process.platform === 'win32') {
                const zipCommand = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${backupPath}" -Force`;
                await execAsync(`powershell -Command "${zipCommand}"`);
            } else {
                // Linux/Mac: use zip command if available
                const zipCommand = `cd "${tempDir}" && zip -r "${backupPath}" .`;
                await execAsync(zipCommand);
            }

            // Cleanup temp directory
            await this.deleteDirectory(tempDir);

            logger.info(`Backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            // Cleanup on error
            if (fs.existsSync(tempDir)) {
                await this.deleteDirectory(tempDir);
            }
            throw new Error(`Failed to create backup: ${error}`);
        }
    }

    private async copyDirectory(src: string, dest: string): Promise<void> {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = await fs.promises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                await fs.promises.copyFile(srcPath, destPath);
            }
        }
    }

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

    /**
     * Lists all available backups
     */
    listBackups(): string[] {
        if (!fs.existsSync(this.backupDir)) {
            return [];
        }

        return fs.readdirSync(this.backupDir)
            .filter(file => file.endsWith('.zip'))
            .map(file => path.join(this.backupDir, file))
            .sort()
            .reverse(); // Most recent first
    }
}

