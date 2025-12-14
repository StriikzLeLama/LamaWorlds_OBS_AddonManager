/**
 * Constantes pour Electron
 */

export const APP_CONFIG = {
    NAME: 'Lama Worlds OBS Addon Manager',
    VERSION: '1.0.0',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    REQUEST_DELAY: 500, // ms entre les requêtes
    MAX_CONCURRENT_REQUESTS: 2,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    GITHUB_API_TIMEOUT: 10000, // 10 secondes
} as const;

export const OBS_PATHS = {
    DEFAULT_X64: 'C:\\Program Files\\obs-studio',
    DEFAULT_X86: 'C:\\Program Files (x86)\\obs-studio',
    REGISTRY_KEYS: [
        'HKLM\\SOFTWARE\\OBS Studio',
        'HKLM\\SOFTWARE\\WOW6432Node\\OBS Studio'
    ],
} as const;

export const PLUGIN_PATHS = {
    SYSTEM_PLUGINS: 'obs-plugins',
    USER_PLUGINS: 'AppData\\Roaming\\obs-studio\\plugins',
    PLUGIN_CONFIG: 'AppData\\Roaming\\obs-studio\\plugin_config',
} as const;

export const BACKUP_CONFIG = {
    DIR_NAME: 'LamaWorlds_OBS_Backups',
    MAX_BACKUPS: 10,
} as const;

