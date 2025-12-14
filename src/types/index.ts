/**
 * Types partagés pour l'application
 */

import type { PluginInfo, CatalogPlugin } from '../electron.d';

export interface GitHubRelease {
    tag: string;
    name: string;
    publishedAt: string;
}

export interface ReleaseInfo {
    release: GitHubRelease;
    asset: {
        name: string;
        size: number;
    } | null;
}

export interface DowngradeDialogState {
    pluginId: string;
    releases: GitHubRelease[];
}

export interface ProgressState {
    pluginId: string;
    progress: number;
    stage: string;
}

export interface UpdateAllProgress {
    current: number;
    total: number;
}

export type FilterStatus = 'all' | 'installed' | 'update-available' | 'not-installed';
export type FilterScope = 'all' | 'system' | 'user';
export type PluginStatus = 'up-to-date' | 'update-available' | 'not-installed';

export interface PluginWithCatalog {
    installed?: PluginInfo;
    catalog?: CatalogPlugin;
}

