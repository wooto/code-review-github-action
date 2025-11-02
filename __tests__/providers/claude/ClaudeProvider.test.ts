import { ClaudeProvider } from '../../../src/providers/claude/ClaudeProvider';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic module
jest.mock('@anthropic-ai/sdk');
const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

// Mock the messages API
const mockMessagesCreate = jest.fn();

describe('ClaudeProvider', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock client with messages API
    mockClient = {
      messages: {
        create: mockMessagesCreate
      }
    };

    MockedAnthropic.mockImplementation(() => mockClient);
  });

  it('should analyze code and return review results', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          summary: 'Claude review complete',
          suggestions: [{
            file: 'app.py',
            line: 25,
            severity: 'high' as const,
            message: 'Potential SQL injection vulnerability'
          }]
        })
      }]
    });

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.py']
    });

    expect(result.summary).toBe('Claude review complete');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].severity).toBe('high');
    expect(mockMessagesCreate).toHaveBeenCalledWith({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: expect.stringContaining('test diff')
      }]
    });
  });

  it('should handle API errors gracefully', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('API rate limit exceeded'));

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

    await expect(provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.py']
    })).rejects.toThrow('Claude API error: Request failed');
  });

  it('should handle non-JSON responses gracefully', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'This is a plain text response without JSON'
      }]
    });

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

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
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: `Here's my analysis:

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
      }]
    });

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

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

  it('should throw error when no API keys provided', () => {
    expect(() => new ClaudeProvider({
      apiKeys: []
    })).toThrow('At least one API key is required');
  });

  it('should perform health check successfully', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'Hi'
      }]
    });

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

    const healthStatus = await provider.healthCheck();
    expect(healthStatus).toBe(true);
  });

  it('should handle health check failure', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('API error'));

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

    const healthStatus = await provider.healthCheck();
    expect(healthStatus).toBe(false);
  });

  it('should initialize successfully', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'Hi'
      }]
    });

    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

    await expect(provider.initialize()).resolves.not.toThrow();
  });

  it('should return model info', () => {
    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key'],
      model: 'claude-3-opus-20240229',
      maxTokens: 2000
    });

    const modelInfo = provider.getModelInfo();
    expect(modelInfo.model).toBe('claude-3-opus-20240229');
    expect(modelInfo.maxTokens).toBe(2000);
  });

  it('should use default model and tokens when not specified', () => {
    const provider = new ClaudeProvider({
      apiKeys: ['test-api-key']
    });

    const modelInfo = provider.getModelInfo();
    expect(modelInfo.model).toBe('claude-3-sonnet-20240229');
    expect(modelInfo.maxTokens).toBe(1000);
  });

  it('should rotate API keys', async () => {
    mockMessagesCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'test response'
      }]
    });

    const provider = new ClaudeProvider({
      apiKeys: ['key1', 'key2']
    });

    expect(provider.getCurrentApiKey()).toBe('key1');

    await provider.analyzeCode('test diff', {
      prNumber: 456,
      repository: 'test/repo',
      branch: 'develop',
      files: ['app.py']
    });

    expect(provider.getCurrentApiKey()).toBe('key2');
  });
});
