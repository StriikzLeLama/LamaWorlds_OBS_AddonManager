import React from 'react';

interface ProgressBarProps {
    progress: number; // 0-100
    label?: string;
    showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
    progress, 
    label, 
    showPercentage = true 
}) => {
    const clampedProgress = Math.max(0, Math.min(100, progress));

    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">{label}</span>
                    {showPercentage && (
                        <span className="text-sm text-gray-400">{Math.round(clampedProgress)}%</span>
                    )}
                </div>
            )}
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out relative"
                    style={{ width: `${clampedProgress}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

