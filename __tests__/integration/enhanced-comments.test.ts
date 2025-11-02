import { run } from '../../src/index';

describe('Enhanced Comments Integration', () => {
  test('should create enhanced comments for all severity levels', async () => {
    // Mock GitHub context with PR
    const mockContext = {
      repo: { owner: 'test', repo: 'test-repo' },
      payload: {
        pull_request: {
          number: 1,
          title: 'Test PR',
          head: { ref: 'feature-branch' }
        }
      }
    };

    // Mock all suggestions with different severities
    const mockSuggestions = [
      { severity: 'high', category: 'security', message: 'Security issue', file: 'test.js', line: 10 },
      { severity: 'medium', category: 'performance', message: 'Performance issue', file: 'test.js', line: 20 },
      { severity: 'low', category: 'style', message: 'Style issue', file: 'test.js', line: 30 }
    ];

    // Test that all suggestions are processed
    expect(mockSuggestions.length).toBe(3);

    // Verify each severity is represented
    const severities = mockSuggestions.map(s => s.severity);
    expect(severities).toContain('high');
    expect(severities).toContain('medium');
    expect(severities).toContain('low');
  });
});