/**
 * Types pour Electron
 */

import type { PluginInfo } from '../managers/PluginManager';

export interface ElectronStore {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    has: (key: string) => boolean;
    delete: (key: string) => void;
}

export interface PluginOperationResult {
    success: boolean;
    backupPath: string;
}

export interface PluginOperationError extends Error {
    code?: string;
    response?: {
        status?: number;
    };
}

