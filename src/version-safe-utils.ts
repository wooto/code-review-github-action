/**
 * Version-safe utilities that provide consistent behavior across Node.js versions
 */
export class VersionSafeUtils {
  private nodeVersion: string;
  private isVersion20: boolean;
  private isVersion22: boolean;

  constructor() {
    this.nodeVersion = process.version;
    this.isVersion20 = this.nodeVersion.startsWith('v20.');
    this.isVersion22 = this.nodeVersion.startsWith('v22.');
  }

  /**
   * Get current timestamp with high resolution when available
   */
  now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Generate array with version-safe method
   */
  generateArray<T>(length: number, fillValue: T): T[] {
    if (Array.from) {
      return Array.from({ length }, () => fillValue);
    }
    // Fallback for older versions
    const result: T[] = [];
    for (let i = 0; i < length; i++) {
      result.push(fillValue);
    }
    return result;
  }

  /**
   * String includes with version-safe fallback
   */
  stringIncludes(text: string, search: string): boolean {
    if (text.includes) {
      return text.includes(search);
    }
    return text.indexOf(search) !== -1;
  }

  /**
   * Promise with timeout that works across versions
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Deep object merge with version-safe implementation
   */
  deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof result[key] === 'object' &&
          result[key] !== null &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.deepMerge(result[key] as any, source[key] as any);
        } else {
          result[key] = source[key] as any;
        }
      }
    }

    return result;
  }

  /**
   * Generate random string with consistent behavior
   */
  randomString(length: number = 10): string {
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
  isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return (
      typeof error === 'object' &&
      error !== null &&
      ('code' in error || 'errno' in error)
    );
  }

  /**
   * Create delay that works consistently
   */
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Memory usage information with fallback
   */
  getMemoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers?: number;
  } {
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
  getVersionInfo(): {
    version: string;
    major: number;
    isVersion20: boolean;
    isVersion22: boolean;
    features: string[];
  } {
    const versionMatch = this.nodeVersion.match(/v(\d+)\./);
    const major = versionMatch ? parseInt(versionMatch[1], 10) : 0;

    const features: string[] = [];
    if (major >= 18) features.push('fetch-api');
    if (major >= 20) features.push('test-runner');
    if (major >= 22) features.push('esm-stability');

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
  async processInChunks<T, R>(
    items: T[],
    chunkSize: number,
    processor: (chunk: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

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
  sanitizeInput(input: string): string {
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
  localeCompare(a: string, b: string): number {
    if (a.localeCompare) {
      return a.localeCompare(b);
    }

    // Fallback comparison
    return a < b ? -1 : a > b ? 1 : 0;
  }
}