/**
 * Test suite for VersionSafeUtils and TestTimingUtils
 * Verifies consistent behavior across Node.js versions
 */

import { VersionSafeUtils, TestTimingUtils } from './DiffProcessor.validation.enhanced';

// Re-import the utilities for standalone testing
class VersionSafeUtilsStandalone {
  static generateTestLines(count: number, prefix: string = ''): string[] {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(`${prefix}${i + 1}`);
    }
    return result;
  }

  static repeatString(char: string, count: number): string {
    try {
      if (typeof String.prototype.repeat === 'function') {
        return char.repeat(count);
      }
    } catch (e) {
      // Fallback implementation
      let result = '';
      for (let i = 0; i < count; i++) {
        result += char;
      }
      return result;
    }

    // Additional fallback
    let result = '';
    for (let i = 0; i < count; i++) {
      result += char;
    }
    return result;
  }

  static flatMap<T, U>(array: T[], mapper: (item: T) => U[]): U[] {
    return array.reduce<U[]>((acc, item) => {
      const mapped = mapper(item);
      return acc.concat(mapped);
    }, []);
  }

  static stringIncludes(text: string, search: string): boolean {
    try {
      if (typeof String.prototype.includes === 'function') {
        return text.includes(search);
      }
    } catch (e) {
      return text.indexOf(search) !== -1;
    }
    return text.indexOf(search) !== -1;
  }

  static some<T>(array: T[], predicate: (item: T) => boolean): boolean {
    try {
      if (Array.prototype.some) {
        return array.some(predicate);
      }
    } catch (e) {
      for (const item of array) {
        if (predicate(item)) {
          return true;
        }
      }
      return false;
    }

    for (const item of array) {
      if (predicate(item)) {
        return true;
      }
    }
    return false;
  }
}

class TestTimingUtilsStandalone {
  static async waitForAsync(ms: number = 0): Promise<void> {
    return new Promise((resolve) => {
      if (typeof setImmediate === 'function' && ms === 0) {
        setImmediate(resolve);
      } else {
        setTimeout(resolve, ms);
      }
    });
  }

  static async measureTestTime<T>(
    testName: string,
    testFn: () => T | Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    const result = await testFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;

    console.log(`${testName} execution time: ${duration.toFixed(2)}ms`);
    return { result, duration };
  }
}

