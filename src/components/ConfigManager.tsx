import React, { useState } from 'react';
import { useToast } from './Toast';
import type { PluginInfo } from '../electron.d';

interface ConfigManagerProps {
    installedPlugins: PluginInfo[];
    onImport?: (plugins: PluginInfo[]) => void;
}

export const ConfigManager: React.FC<ConfigManagerProps> = ({ installedPlugins, onImport }) => {
    const [showManager, setShowManager] = useState(false);
    const toast = useToast();

    const exportConfig = () => {
        const config = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            plugins: installedPlugins.map(p => ({
                id: p.id,
                name: p.displayName,
                version: p.version,
                scope: p.scope,
            })),
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `obs-plugins-config-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('Configuration exported successfully!');
    };

    const importConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target?.result as string);
                    if (config.plugins && Array.isArray(config.plugins)) {
                        toast.success(`Configuration loaded: ${config.plugins.length} plugins`);
                        if (onImport) {
                            // Convert back to PluginInfo format if needed
                            onImport(config.plugins as any);
                        }
                    } else {
                        toast.error('Invalid configuration file format');
                    }
                } catch (error) {
                    toast.error('Failed to parse configuration file');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    if (!showManager) {
        return (
            <div className="flex gap-2">
                <button
                    onClick={exportConfig}
                    className="btn btn-secondary text-xs"
                    title="Export configuration (Ctrl+E)"
                >
                    📤 Export
                </button>
                <button
                    onClick={importConfig}
                    className="btn btn-secondary text-xs"
                    title="Import configuration (Ctrl+I)"
                >
                    📥 Import
                </button>
            </div>
        );
    }

    return null;
};

