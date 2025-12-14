import React, { useState, useEffect } from 'react'
import { PathSelector } from './components/PathSelector'
import { PluginList } from './components/PluginListEnhanced'
import { ErrorBoundary } from './components/ErrorBoundary'
import { logger } from './utils/logger'

function App() {
    const [obsPath, setObsPath] = useState<string | null>(null);
    const [obsRunning, setObsRunning] = useState<boolean>(false);

    useEffect(() => {
        checkObsRunning();
        const interval = setInterval(checkObsRunning, 5000); // Check every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const checkObsRunning = async () => {
        try {
            const running = await window.electronAPI.isObsRunning();
            setObsRunning(running);
        } catch (error) {
            logger.error('Failed to check OBS status', error);
        }
    };

    return (
        <div style={{ 
            padding: '24px', 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%)'
        }}>
            <div className="glass-panel p-4 mb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold neon-accent">
                        Lama Worlds OBS Addon Manager
                    </h1>
                    {obsRunning && (
                        <div className="status-badge status-update-available">
                            ⚠️ OBS Running
                        </div>
                    )}
                </div>
            </div>

            <PathSelector onPathChange={setObsPath} obsRunning={obsRunning} />

            {obsPath && (
                <div className="mt-6">
                    <ErrorBoundary>
                        <PluginList obsPath={obsPath} obsRunning={obsRunning} />
                    </ErrorBoundary>
                </div>
            )}
        </div>
    )
}

export default App
