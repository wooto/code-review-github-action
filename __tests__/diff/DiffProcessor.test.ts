import { DiffProcessor } from '../../src/diff/DiffProcessor';

describe('DiffProcessor', () => {
  it('should chunk large diffs into manageable pieces', () => {
    const processor = new DiffProcessor(100); // 100 char chunks
    const largeDiff = 'a'.repeat(300);

    const chunks = processor.chunkDiff(largeDiff);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toHaveLength(100);
    expect(chunks[1].content).toHaveLength(100);
    expect(chunks[2].content).toHaveLength(100);
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
});