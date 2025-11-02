"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionSafeUtils = void 0;
/**
 * Version-safe utilities that provide consistent behavior across Node.js versions
 */
class VersionSafeUtils {
    constructor() {
        this.nodeVersion = process.version;
        this.isVersion20 = this.nodeVersion.startsWith('v20.');
        this.isVersion22 = this.nodeVersion.startsWith('v22.');
    }
    /**
     * Get current timestamp with high resolution when available
     */
    now() {
        if (typeof performance !== 'undefined' && performance.now) {
            return performance.now();
        }
        return Date.now();
    }
    /**
     * Generate array with version-safe method
     */
    generateArray(length, fillValue) {
        if (Array.from) {
            return Array.from({ length }, () => fillValue);
        }
        // Fallback for older versions
        const result = [];
        for (let i = 0; i < length; i++) {
            result.push(fillValue);
        }
        return result;
    }
    /**
     * String includes with version-safe fallback
     */
    stringIncludes(text, search) {
        if (text.includes) {
            return text.includes(search);
        }
        return text.indexOf(search) !== -1;
    }
    /**
     * Promise with timeout that works across versions
     */
    async withTimeout(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
        });
        return Promise.race([promise, timeoutPromise]);
    }
    /**
     * Deep object merge with version-safe implementation
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] !== undefined) {
                if (typeof source[key] === 'object' &&
                    source[key] !== null &&
                    !Array.isArray(source[key]) &&
                    typeof result[key] === 'object' &&
                    result[key] !== null &&
                    !Array.isArray(result[key])) {
                    result[key] = this.deepMerge(result[key], source[key]);
                }
                else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }
    /**
     * Generate random string with consistent behavior
     */
    randomString(length = 10) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            result += chars[randomIndex];
        }
        return result;
    }
    /**
     * Version-safe error handling
     */
    isNodeError(error) {
        return (typeof error === 'object' &&
            error !== null &&
            ('code' in error || 'errno' in error));
    }
    /**
     * Create delay that works consistently
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Memory usage information with fallback
     */
    getMemoryUsage() {
        if (process.memoryUsage) {
            const usage = process.memoryUsage();
            return {
                rss: usage.rss,
                heapTotal: usage.heapTotal,
                heapUsed: usage.heapUsed,
                external: usage.external,
                arrayBuffers: usage.arrayBuffers
            };
        }
        // Fallback values
        return {
            rss: 0,
            heapTotal: 0,
            heapUsed: 0,
            external: 0
        };
    }
    /**
     * Get Node.js version information
     */
    getVersionInfo() {
        const versionMatch = this.nodeVersion.match(/v(\d+)\./);
        const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;
        const features = [];
        if (major >= 18)
            features.push('fetch-api');
        if (major >= 20)
            features.push('test-runner');
        if (major >= 22)
            features.push('esm-stability');
        return {
            version: this.nodeVersion,
            major,
            isVersion20: this.isVersion20,
            isVersion22: this.isVersion22,
            features
        };
    }
    /**
     * Process large arrays in chunks to avoid memory issues
     */
    async processInChunks(items, chunkSize, processor) {
        const results = [];
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const chunkResults = await processor(chunk);
            results.push(...chunkResults);
            // Allow event loop to process other tasks
            await this.delay(0);
        }
        return results;
    }
    /**
     * Validate and sanitize input with version-safe approach
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        // Remove potentially harmful characters
        return input
            .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
            .trim()
            .substring(0, 1000); // Limit length
    }
    /**
     * Compare strings with locale-specific fallback
     */
    localeCompare(a, b) {
        if (a.localeCompare) {
            return a.localeCompare(b);
        }
        // Fallback comparison
        return a < b ? -1 : a > b ? 1 : 0;
    }
}
exports.VersionSafeUtils = VersionSafeUtils;
//# sourceMappingURL=version-safe-utils.js.map