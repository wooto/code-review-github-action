/**
 * Version-safe utilities that provide consistent behavior across Node.js versions
 */
export declare class VersionSafeUtils {
    private nodeVersion;
    private isVersion20;
    private isVersion22;
    constructor();
    /**
     * Get current timestamp with high resolution when available
     */
    now(): number;
    /**
     * Generate array with version-safe method
     */
    generateArray<T>(length: number, fillValue: T): T[];
    /**
     * String includes with version-safe fallback
     */
    stringIncludes(text: string, search: string): boolean;
    /**
     * Promise with timeout that works across versions
     */
    withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>;
    /**
     * Deep object merge with version-safe implementation
     */
    deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
    /**
     * Generate random string with consistent behavior
     */
    randomString(length?: number): string;
    /**
     * Version-safe error handling
     */
    isNodeError(error: unknown): error is NodeJS.ErrnoException;
    /**
     * Create delay that works consistently
     */
    delay(ms: number): Promise<void>;
    /**
     * Memory usage information with fallback
     */
    getMemoryUsage(): {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        arrayBuffers?: number;
    };
    /**
     * Get Node.js version information
     */
    getVersionInfo(): {
        version: string;
        major: number;
        isVersion20: boolean;
        isVersion22: boolean;
        features: string[];
    };
    /**
     * Process large arrays in chunks to avoid memory issues
     */
    processInChunks<T, R>(items: T[], chunkSize: number, processor: (chunk: T[]) => Promise<R[]>): Promise<R[]>;
    /**
     * Validate and sanitize input with version-safe approach
     */
    sanitizeInput(input: string): string;
    /**
     * Compare strings with locale-specific fallback
     */
    localeCompare(a: string, b: string): number;
}
//# sourceMappingURL=version-safe-utils.d.ts.map