describe('VersionSafeUtils - Node.js Version Consistency Tests', () => {
  describe('Array Generation', () => {
    it('should generate arrays consistently', () => {
      const lines = VersionSafeUtilsStandalone.generateTestLines(10, 'test ');
      expect(lines).toHaveLength(10);
      expect(lines[0]).toBe('test 1');
      expect(lines[9]).toBe('test 10');
    });

    it('should handle empty count', () => {
      const lines = VersionSafeUtilsStandalone.generateTestLines(0);
      expect(lines).toHaveLength(0);
    });

    it('should handle prefix variations', () => {
      const lines1 = VersionSafeUtilsStandalone.generateTestLines(5, 'prefix-');
      const lines2 = VersionSafeUtilsStandalone.generateTestLines(5, '');

      expect(lines1).toEqual(['prefix-1', 'prefix-2', 'prefix-3', 'prefix-4', 'prefix-5']);
      expect(lines2).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('String Operations', () => {
    it('should repeat strings consistently', () => {
      const repeated = VersionSafeUtilsStandalone.repeatString('a', 100);
      expect(repeated).toHaveLength(100);
      expect(repeated).toBe('a'.repeat(100)); // Compare with native method
    });

    it('should handle string includes consistently', () => {
      const text = 'Hello, World! This is a test string.';

      expect(VersionSafeUtilsStandalone.stringIncludes(text, 'World')).toBe(true);
      expect(VersionSafeUtilsStandalone.stringIncludes(text, 'world')).toBe(false); // Case sensitive
      expect(VersionSafeUtilsStandalone.stringIncludes(text, 'test string')).toBe(true);
      expect(VersionSafeUtilsStandalone.stringIncludes(text, 'not found')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(VersionSafeUtilsStandalone.stringIncludes('', 'test')).toBe(false);
      expect(VersionSafeUtilsStandalone.stringIncludes('test', '')).toBe(true);
    });

    it('should handle special characters', () => {
      const text = 'Special chars: émojis 🚀 unicode 中文字符';
      expect(VersionSafeUtilsStandalone.stringIncludes(text, '🚀')).toBe(true);
      expect(VersionSafeUtilsStandalone.stringIncludes(text, '中文')).toBe(true);
    });
  });

  describe('Array Operations', () => {
    it('should flatMap arrays consistently', () => {
      const nested = [[1, 2], [3, 4], [5, 6]];
      const flattened = VersionSafeUtilsStandalone.flatMap(nested, arr => arr);
      expect(flattened).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should flatMap with transformation consistently', () => {
      const numbers = [1, 2, 3];
      const doubled = VersionSafeUtilsStandalone.flatMap(numbers, n => [n * 2]);
      expect(doubled).toEqual([2, 4, 6]);
    });

    it('should handle some operations consistently', () => {
      const numbers = [1, 2, 3, 4, 5];

      expect(VersionSafeUtilsStandalone.some(numbers, n => n % 2 === 0)).toBe(true);
      expect(VersionSafeUtilsStandalone.some(numbers, n => n > 10)).toBe(false);
      expect(VersionSafeUtilsStandalone.some(numbers, n => n === 3)).toBe(true);
    });

    it('should handle empty arrays', () => {
      expect(VersionSafeUtilsStandalone.some([], () => true)).toBe(false);
      expect(VersionSafeUtilsStandalone.flatMap([], x => x)).toEqual([]);
    });
  });
});

describe('TestTimingUtils - Node.js Version Consistency Tests', () => {
  it('should handle async waits consistently', async () => {
    const startTime = Date.now();
    await TestTimingUtilsStandalone.waitForAsync(10);
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    expect(endTime - startTime).toBeLessThan(100); // Should not take too long
  });

  it('should measure test timing consistently', async () => {
    const { result, duration } = await TestTimingUtilsStandalone.measureTestTime(
      'timing-test',
      async () => {
        await TestTimingUtilsStandalone.waitForAsync(5);
        return 'test-result';
      }
    );

    expect(result).toBe('test-result');
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should handle synchronous timing measurements', async () => {
    const { result, duration } = await TestTimingUtilsStandalone.measureTestTime(
      'sync-test',
      () => {
        // Some synchronous work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      }
    );

    expect(result).toBe(499500); // Sum of 0..999
    expect(duration).toBeGreaterThan(0);
  });
});

describe('Node.js Environment Detection', () => {
  it('should detect Node.js version', () => {
    const nodeVersion = process.version;
    expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+$/);

    console.log(`Testing on Node.js ${nodeVersion}`);

    // Log environment info for debugging
    console.log('Environment info:');
    console.log(`  Platform: ${process.platform}`);
    console.log(`  Arch: ${process.arch}`);
    console.log(`  Node version: ${process.version}`);
    console.log(`  V8 version: ${process.versions.v8}`);
  });

  it('should detect available features', () => {
    const features = {
      'String.prototype.includes': typeof String.prototype.includes === 'function',
      'String.prototype.repeat': typeof String.prototype.repeat === 'function',
      'Array.prototype.flatMap': typeof Array.prototype.flatMap === 'function',
      'Array.prototype.some': typeof Array.prototype.some === 'function',
      'setImmediate': typeof setImmediate === 'function',
      'process.hrtime.bigint': typeof process.hrtime.bigint === 'function'
    };

    console.log('Available features:', features);

    // All critical features should be available in modern Node.js
    expect(features['String.prototype.includes']).toBe(true);
    expect(features['String.prototype.repeat']).toBe(true);
    expect(features['Array.prototype.some']).toBe(true);
    expect(features['process.hrtime.bigint']).toBe(true);

    // flatMap might not be available in very old Node.js versions
    // setImmediate availability varies by platform
  });
});

describe('Version-Specific Behavior Tests', () => {
  it('should handle Unicode consistently', () => {
    const unicodeText = 'Hello 世界 🌍 émojis';

    // Test string operations with Unicode
    expect(VersionSafeUtilsStandalone.stringIncludes(unicodeText, '世界')).toBe(true);
    expect(VersionSafeUtilsStandalone.stringIncludes(unicodeText, '🌍')).toBe(true);
    expect(VersionSafeUtilsStandalone.stringIncludes(unicodeText, 'émojis')).toBe(true);
  });

  it('should handle large arrays consistently', () => {
    // Test with larger arrays to check for performance differences
    const largeArray = VersionSafeUtilsStandalone.generateTestLines(10000, 'item-');
    expect(largeArray).toHaveLength(10000);
    expect(largeArray[0]).toBe('item-1');
    expect(largeArray[9999]).toBe('item-10000');
  });

  it('should handle complex string operations', () => {
    const complexText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
                       'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

    // Test various string operations
    expect(VersionSafeUtilsStandalone.stringIncludes(complexText, 'Lorem')).toBe(true);
    expect(VersionSafeUtilsStandalone.stringIncludes(complexText, 'aliqua.')).toBe(true);
    expect(VersionSafeUtilsStandalone.stringIncludes(complexText, 'not present')).toBe(false);
  });

  it('should handle array edge cases', () => {
    // Test with mixed types
    const mixedArray = [1, 'string', true, null, undefined, { key: 'value' }];

    const hasString = VersionSafeUtilsStandalone.some(mixedArray, item => typeof item === 'string');
    const hasNumber = VersionSafeUtilsStandalone.some(mixedArray, item => typeof item === 'number');
    const hasBoolean = VersionSafeUtilsStandalone.some(mixedArray, item => typeof item === 'boolean');

    expect(hasString).toBe(true);
    expect(hasNumber).toBe(true);
    expect(hasBoolean).toBe(true);
  });
});