import { ClaudeProvider } from '../../../src/providers/claude/ClaudeProvider';
import Anthropic from '@anthropic-ai/sdk';
const { Completions } = Anthropic;

// Mock Anthropic module
jest.mock('@anthropic-ai/sdk');
const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;
const MockedCompletions = Completions as jest.MockedClass<typeof Completions>;

describe('ClaudeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze code and return review results', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      completion: JSON.stringify({
        summary: 'Claude review complete',
        suggestions: [{
          file: 'app.py',
          line: 25,
          severity: 'high' as const,
          message: 'Potential SQL injection vulnerability'
        }]
      })
    });

    MockedCompletions.mockImplementation(() => ({
      create: mockCreate
    } as any));

    MockedAnthropic.mockImplementation(() => ({} as any));

    const provider = new ClaudeProvider('test-api-key');

    const result = await provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.py']
    });

    expect(result.summary).toBe('Claude review complete');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].severity).toBe('high');
  });

  it('should handle API errors gracefully', async () => {
    const mockCreate = jest.fn().mockRejectedValue(new Error('API rate limit exceeded'));

    MockedCompletions.mockImplementation(() => ({
      create: mockCreate
    } as any));

    MockedAnthropic.mockImplementation(() => ({} as any));

    const provider = new ClaudeProvider('test-api-key');

    await expect(provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.py']
    })).rejects.toThrow('Claude API error: Request failed');
  });

  it('should handle non-JSON responses gracefully', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      completion: 'This is a plain text response without JSON'
    });

    MockedCompletions.mockImplementation(() => ({
      create: mockCreate
    } as any));

    MockedAnthropic.mockImplementation(() => ({} as any));

    const provider = new ClaudeProvider('test-api-key');

    const result = await provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.py']
    });

    expect(result.summary).toBe('This is a plain text response without JSON');
    expect(result.suggestions).toHaveLength(0);
    expect(result.confidence).toBe(0.6);
  });

  it('should extract JSON from mixed responses', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      completion: `Here's my analysis:

{
  "summary": "Code looks good overall",
  "suggestions": [
    {
      "file": "app.js",
      "line": 10,
      "severity": "medium",
      "message": "Consider adding error handling"
    }
  ]
}

The code follows best practices.`
    });

    MockedCompletions.mockImplementation(() => ({
      create: mockCreate
    } as any));

    MockedAnthropic.mockImplementation(() => ({} as any));

    const provider = new ClaudeProvider('test-api-key');

    const result = await provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.js']
    });

    expect(result.summary).toBe('Code looks good overall');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].message).toBe('Consider adding error handling');
  });

  it('should throw error when no API key provided', () => {
    expect(() => new ClaudeProvider('')).toThrow('Claude API key is required');
    expect(() => new ClaudeProvider('   ')).toThrow('Claude API key is required');
  });
});