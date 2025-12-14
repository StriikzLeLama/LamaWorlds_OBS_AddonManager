/**
 * Constantes de l'application
 */

export const APP_CONFIG = {
    NAME: 'Lama Worlds OBS Addon Manager',
    VERSION: '1.0.0',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    REQUEST_DELAY: 500, // ms entre les requêtes
    MAX_CONCURRENT_REQUESTS: 2,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    VERSION_LOAD_DELAY: 500, // ms entre chargement des versions
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
    MAX_BACKUPS: 10, // Garder les 10 dernières sauvegardes
} as const;

export const UI_CONFIG = {
    TOAST_DURATION: 3000, // ms
    ANIMATION_DURATION: 300, // ms
    DEBOUNCE_DELAY: 300, // ms pour la recherche
} as const;

