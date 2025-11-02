import { DiffProcessor } from '../../src/diff/DiffProcessor';

describe('DiffProcessor', () => {
  it('should handle empty diffs', () => {
    const processor = new DiffProcessor(100);

    expect(processor.chunkDiff('')).toEqual([]);
    expect(processor.chunkDiff('   ')).toEqual([]);
    expect(processor.chunkDiff(null as any)).toEqual([]);
  });

  it('should chunk large diffs at hunk boundaries', () => {
    const processor = new DiffProcessor(200); // 200 char chunks
    const largeDiff = `File: file1.js
@@ -1,3 +1,4 @@
 function test1() {
+  console.log('hello1');
   return true;
 }

File: file2.js
@@ -1,3 +1,4 @@
 function test2() {
+  console.log('hello2');
   return true;
 }

File: file3.js
@@ -1,3 +1,4 @@
 function test3() {
+  console.log('hello3');
   return true;
 }`;

    const chunks = processor.chunkDiff(largeDiff);

    expect(chunks.length).toBeGreaterThan(1);
    // Chunks should contain valid diff content (either file headers or hunks)
    chunks.forEach(chunk => {
      expect(chunk.content.trim()).not.toBe('');
      // Each chunk should either be a file section or a hunk section
      const isFileSection = chunk.content.includes('File:');
      const isHunkSection = chunk.content.includes('@@ -');
      expect(isFileSection || isHunkSection).toBe(true);
    });

    // Verify that complete hunks are preserved
    const allContent = chunks.map(c => c.content).join('\n');
    expect(allContent).toContain('@@ -1,3 +1,4 @@');
    expect(allContent).toContain('console.log');
  });

  it('should not split hunks across chunks', () => {
    const processor = new DiffProcessor(50); // Very small chunk size
    const diff = `File: test.js
@@ -1,3 +1,4 @@
 function test() {
+  console.log('hello');
   return true;
 }`;

    const chunks = processor.chunkDiff(diff);

    // Should not split the hunk, even if it exceeds chunk size
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('@@ -1,3 +1,4 @@');
    expect(chunks[0].content).toContain('console.log');
  });

  it('should preserve context between chunks', () => {
    const processor = new DiffProcessor(200); // Larger chunk size
    const diff = `File: test.js
@@ -1,3 +1,4 @@
 function test() {
+  console.log('hello');
   return true;
 }`;

    const chunks = processor.chunkDiff(diff);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('test.js');
    expect(chunks[0].content).toContain('function test()');
  });

  it('should filter files based on patterns', () => {
    const processor = new DiffProcessor();
    const files = ['app.js', 'style.min.js', 'package-lock.json', 'README.md'];

    const filtered = processor.filterFiles(files, ['*.min.js', 'package-lock.json']);

    expect(filtered).toEqual(['app.js', 'README.md']);
  });

  it('should handle invalid input in filterFiles', () => {
    const processor = new DiffProcessor();

    expect(processor.filterFiles(null as any, ['*.js'])).toEqual([]);
    expect(processor.filterFiles(['file.js'], null as any)).toEqual(['file.js']);
    expect(processor.filterFiles(undefined as any, ['*.js'])).toEqual([]);
  });

  it('should build context with validation', () => {
    const processor = new DiffProcessor();
    const context = processor.buildContext(123, 'owner/repo', 'main', ['file1.js', 'file2.js']);

    expect(context).toEqual({
      prNumber: 123,
      repository: 'owner/repo',
      branch: 'main',
      files: ['file1.js', 'file2.js']
    });
  });

  it('should validate context inputs', () => {
    const processor = new DiffProcessor();

    expect(() => processor.buildContext(-1, 'repo', 'main', [])).toThrow('PR number must be a positive number');
    expect(() => processor.buildContext(123, '', 'main', [])).toThrow('Repository must be a non-empty string');
    expect(() => processor.buildContext(123, 'repo', '', [])).toThrow('Branch must be a non-empty string');
    expect(() => processor.buildContext(123, 'repo', 'main', null as any)).toThrow('Files must be an array');
  });
});