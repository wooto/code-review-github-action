import { VersionSafeUtils } from '../src/version-safe-utils';

describe('VersionSafeUtils', () => {
  let utils: VersionSafeUtils;

  beforeEach(() => {
    utils = new VersionSafeUtils();
  });

  describe('constructor', () => {
    it('should initialize with current Node.js version', () => {
      expect(utils).toBeInstanceOf(VersionSafeUtils);
    });
  });

  describe('now', () => {
    it('should return a timestamp', () => {
      const timestamp = utils.now();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should fallback to Date.now when performance.now is not available', () => {
      // Mock performance.now to be undefined
      const originalPerformance = (global as any).performance;
      delete (global as any).performance;

      const timestamp = utils.now();
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);

      // Restore performance
      (global as any).performance = originalPerformance;
    });
  });

  describe('generateArray', () => {
    it('should generate array with specified length and value', () => {
      const result = utils.generateArray(3, 'test');
      expect(result).toEqual(['test', 'test', 'test']);
      expect(result.length).toBe(3);
    });

    it('should work with different types', () => {
      const result = utils.generateArray(2, 42);
      expect(result).toEqual([42, 42]);
    });

    it('should handle empty array', () => {
      const result = utils.generateArray(0, 'test');
      expect(result).toEqual([]);
    });

    it('should fallback to manual array generation when Array.from is not available', () => {
      // Mock Array.from to be undefined
      const originalArrayFrom = Array.from;
      delete (Array as any).from;

      const result = utils.generateArray(3, 'test');
      expect(result).toEqual(['test', 'test', 'test']);
      expect(result.length).toBe(3);

      // Restore Array.from
      (Array as any).from = originalArrayFrom;
    });
  });

  describe('stringIncludes', () => {
    it('should return true when substring exists', () => {
      const result = utils.stringIncludes('hello world', 'world');
      expect(result).toBe(true);
    });

    it('should return false when substring does not exist', () => {
      const result = utils.stringIncludes('hello world', 'mars');
      expect(result).toBe(false);
    });

    it('should handle empty strings', () => {
      const result1 = utils.stringIncludes('', 'test');
      const result2 = utils.stringIncludes('test', '');
      expect(result1).toBe(false);
      expect(result2).toBe(true);
    });

    it('should fallback to indexOf when text.includes is not available', () => {
      // Mock text.includes to be undefined
      const originalIncludes = String.prototype.includes;
      delete (String.prototype as any).includes;

      const result = utils.stringIncludes('hello world', 'world');
      expect(result).toBe(true);

      const result2 = utils.stringIncludes('hello world', 'mars');
      expect(result2).toBe(false);

      // Restore includes
      (String.prototype as any).includes = originalIncludes;
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const fastPromise = Promise.resolve('success');
      const result = await utils.withTimeout(fastPromise, 100);
      expect(result).toBe('success');
    });

    it('should reject when promise takes longer than timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 200));
      await expect(utils.withTimeout(slowPromise, 50)).rejects.toThrow('Operation timed out');
    });

    it('should use custom timeout message', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 200));
      await expect(utils.withTimeout(slowPromise, 50, 'Custom timeout message'))
        .rejects.toThrow('Custom timeout message');
    });
  });

  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = utils.deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const target = { a: { x: 1 }, b: 2 };
      const source = { a: { y: 2 }, c: 3 } as any;
      const result = utils.deepMerge(target, source);
      expect(result).toEqual({ a: { x: 1, y: 2 }, b: 2, c: 3 });
    });

    it('should handle arrays by replacing them', () => {
      const target = { a: [1, 2] };
      const source = { a: [3, 4] };
      const result = utils.deepMerge(target, source);
      expect(result).toEqual({ a: [3, 4] });
    });

    it('should ignore undefined values', () => {
      const target = { a: 1, b: 2 };
      const source = { b: undefined, c: 3 };
      const result = utils.deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('randomString', () => {
    it('should generate string with default length', () => {
      const result = utils.randomString();
      expect(result.length).toBe(10);
      expect(typeof result).toBe('string');
    });

    it('should generate string with specified length', () => {
      const result = utils.randomString(5);
      expect(result.length).toBe(5);
    });

    it('should generate different strings on multiple calls', () => {
      const result1 = utils.randomString();
      const result2 = utils.randomString();
      expect(result1).not.toBe(result2);
    });

    it('should only contain alphanumeric characters', () => {
      const result = utils.randomString(100);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('isNodeError', () => {
    it('should return true for NodeJS errors', () => {
      const error = new Error('test') as any;
      error.code = 'ENOENT';
      expect(utils.isNodeError(error)).toBe(true);
    });

    it('should return true for errors with errno', () => {
      const error = new Error('test') as any;
      error.errno = -2;
      expect(utils.isNodeError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      const error = new Error('test');
      expect(utils.isNodeError(error)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(utils.isNodeError('string')).toBe(false);
      expect(utils.isNodeError(123)).toBe(false);
      expect(utils.isNodeError(null)).toBe(false);
    });
  });

  describe('delay', () => {
    it('should delay for specified time', async () => {
      const start = Date.now();
      await utils.delay(50);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(45);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage information', () => {
      const usage = utils.getMemoryUsage();
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('external');
      expect(typeof usage.rss).toBe('number');
      expect(typeof usage.heapTotal).toBe('number');
      expect(typeof usage.heapUsed).toBe('number');
      expect(typeof usage.external).toBe('number');
    });

    it('should return fallback values when process.memoryUsage is not available', () => {
      // Mock process.memoryUsage to be undefined
      const originalMemoryUsage = (process as any).memoryUsage;
      delete (process as any).memoryUsage;

      const usage = utils.getMemoryUsage();
      expect(usage).toHaveProperty('rss');
      expect(usage).toHaveProperty('heapTotal');
      expect(usage).toHaveProperty('heapUsed');
      expect(usage).toHaveProperty('external');
      expect(usage.rss).toBe(0);
      expect(usage.heapTotal).toBe(0);
      expect(usage.heapUsed).toBe(0);
      expect(usage.external).toBe(0);

      // Restore process.memoryUsage
      (process as any).memoryUsage = originalMemoryUsage;
    });
  });

  describe('getVersionInfo', () => {
    it('should return version information', () => {
      const info = utils.getVersionInfo();
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('major');
      expect(info).toHaveProperty('isVersion20');
      expect(info).toHaveProperty('isVersion22');
      expect(info).toHaveProperty('features');
      expect(typeof info.version).toBe('string');
      expect(typeof info.major).toBe('number');
      expect(typeof info.isVersion20).toBe('boolean');
      expect(typeof info.isVersion22).toBe('boolean');
      expect(Array.isArray(info.features)).toBe(true);
    });

    it('should include appropriate features based on version', () => {
      const info = utils.getVersionInfo();
      if (info.major >= 18) {
        expect(info.features).toContain('fetch-api');
      }
      if (info.major >= 20) {
        expect(info.features).toContain('test-runner');
      }
      if (info.major >= 22) {
        expect(info.features).toContain('esm-stability');
      }
    });
  });

  describe('processInChunks', () => {
    it('should process items in chunks', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn().mockImplementation(async (chunk: number[]) =>
        chunk.map((x: number) => x * 2)
      );

      const result = await utils.processInChunks(items, 2, processor);

      expect(result).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(3);
      expect(processor).toHaveBeenCalledWith([1, 2]);
      expect(processor).toHaveBeenCalledWith([3, 4]);
      expect(processor).toHaveBeenCalledWith([5]);
    });

    it('should handle empty array', async () => {
      const processor = jest.fn();
      const result = await utils.processInChunks([], 2, processor);
      expect(result).toEqual([]);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeInput', () => {
    it('should remove control characters', () => {
      const result = utils.sanitizeInput('hello\x00world\x1F');
      expect(result).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      const result = utils.sanitizeInput('  hello world  ');
      expect(result).toBe('hello world');
    });

    it('should limit length to 1000 characters', () => {
      const longString = 'a'.repeat(1500);
      const result = utils.sanitizeInput(longString);
      expect(result.length).toBe(1000);
    });

    it('should handle non-string input', () => {
      expect(utils.sanitizeInput(null as any)).toBe('');
      expect(utils.sanitizeInput(undefined as any)).toBe('');
      expect(utils.sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('localeCompare', () => {
    it('should compare strings correctly', () => {
      expect(utils.localeCompare('a', 'b')).toBeLessThan(0);
      expect(utils.localeCompare('b', 'a')).toBeGreaterThan(0);
      expect(utils.localeCompare('a', 'a')).toBe(0);
    });

    it('should handle different cases', () => {
      const result = utils.localeCompare('Apple', 'apple');
      expect([result, -result]).toContain(1); // Should be -1 or 1
    });

    it('should fallback to manual comparison when localeCompare is not available', () => {
      // Mock String.prototype.localeCompare to be undefined
      const originalLocaleCompare = String.prototype.localeCompare;
      delete (String.prototype as any).localeCompare;

      expect(utils.localeCompare('a', 'b')).toBeLessThan(0);
      expect(utils.localeCompare('b', 'a')).toBeGreaterThan(0);
      expect(utils.localeCompare('a', 'a')).toBe(0);

      // Restore localeCompare
      (String.prototype as any).localeCompare = originalLocaleCompare;
    });
  });
});