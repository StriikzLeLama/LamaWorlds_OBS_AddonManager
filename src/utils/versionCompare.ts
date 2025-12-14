import semver from 'semver';

/**
 * Compare deux versions et retourne le statut
 */
export function compareVersions(installed: string, latest: string): 'up-to-date' | 'update-available' {
    if (installed === 'Unknown' || !installed) {
        // Si version inconnue, on considère qu'une mise à jour est disponible
        return 'update-available';
    }

    try {
        // Nettoyer les versions (enlever les préfixes "v", espaces, etc.)
        const cleanInstalled = semver.clean(installed) || installed.replace(/^v/i, '').trim();
        const cleanLatest = semver.clean(latest) || latest.replace(/^v/i, '').trim();

        // Essayer de parser avec semver
        const installedVersion = semver.valid(cleanInstalled) || semver.coerce(cleanInstalled);
        const latestVersion = semver.valid(cleanLatest) || semver.coerce(cleanLatest);

        if (!installedVersion || !latestVersion) {
            // Fallback: comparaison simple
            return cleanInstalled === cleanLatest ? 'up-to-date' : 'update-available';
        }

        const comparison = semver.compare(installedVersion, latestVersion);
        return comparison < 0 ? 'update-available' : 'up-to-date';
    } catch (error) {
        // En cas d'erreur, comparaison simple
        return installed.toLowerCase() === latest.toLowerCase() ? 'up-to-date' : 'update-available';
    }
}

/**
 * Formate une version pour l'affichage
 */
export function formatVersion(version: string): string {
    if (!version || version === 'Unknown') {
        return 'Unknown';
    }
    return version.replace(/^v/i, '').trim();
}

