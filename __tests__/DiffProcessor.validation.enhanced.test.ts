/**
 * DiffProcessor Validation and Edge Cases - Node.js Version Consistency Enhanced
 *
 * This file includes enhancements to ensure consistent test behavior across Node.js versions:
 * - Standardized array generation patterns
 * - Version-safe string manipulation methods
 * - Consistent timing and async handling patterns
 * - Enhanced error handling that works across Node.js versions
 */

import { DiffProcessor } from '../src/DiffProcessor';

/**
 * Version-safe utility functions to ensure consistent behavior across Node.js versions
 */
class VersionSafeUtils {
  /**
   * Generate array with consistent behavior across Node.js versions
   * Uses compatible array generation methods
   */
  static generateTestLines(count: number, prefix: string = ''): string[] {
    // Use for loop instead of Array.from for maximum compatibility
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(`${prefix}${i + 1}`);
    }
    return result;
  }

  /**
   * Version-safe string repetition with fallback
   */
  static repeatString(char: string, count: number): string {
    // Handle potential differences in String.prototype.repeat across versions
    try {
      if (typeof String.prototype.repeat === 'function') {
        return char.repeat(count);
      }
    } catch (e) {
      // Fallback implementation for older Node.js versions
      let result = '';
      for (let i = 0; i < count; i++) {
        result += char;
      }
      return result;
    }

    // Additional fallback if repeat method fails
    let result = '';
    for (let i = 0; i < count; i++) {
      result += char;
    }
    return result;
  }

  /**
   * Version-safe array flatMap implementation
   */
  static flatMap<T, U>(array: T[], mapper: (item: T) => U[]): U[] {
    // Use reduce for compatibility with older Node.js versions
    return array.reduce<U[]>((acc, item) => {
      const mapped = mapper(item);
      return acc.concat(mapped);
    }, []);
  }

  /**
   * Version-safe string includes check with fallback
   */
  static stringIncludes(text: string, search: string): boolean {
    // Handle potential differences in String.prototype.includes
    try {
      if (typeof String.prototype.includes === 'function') {
        return text.includes(search);
      }
    } catch (e) {
      // Fallback to indexOf for older Node.js versions
      return text.indexOf(search) !== -1;
    }

    // Additional fallback
    return text.indexOf(search) !== -1;
  }

  /**
   * Version-safe array some method with fallback
   */
  static some<T>(array: T[], predicate: (item: T) => boolean): boolean {
    try {
      if (Array.prototype.some) {
        return array.some(predicate);
      }
    } catch (e) {
      // Fallback implementation
      for (const item of array) {
        if (predicate(item)) {
          return true;
        }
      }
      return false;
    }

    // Additional fallback
    for (const item of array) {
      if (predicate(item)) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Standardized test timing utilities
 */
class TestTimingUtils {
  /**
   * Standardized timeout with fallback for different Node.js event loop behaviors
   */
  static async waitForAsync(ms: number = 0): Promise<void> {
    return new Promise((resolve) => {
      // Use setImmediate for Node.js versions that support it, fallback to setTimeout
      if (typeof setImmediate === 'function' && ms === 0) {
        setImmediate(resolve);
      } else {
        setTimeout(resolve, ms);
      }
    });
  }

  /**
   * Standardized test execution with timing measurement
   */
  static async measureTestTime<T>(
    testName: string,
    testFn: () => T | Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    const result = await testFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log timing information for debugging version differences
    console.log(`${testName} execution time: ${duration.toFixed(2)}ms`);

    return { result, duration };
  }
}

describe('DiffProcessor Validation and Edge Cases - Node.js Version Consistency Enhanced', () => {
  let processor: DiffProcessor;

  beforeEach(() => {
    processor = new DiffProcessor();
  });

  describe('Node.js Version Compatibility Tests', () => {
    it('should handle array generation consistently across versions', () => {
      // Test version-safe array generation
      const lines = VersionSafeUtils.generateTestLines(10, 'line ');
      expect(lines).toHaveLength(10);
      expect(lines[0]).toBe('line 1');
      expect(lines[9]).toBe('line 10');
    });

    it('should handle string repetition consistently across versions', () => {
      // Test version-safe string repetition
      const repeated = VersionSafeUtils.repeatString('a', 100);
      expect(repeated).toHaveLength(100);
      expect(repeated).toBe('a'.repeat(100)); // Compare with native method if available
    });

    it('should handle array operations consistently across versions', () => {
      // Test version-safe flatMap
      const nested = [[1, 2], [3, 4], [5, 6]];
      const flattened = VersionSafeUtils.flatMap(nested, arr => arr);
      expect(flattened).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle string operations consistently across versions', () => {
      // Test version-safe string includes
      const text = 'Hello, World!';
      expect(VersionSafeUtils.stringIncludes(text, 'World')).toBe(true);
      expect(VersionSafeUtils.stringIncludes(text, 'world')).toBe(false); // Case sensitive
    });

    it('should handle array some operations consistently across versions', () => {
      // Test version-safe array some
      const numbers = [1, 2, 3, 4, 5];
      const hasEven = VersionSafeUtils.some(numbers, n => n % 2 === 0);
      expect(hasEven).toBe(true);

      const hasTen = VersionSafeUtils.some(numbers, n => n === 10);
      expect(hasTen).toBe(false);
    });

    it('should handle async timing consistently across versions', async () => {
      // Test timing utilities
      const { result, duration } = await TestTimingUtils.measureTestTime(
        'timing-test',
        async () => {
          await TestTimingUtils.waitForAsync(10);
          return 'completed';
        }
      );

      expect(result).toBe('completed');
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('buildContext validation (line 97) - Version Enhanced', () => {
    it('should throw error when prNumber is invalid', () => {
      expect(() => {
        processor.buildContext(0, 'test/repo', 'main', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(-1, 'test/repo', 'main', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(null as any, 'test/repo', 'main', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(undefined as any, 'test/repo', 'main', []);
      }).toThrow('Invalid context parameters');
    });

    it('should throw error when repo is invalid', () => {
      expect(() => {
        processor.buildContext(123, '', 'main', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(123, null as any, 'main', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(123, undefined as any, 'main', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(123, '   ', 'main', []);
      }).toThrow('Invalid context parameters');
    });

    it('should throw error when branch is invalid', () => {
      expect(() => {
        processor.buildContext(123, 'test/repo', '', []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(123, 'test/repo', null as any, []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(123, 'test/repo', undefined as any, []);
      }).toThrow('Invalid context parameters');

      expect(() => {
        processor.buildContext(123, 'test/repo', '   ', []);
      }).toThrow('Invalid context parameters');
    });

    it('should accept valid parameters', () => {
      const context = processor.buildContext(123, 'test/repo', 'main', ['file1.ts', 'file2.ts']);
      expect(context.prNumber).toBe(123);
      expect(context.repo).toBe('test/repo');
      expect(context.branch).toBe('main');
      expect(context.files).toEqual(['file1.ts', 'file2.ts']);
    });

    it('should handle empty files array', () => {
      const context = processor.buildContext(123, 'test/repo', 'main', []);
      expect(context.files).toEqual([]);
    });
  });

  describe('chunkDiff validation (line 102) - Version Enhanced', () => {
    it('should handle empty diff string', () => {
      const result = processor.chunkDiff('');
      expect(result).toEqual([{ content: '', files: [], size: 0 }]);
    });

    it('should handle null diff', () => {
      const result = processor.chunkDiff(null as any);
      expect(result).toEqual([{ content: '', files: [], size: 0 }]);
    });

    it('should handle undefined diff', () => {
      const result = processor.chunkDiff(undefined as any);
      expect(result).toEqual([{ content: '', files: [], size: 0 }]);
    });

    it('should handle whitespace-only diff', () => {
      const result = processor.chunkDiff('   \n\t  \n   ');
      expect(result).toEqual([{ content: '', files: [], size: 0 }]);
    });

    it('should handle valid diff content', () => {
      const diff = `diff --git a/src/file.ts b/src/file.ts
index 123456..789abc 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,3 +1,4 @@
 function test() {
+  console.log('hello');
   return true;
 }`;

      const result = processor.chunkDiff(diff);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(VersionSafeUtils.some(result[0].files, f => VersionSafeUtils.stringIncludes(f, 'src/file.ts'))).toBe(true);
    });
  });

  describe('chunking logic edge cases (lines 112-119) - Version Enhanced', () => {
    it('should handle very small diffs', () => {
      const smallDiff = '+hello\n-world';
      const result = processor.chunkDiff(smallDiff);
      expect(result.length).toBe(1);
      expect(result[0].content).toBe(smallDiff);
      expect(result[0].size).toBe(smallDiff.length);
    });

    it('should handle diffs exactly at chunk boundary', () => {
      const chunkSize = 2000;
      const boundaryProcessor = new DiffProcessor(chunkSize);

      // Create diff exactly at chunk size using version-safe method
      const diff = VersionSafeUtils.repeatString('a', chunkSize);
      const result = boundaryProcessor.chunkDiff(diff);

      expect(result.length).toBe(1);
      expect(result[0].size).toBe(chunkSize);
    });

    it('should handle diffs slightly over chunk boundary', () => {
      const chunkSize = 100;
      const processor = new DiffProcessor(chunkSize);

      // Create diff slightly over chunk size using version-safe method
      const diff = VersionSafeUtils.repeatString('a', chunkSize + 10);
      const result = processor.chunkDiff(diff);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].size).toBeLessThanOrEqual(chunkSize);
    });

    it('should handle diffs with many small files', () => {
      const manyFilesDiff = `
diff --git a/file1.ts b/file1.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/file1.ts
@@ -0,0 +1 @@
+export const test1 = true;

diff --git a/file2.ts b/file2.ts
new file mode 100644
index 0000000..def5678
--- /dev/null
+++ b/file2.ts
@@ -0,0 +1 @@
+export const test2 = true;

diff --git a/file3.ts b/file3.ts
new file mode 100644
index 0000000..ghi9012
--- /dev/null
+++ b/file3.ts
@@ -0,0 +1 @@
+export const test3 = true;`;

      const result = processor.chunkDiff(manyFilesDiff);
      expect(result.length).toBeGreaterThan(0);

      // All files should be tracked across chunks using version-safe methods
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file1.ts'))).toBe(true);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file2.ts'))).toBe(true);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file3.ts'))).toBe(true);
    });

    it('should handle diff with no file headers', () => {
      const malformedDiff = `@@ -1,3 +1,4 @@
 function test() {
+  console.log('hello');
   return true;
 }
@@ -10,2 +11,3 @@
 function another() {
+  return false;
 }`;

      const result = processor.chunkDiff(malformedDiff);
      expect(result.length).toBeGreaterThan(0);
      // Should handle gracefully without file headers
    });

    it('should handle binary file diffs', () => {
      const binaryDiff = `diff --git a/image.png b/image.png
index 123456..789abc 100644
Binary files a/image.png and b/image.png differ

diff --git a/src/file.ts b/src/file.ts
index abc123..def456 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1 +1 @@
-export const old = true;
+export const new = true;`;

      const result = processor.chunkDiff(binaryDiff);
      expect(result.length).toBeGreaterThan(0);

      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'image.png'))).toBe(true);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'src/file.ts'))).toBe(true);
    });

    it('should handle chunk boundaries that split file diff', () => {
      const chunkSize = 50;
      const processor = new DiffProcessor(chunkSize);

      // Create a diff that will be split across chunk boundaries using version-safe methods
      const originalLines = VersionSafeUtils.generateTestLines(100, ' line ');
      const modifiedLines = VersionSafeUtils.generateTestLines(100, '+modified line ');

      const largeDiff = `diff --git a/large-file.ts b/large-file.ts
index 123456..789abc 100644
--- a/large-file.ts
+++ b/large-file.ts
@@ -1,100 +1,100 @@
${originalLines.join('\n')}
${modifiedLines.join('\n')}`;

      const result = processor.chunkDiff(largeDiff);
      expect(result.length).toBeGreaterThan(1);

      // File should be present in all chunks that contain parts of it
      result.forEach(chunk => {
        if (VersionSafeUtils.stringIncludes(chunk.content, 'large-file.ts')) {
          expect(VersionSafeUtils.some(chunk.files, f => VersionSafeUtils.stringIncludes(f, 'large-file.ts'))).toBe(true);
        }
      });
    });
  });

  describe('file extraction edge cases (lines 162-163) - Version Enhanced', () => {
    it('should handle diff with only deletions', () => {
      const deletionDiff = `diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index abc123..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,5 +0,0 @@
-export const oldFunction = () => {
-  return true;
-};
-console.log('deleted');`;

      const result = processor.chunkDiff(deletionDiff);
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'old-file.ts'))).toBe(true);
    });

    it('should handle diff with only additions', () => {
      const additionDiff = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,5 @@
+export const newFunction = () => {
+  return true;
+};
+console.log('added');`;

      const result = processor.chunkDiff(additionDiff);
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'new-file.ts'))).toBe(true);
    });

    it('should handle diff with renamed files', () => {
      const renameDiff = `diff --git a/old-name.ts b/new-name.ts
similarity index 95%
rename from old-name.ts
rename to new-name.ts
index abc123..def456 100644
--- a/old-name.ts
+++ b/new-name.ts
@@ -1,3 +1,4 @@
 export const test = () => {
+  // added comment
   return true;
 };`;

      const result = processor.chunkDiff(renameDiff);
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);

      // Should handle both old and new names using version-safe methods
      const hasOldName = VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'old-name'));
      const hasNewName = VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'new-name'));
      expect(hasOldName || hasNewName).toBe(true);
    });

    it('should handle diff with permission changes', () => {
      const permissionDiff = `diff --git a/script.sh b/script.sh
old mode 100644
new mode 100755
diff --git a/src/file.ts b/src/file.ts
index abc123..def456 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,1 +1,2 @@
 export const test = true;
+export const added = true;`;

      const result = processor.chunkDiff(permissionDiff);
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'script.sh'))).toBe(true);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'src/file.ts'))).toBe(true);
    });

    it('should handle diff with complex file paths', () => {
      const complexPathDiff = `diff --git a/very/deep/nested/path/to/some/file-with-dashes.ts b/very/deep/nested/path/to/some/file-with-dashes.ts
index abc123..def456 100644
--- a/very/deep/nested/path/to/some/file-with-dashes.ts
+++ b/very/deep/nested/path/to/some/file-with-dashes.ts
@@ -1,1 +1,2 @@
 export const test = true;
+export const added = true;

diff --git "a/file with spaces.ts" b/file with spaces.ts
index 123abc..456def 100644
--- "a/file with spaces.ts"
+++ b/file with spaces.ts
@@ -1,1 +1,2 @@
 export const spaced = true;
+export const added = true;`;

      const result = processor.chunkDiff(complexPathDiff);
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);

      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file-with-dashes.ts'))).toBe(true);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file with spaces.ts'))).toBe(true);
    });

    it('should handle diff with malformed file headers', () => {
      const malformedHeadersDiff = `---
+++
@@ -1,1 +1,2 @@
-export const old = true;
+export const new = true;

diff --git a/incomplete-header b/incomplete-header
index abc123..def456
--- a/incomplete-header
+++ b/incomplete-header
@@ -1,1 +1,2 @@
 test content
+added content`;

      // Should handle gracefully without crashing
      expect(() => {
        const result = processor.chunkDiff(malformedHeadersDiff);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle diff with special characters in file names', () => {
      const specialCharsDiff = `diff --git a/file[1].ts b/file[1].ts
index abc123..def456 100644
--- a/file[1].ts
+++ b/file[1].ts
@@ -1,1 +1,2 @@
 export const test = true;
+export const added = true;

diff --git a/file@special.ts b/file@special.ts
index 123abc..456def 100644
--- a/file@special.ts
+++ b/file@special.ts
@@ -1,1 +1,2 @@
 export const special = true;
+export const added = true;`;

      const result = processor.chunkDiff(specialCharsDiff);
      const allFiles = VersionSafeUtils.flatMap(result, chunk => chunk.files);

      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file[1].ts'))).toBe(true);
      expect(VersionSafeUtils.some(allFiles, f => VersionSafeUtils.stringIncludes(f, 'file@special.ts'))).toBe(true);
    });
  });

  describe('additional validation edge cases - Version Enhanced', () => {
    it('should handle extremely large diffs without memory issues', async () => {
      // Create a large but manageable diff using version-safe methods
      const originalLines = VersionSafeUtils.generateTestLines(500, ' line ');
      const modifiedLines = VersionSafeUtils.generateTestLines(500, '+modified line ');

      const largeDiff = `diff --git a/large.ts b/large.ts
index 123456..789abc 100644
--- a/large.ts
+++ b/large.ts
@@ -1,1000 +1,1000 @@
${originalLines.join('\n')}
${modifiedLines.join('\n')}`;

      // Should handle without throwing, with timing measurement
      const { result, duration } = await TestTimingUtils.measureTestTime(
        'large-diff-processing',
        () => processor.chunkDiff(largeDiff)
      );

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle diff with mixed line endings', () => {
      const mixedEndingsDiff = `diff --git a/mixed.ts b/mixed.ts\r\nindex abc123..def456 100644\r\n--- a/mixed.ts\r\n+++ b/mixed.ts\r\n@@ -1,3 +1,4 @@\r\n function test() {\r\n+  console.log('windows');\n   return true;\n }\r\n`;

      const result = processor.chunkDiff(mixedEndingsDiff);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty hunks in diff', () => {
      const emptyHunksDiff = `diff --git a/empty.ts b/empty.ts
index abc123..def456 100644
--- a/empty.ts
+++ b/empty.ts
@@ -1,3 +1,3 @@



diff --git a/real.ts b/real.ts
index 123abc..456def 100644
--- a/real.ts
+++ b/real.ts
@@ -1,1 +1,2 @@
 export const real = true;
+export const added = true;`;

      const result = processor.chunkDiff(emptyHunksDiff);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Node.js Version-Specific Behavior Tests', () => {
    it('should handle Promise resolution consistently across versions', async () => {
      // Test async behavior consistency
      const asyncResult = await TestTimingUtils.measureTestTime(
        'async-consistency-test',
        async () => {
          await TestTimingUtils.waitForAsync();
          return processor.buildContext(123, 'test/repo', 'main', ['test.ts']);
        }
      );

      expect(asyncResult.result).toBeDefined();
      expect(asyncResult.result.prNumber).toBe(123);
    });

    it('should handle error objects consistently across versions', () => {
      // Test error handling consistency
      expect(() => {
        processor.buildContext(0, '', null as any, undefined as any);
      }).toThrow('Invalid context parameters');

      // The error should be consistent regardless of Node.js version
      try {
        processor.buildContext(0, '', null as any, undefined as any);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(VersionSafeUtils.stringIncludes(error.message, 'Invalid context parameters')).toBe(true);
      }
    });

    it('should handle buffer/string encoding consistently across versions', () => {
      // Test encoding consistency - some Node.js versions handle buffer encoding differently
      const testString = 'Hello, 世界! 🌍';
      const diffWithUnicode = `diff --git a/unicode.ts b/unicode.ts
index abc123..def456 100644
--- a/unicode.ts
+++ b/unicode.ts
@@ -1,1 +1,2 @@
-export const old = '${testString}';
+export const new = '${testString}';`;

      const result = processor.chunkDiff(diffWithUnicode);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});