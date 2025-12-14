import React, { useEffect, useState } from 'react';
import { logger } from '../utils/logger';

interface PathSelectorProps {
    onPathChange: (path: string | null) => void;
    obsRunning: boolean;
}

export const PathSelector: React.FC<PathSelectorProps> = ({ onPathChange, obsRunning }) => {
    const [obsPath, setObsPath] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detecting, setDetecting] = useState(false);

    useEffect(() => {
        checkPath();
    }, []);

    const updatePath = (path: string | null) => {
        setObsPath(path);
        onPathChange(path);
        setError(null);
    };

    const checkPath = async () => {
        setLoading(true);
        setError(null);
        try {
            const path = await window.electronAPI.getObsPath();
            updatePath(path);
        } catch (err: unknown) {
            logger.error('Failed to check OBS path', err);
            setError('Failed to check OBS path');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDetect = async () => {
        setDetecting(true);
        setError(null);
        try {
            await window.electronAPI.resetObsPath();
            const path = await window.electronAPI.getObsPath();
            updatePath(path);
            if (!path) {
                setError('OBS Studio not found. Please select manually.');
            }
        } catch (err: unknown) {
            logger.error('Failed to detect OBS installation', err);
            setError('Failed to detect OBS installation');
        } finally {
            setDetecting(false);
        }
    };

    const handleManualSelect = async () => {
        setLoading(true);
        setError(null);
        try {
            const path = await window.electronAPI.selectObsManual();
            if (path) {
                updatePath(path);
            } else if (path === null) {
                setError('Invalid OBS Studio folder. Please select the obs-studio installation folder.');
            }
        } catch (err: unknown) {
            logger.error('Failed to select path', err);
            setError('Failed to select path');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        await window.electronAPI.resetObsPath();
        updatePath(null);
        checkPath();
    };

    if (loading) {
        return (
            <div className="glass-panel p-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="spinner"></div>
                    <span className="text-gray-300">Checking for OBS Studio...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white">OBS Studio Status</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleAutoDetect}
                        disabled={detecting}
                        className="btn btn-secondary"
                    >
                        {detecting ? (
                            <>
                                <div className="spinner mr-2"></div>
                                Detecting...
                            </>
                        ) : (
                            'Auto-Detect'
                        )}
                    </button>
                    <button
                        onClick={handleManualSelect}
                        className="btn btn-secondary"
                    >
                        Select Folder
                    </button>
                </div>
            </div>

            {obsPath ? (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="status-badge status-up-to-date">✓ Detected</span>
                        <code className="text-sm text-gray-300 bg-black/30 px-3 py-1 rounded">
                            {obsPath}
                        </code>
                    </div>
                    <button
                        onClick={handleReset}
                        className="btn btn-danger text-xs"
                    >
                        Reset
                    </button>
                </div>
            ) : (
                <div>
                    <p className="text-gray-300 mb-3">
                        OBS Studio installation not found. Please use Auto-Detect or select the installation folder manually.
                    </p>
                    {error && (
                        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
