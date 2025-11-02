import { CommentFormatter, Suggestion } from '../../src/comment/CommentFormatter';

describe('CommentFormatter', () => {
  test('should format high severity security comment', () => {
    const formatter = new CommentFormatter();
    const suggestion: Suggestion = {
      severity: 'high',
      category: 'security',
      message: 'SQL injection vulnerability',
      suggestion: 'Use parameterized queries',
      codeExample: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
      file: 'database.js',
      line: 42
    };

    const result = formatter.formatComment(suggestion);

    expect(result).toContain('## 🔴 🔒 Security Issue');
    expect(result).toContain('SQL injection vulnerability');
    expect(result).toContain('Use parameterized queries');
    expect(result).toContain('database.js:42');
  });
});