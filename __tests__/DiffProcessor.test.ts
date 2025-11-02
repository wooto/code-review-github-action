import { DiffProcessor } from '../src/DiffProcessor';

describe('DiffProcessor', () => {
  let processor: DiffProcessor;

  beforeEach(() => {
    processor = new DiffProcessor();
  });

  test('should process simple diff', () => {
    const simpleDiff = `diff --git a/test.js b/test.js
index 123456..789abc 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 const x = 1;
+const y = 2;
 console.log(x);
 console.log(y);`;

    const result = processor.processDiff(simpleDiff, 'test.js');

    expect(result.issues).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.linesAdded).toBe(1);
    expect(result.metrics.linesRemoved).toBe(0);
  });

  test('should detect console.log statements', () => {
    const diffWithConsole = `+ console.log('debug info');`;

    const result = processor.processDiff(diffWithConsole, 'test.js');

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain('console.log');
    expect(result.issues[0].severity).toBe('warning');
  });

  test('should detect TODO comments', () => {
    const diffWithTodo = `+ // TODO: implement this feature`;

    const result = processor.processDiff(diffWithTodo, 'test.js');

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain('TODO');
    expect(result.issues[0].severity).toBe('info');
  });

  test('should detect long lines', () => {
    const longLine = '+const veryLongVariableNameThatIsExtremelyLongAndExceedsOneHundredAndTwentyCharacters = "This is a very long string that definitely exceeds the 120 characters limit for code readability in JavaScript files and should trigger the warning";';

    const result = processor.processDiff(longLine, 'test.js');

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].message).toContain('120 characters');
    expect(result.issues[0].severity).toBe('warning');
  });

  test('should calculate complexity correctly', () => {
    const diffWithComplexity = `+if (condition) { if (another) { doSomething(); } }`;

    const result = processor.processDiff(diffWithComplexity, 'test.js');

    expect(result.metrics.complexity).toBeGreaterThan(0);
  });
});