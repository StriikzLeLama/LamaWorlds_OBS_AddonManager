import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { APP_CONFIG } from '../constants';
import { logger } from '../utils/logger';

interface CacheEntry {
    data: unknown;
    timestamp: number;
    expiresAt: number;
}

interface QueuedRequest {
    id: string;
    config: AxiosRequestConfig;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
    retries: number;
}

export class RequestManager {
    private cache: Map<string, CacheEntry> = new Map();
    private queue: QueuedRequest[] = [];
    private activeRequests: number = 0;
    private readonly maxConcurrent: number = APP_CONFIG.MAX_CONCURRENT_REQUESTS;
    private readonly cacheDir: string;
    private readonly cacheTTL: number = APP_CONFIG.CACHE_TTL;
    private readonly maxRetries: number = APP_CONFIG.MAX_RETRIES;
    private readonly retryDelay: number = APP_CONFIG.RETRY_DELAY;

    constructor() {
        // Cache persistant dans le dossier utilisateur
        this.cacheDir = path.join(os.homedir(), '.lamaworlds-obs-cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        this.loadCache();
    }

    /**
     * Charge le cache depuis le disque
     */
    private loadCache() {
        try {
            const cacheFile = path.join(this.cacheDir, 'cache.json');
            if (fs.existsSync(cacheFile)) {
                const data = fs.readFileSync(cacheFile, 'utf-8');
                const entries = JSON.parse(data);
                const now = Date.now();
                
                for (const [key, entry] of Object.entries(entries)) {
                    const cacheEntry = entry as CacheEntry;
                    if (cacheEntry.expiresAt > now) {
                        this.cache.set(key, cacheEntry);
                    }
                }
            }
        } catch (error) {
            logger.error('Failed to load cache', error);
        }
    }

    /**
     * Sauvegarde le cache sur le disque
     */
    private saveCache() {
        try {
            const cacheFile = path.join(this.cacheDir, 'cache.json');
            const entries: Record<string, CacheEntry> = {};
            this.cache.forEach((value, key) => {
                entries[key] = value;
            });
            fs.writeFileSync(cacheFile, JSON.stringify(entries, null, 2));
        } catch (error) {
            logger.error('Failed to save cache', error);
        }
    }

    /**
     * Génère une clé de cache depuis une URL
     */
    private getCacheKey(url: string, config?: AxiosRequestConfig): string {
        return `${url}_${JSON.stringify(config?.params || {})}`;
    }

    /**
     * Vérifie si une requête est en cache et valide
     */
    private getCached(url: string, config?: AxiosRequestConfig): unknown | null {
        const key = this.getCacheKey(url, config);
        const entry = this.cache.get(key);
        
        if (entry && entry.expiresAt > Date.now()) {
            return entry.data;
        }
        
        if (entry) {
            this.cache.delete(key);
        }
        
        return null;
    }

    /**
     * Met en cache une réponse
     */
    private setCache(url: string, data: unknown, config?: AxiosRequestConfig) {
        const key = this.getCacheKey(url, config);
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + this.cacheTTL
        });
        this.saveCache();
    }

    /**
     * Retry avec backoff exponentiel
     */
    private async retryRequest<T>(
        requestFn: () => Promise<T>,
        retries: number = 0
    ): Promise<T> {
        try {
            return await requestFn();
        } catch (error: any) {
            const isNetworkError = 
                error.code === 'ENOBUFS' ||
                error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ENOTFOUND' ||
                (error.response?.status >= 500 && error.response?.status < 600);

            if (isNetworkError && retries < this.maxRetries) {
                const delay = this.retryDelay * Math.pow(2, retries);
                logger.debug(`Retrying request after ${delay}ms (attempt ${retries + 1}/${this.maxRetries})`);
                await this.sleep(delay);
                return this.retryRequest(requestFn, retries + 1);
            }
            throw error;
        }
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Traite la queue de requêtes
     */
    private async processQueue() {
        if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const request = this.queue.shift();
        if (!request) return;

        this.activeRequests++;

        try {
            // Délai entre les requêtes pour éviter la saturation
            if (this.activeRequests > 1) {
                await this.sleep(APP_CONFIG.REQUEST_DELAY);
            }

            const result = await this.retryRequest(() => 
                axios.request(request.config)
            );

            request.resolve(result.data as unknown);
        } catch (error) {
            request.reject(error);
        } finally {
            this.activeRequests--;
            // Traiter la prochaine requête dans la queue
            this.processQueue();
        }
    }

    /**
     * Fait une requête avec cache, retry et rate limiting
     */
    async request<T = any>(config: AxiosRequestConfig): Promise<T> {
        const url = typeof config.url === 'string' ? config.url : '';
        
        // Vérifier le cache
        const cached = this.getCached(url, config);
        if (cached) {
            return cached as T;
        }

        // Si on peut faire la requête immédiatement
        if (this.activeRequests < this.maxConcurrent) {
            return new Promise<T>((resolve, reject) => {
                this.activeRequests++;
                
                // Délai entre les requêtes
                const delay = this.activeRequests > 1 ? APP_CONFIG.REQUEST_DELAY : 0;
                
                setTimeout(async () => {
                    try {
                        const result = await this.retryRequest(() => 
                            axios.request(config)
                        );
                        
                        // Mettre en cache
                        this.setCache(url, result.data, config);
                        
                        resolve(result.data as T);
                    } catch (error) {
                        reject(error);
                    } finally {
                        this.activeRequests--;
                        this.processQueue();
                    }
                }, delay);
            });
        }

        // Sinon, mettre en queue
        return new Promise<T>((resolve, reject) => {
            const requestId = `${Date.now()}_${Math.random()}`;
            this.queue.push({
                id: requestId,
                config,
                resolve: resolve as (value: unknown) => void,
                reject,
                retries: 0
            });
            
            this.processQueue();
        });
    }

    /**
     * GET request simplifié
     */
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.request<T>({
            ...config,
            method: 'GET',
            url
        });
    }

    /**
     * Nettoie le cache expiré
     */
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt <= now) {
                this.cache.delete(key);
            }
        }
        this.saveCache();
    }

    /**
     * Vide tout le cache
     */
    clearCache() {
        this.cache.clear();
        try {
            const cacheFile = path.join(this.cacheDir, 'cache.json');
            if (fs.existsSync(cacheFile)) {
                fs.unlinkSync(cacheFile);
            }
        } catch (error) {
            logger.error('Failed to clear cache file', error);
        }
    }
}

