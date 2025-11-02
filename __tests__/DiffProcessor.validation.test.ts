import { DiffProcessor } from '../src/DiffProcessor';

describe('DiffProcessor Validation and Edge Cases', () => {
  let processor: DiffProcessor;

  beforeEach(() => {
    processor = new DiffProcessor();
  });

  describe('buildContext validation (line 97)', () => {
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

  describe('chunkDiff validation (line 102)', () => {
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
      expect(result[0].files).toContain('src/file.ts');
    });
  });

  describe('chunking logic edge cases (lines 112-119)', () => {
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

      // Create diff exactly at chunk size
      const diff = 'a'.repeat(chunkSize);
      const result = boundaryProcessor.chunkDiff(diff);

      expect(result.length).toBe(1);
      expect(result[0].size).toBe(chunkSize);
    });

    it('should handle diffs slightly over chunk boundary', () => {
      const chunkSize = 100;
      const processor = new DiffProcessor(chunkSize);

      // Create diff slightly over chunk size
      const diff = 'a'.repeat(chunkSize + 10);
      const result = processor.chunkDiff(diff);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].size).toBeLessThanOrEqual(chunkSize);
    });

    it('should handle diff with many small files', () => {
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

      // All files should be tracked across chunks
      const allFiles = result.flatMap(chunk => chunk.files);
      expect(allFiles).toContain('file1.ts');
      expect(allFiles).toContain('file2.ts');
      expect(allFiles).toContain('file3.ts');
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

      const allFiles = result.flatMap(chunk => chunk.files);
      expect(allFiles).toContain('image.png');
      expect(allFiles).toContain('src/file.ts');
    });

    it('should handle chunk boundaries that split file diff', () => {
      const chunkSize = 50;
      const processor = new DiffProcessor(chunkSize);

      // Create a diff that will be split across chunk boundaries
      const largeDiff = `diff --git a/large-file.ts b/large-file.ts
index 123456..789abc 100644
--- a/large-file.ts
+++ b/large-file.ts
@@ -1,100 +1,100 @@
${Array.from({length: 100}, (_, i) => ` line ${i + 1}`).join('\n')}
${Array.from({length: 100}, (_, i) => `+modified line ${i + 1}`).join('\n')}`;

      const result = processor.chunkDiff(largeDiff);
      expect(result.length).toBeGreaterThan(1);

      // File should be present in all chunks that contain parts of it
      result.forEach(chunk => {
        if (chunk.content.includes('large-file.ts')) {
          expect(chunk.files).toContain('large-file.ts');
        }
      });
    });
  });

  describe('file extraction edge cases (lines 162-163)', () => {
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
      const allFiles = result.flatMap(chunk => chunk.files);
      expect(allFiles).toContain('old-file.ts');
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
      const allFiles = result.flatMap(chunk => chunk.files);
      expect(allFiles).toContain('new-file.ts');
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
      const allFiles = result.flatMap(chunk => chunk.files);

      // Should handle both old and new names
      expect(allFiles.some(f => f.includes('old-name')) || allFiles.some(f => f.includes('new-name'))).toBe(true);
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
      const allFiles = result.flatMap(chunk => chunk.files);
      expect(allFiles).toContain('script.sh');
      expect(allFiles).toContain('src/file.ts');
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
      const allFiles = result.flatMap(chunk => chunk.files);

      expect(allFiles.some(f => f.includes('file-with-dashes.ts'))).toBe(true);
      expect(allFiles.some(f => f.includes('file with spaces.ts'))).toBe(true);
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
      const allFiles = result.flatMap(chunk => chunk.files);

      expect(allFiles.some(f => f.includes('file[1].ts'))).toBe(true);
      expect(allFiles.some(f => f.includes('file@special.ts'))).toBe(true);
    });
  });

  describe('additional validation edge cases', () => {
    it('should handle extremely large diffs without memory issues', () => {
      // Create a large but manageable diff
      const largeDiff = `diff --git a/large.ts b/large.ts
index 123456..789abc 100644
--- a/large.ts
+++ b/large.ts
@@ -1,1000 +1,1000 @@
${Array.from({length: 500}, (_, i) => ` line ${i + 1}`).join('\n')}
${Array.from({length: 500}, (_, i) => `+modified line ${i + 1}`).join('\n')}`;

      // Should handle without throwing
      expect(() => {
        const result = processor.chunkDiff(largeDiff);
        expect(result.length).toBeGreaterThan(0);
      }).not.toThrow();
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
});