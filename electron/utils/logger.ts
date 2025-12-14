/**
 * Système de logging centralisé pour Electron
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private isDev: boolean;

    constructor() {
        this.isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged;
    }

    private formatMessage(level: LogLevel, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        if (!this.isDev && level === 'debug') {
            return; // Ne pas logger les debug en production
        }

        switch (level) {
            case 'debug':
                console.debug(prefix, message, ...args);
                break;
            case 'info':
                console.info(prefix, message, ...args);
                break;
            case 'warn':
                console.warn(prefix, message, ...args);
                break;
            case 'error':
                console.error(prefix, message, ...args);
                break;
        }
    }

    debug(message: string, ...args: any[]): void {
        this.formatMessage('debug', message, ...args);
    }

    info(message: string, ...args: any[]): void {
        this.formatMessage('info', message, ...args);
    }

    warn(message: string, ...args: any[]): void {
        this.formatMessage('warn', message, ...args);
    }

    error(message: string, error?: Error | unknown, ...args: any[]): void {
        if (error instanceof Error) {
            this.formatMessage('error', message, error.message, error.stack, ...args);
        } else {
            this.formatMessage('error', message, error, ...args);
        }
    }
}

export const logger = new Logger();

