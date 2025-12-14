import React from 'react';

export const SkeletonLoader: React.FC = () => {
    return (
        <div className="glass-panel p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
                <div className="h-6 bg-gray-700/50 rounded w-1/3"></div>
                <div className="h-4 bg-gray-700/50 rounded w-20"></div>
            </div>
            <div className="h-4 bg-gray-700/50 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
        </div>
    );
};

export const PluginSkeleton: React.FC = () => {
    return (
        <div className="glass-panel p-4 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-6 bg-gray-700/50 rounded w-40"></div>
                        <div className="h-5 bg-gray-700/50 rounded w-16"></div>
                        <div className="h-5 bg-gray-700/50 rounded w-20"></div>
                    </div>
                    <div className="h-3 bg-gray-700/50 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-700/50 rounded w-3/4"></div>
                </div>
                <div className="flex gap-2">
                    <div className="h-8 bg-gray-700/50 rounded w-20"></div>
                    <div className="h-8 bg-gray-700/50 rounded w-24"></div>
                </div>
            </div>
        </div>
    );
};

