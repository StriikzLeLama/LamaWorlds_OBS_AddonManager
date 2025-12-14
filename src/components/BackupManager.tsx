import React, { useEffect, useState } from 'react';
import { useToast } from './Toast';

interface Backup {
    path: string;
    name: string;
    date: Date;
    size?: number;
}

export const BackupManager: React.FC = () => {
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [showManager, setShowManager] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (showManager) {
            loadBackups();
        }
    }, [showManager]);

    const loadBackups = async () => {
        setLoading(true);
        try {
            // Note: Cette fonctionnalité nécessiterait un IPC handler
            // Pour l'instant, on simule
            const backupList: Backup[] = [];
            setBackups(backupList);
        } catch (error: any) {
            toast.error('Failed to load backups');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    if (!showManager) {
        return (
            <button
                onClick={() => setShowManager(true)}
                className="btn btn-secondary text-xs"
            >
                📦 Backups
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="glass-panel p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Backup Manager</h3>
                    <button
                        onClick={() => setShowManager(false)}
                        className="btn btn-secondary text-xs"
                    >
                        ✕ Close
                    </button>
                </div>

                {loading ? (
                    <div className="text-center p-8">
                        <div className="spinner mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading backups...</p>
                    </div>
                ) : backups.length === 0 ? (
                    <div className="text-center p-8">
                        <p className="text-gray-400">No backups found</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Backups are created automatically before plugin operations
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {backups.map((backup) => (
                            <div
                                key={backup.path}
                                className="glass-panel p-4 flex items-center justify-between hover:glow transition-all"
                            >
                                <div className="flex-1">
                                    <div className="font-semibold text-white mb-1">{backup.name}</div>
                                    <div className="text-xs text-gray-400">
                                        {formatDate(backup.date)} • {formatSize(backup.size)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 font-mono">
                                        {backup.path}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-secondary text-xs"
                                        onClick={() => {
                                            // TODO: Implement restore
                                            toast.info('Restore functionality coming soon');
                                        }}
                                    >
                                        Restore
                                    </button>
                                    <button
                                        className="btn btn-danger text-xs"
                                        onClick={() => {
                                            // TODO: Implement delete
                                            toast.info('Delete functionality coming soon');
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <p className="text-xs text-gray-400">
                        Backups are stored in: <code className="text-gray-300">%USERPROFILE%\LamaWorlds_OBS_Backups</code>
                    </p>
                </div>
            </div>
        </div>
    );
};

