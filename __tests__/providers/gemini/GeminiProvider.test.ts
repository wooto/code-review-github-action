import { GeminiProvider } from '../../../src/providers/gemini/GeminiProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock Google AI module
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent
}));

jest.mock('@google/generative-ai');

describe('GeminiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementation with any type to bypass strict typing
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation((apiKey: string) => ({
      apiKey,
      getGenerativeModel: mockGetGenerativeModel,
      getGenerativeModelFromCachedContent: jest.fn()
    }));
  });

  it('should analyze code and return review results', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          summary: 'Gemini review complete',
          suggestions: [{
            file: 'main.go',
            line: 25,
            severity: 'high' as const,
            message: 'Potential memory leak in Go routine'
          }]
        })
      }
    });

    const provider = new GeminiProvider({ apiKeys: ['test-api-key'] });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 789,
      repository: 'test/repo',
      branch: 'feature',
      files: ['main.go']
    });

    expect(result.summary).toBe('Gemini review complete');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].file).toBe('main.go');
    expect(result.suggestions[0].severity).toBe('high');
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should round-robin through multiple API keys', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          summary: 'Test review',
          suggestions: []
        })
      }
    });

    const provider = new GeminiProvider({ apiKeys: ['key1', 'key2', 'key3'] });

    const key1 = provider.getCurrentApiKey();
    provider.advanceToNextApiKey();
    const key2 = provider.getCurrentApiKey();
    provider.advanceToNextApiKey();
    const key3 = provider.getCurrentApiKey();
    provider.advanceToNextApiKey();
    const key1Again = provider.getCurrentApiKey();

    expect(key1).toBe('key1');
    expect(key2).toBe('key2');
    expect(key3).toBe('key3');
    expect(key1Again).toBe('key1');
  });

  it('should initialize and perform health check', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Hi'
      }
    });

    const provider = new GeminiProvider({ apiKeys: ['test-key'] });

    await expect(provider.initialize()).resolves.not.toThrow();
    expect(await provider.healthCheck()).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalledWith('Hi');
  });

  it('should return correct model info', () => {
    const provider = new GeminiProvider({
      apiKeys: ['test-key'],
      model: 'gemini-pro-vision',
      maxTokens: 1500
    });

    const modelInfo = provider.getModelInfo();
    expect(modelInfo.model).toBe('gemini-pro-vision');
    expect(modelInfo.maxTokens).toBe(1500);
  });

  it('should handle health check failure', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Error'));

    const provider = new GeminiProvider({ apiKeys: ['test-key'] });

    const isHealthy = await provider.healthCheck();
    expect(isHealthy).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API Error'));

    const provider = new GeminiProvider({ apiKeys: ['invalid-key'] });

    // Should throw sanitized error message
    await expect(provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['test.js']
    })).rejects.toThrow('Gemini API error: Request failed');
  });

  it('should parse JSON response correctly', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          summary: 'Excellent Go code!',
          suggestions: [
            {
              file: 'server.go',
              line: 42,
              severity: 'medium' as const,
              message: 'Missing error handling',
              suggestion: 'Add if err != nil check'
            }
          ]
        })
      }
    });

    const provider = new GeminiProvider({ apiKeys: ['test-api-key'] });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['server.go']
    });

    expect(result.summary).toBe('Excellent Go code!');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].severity).toBe('medium');
    expect(result.suggestions[0].file).toBe('server.go');
  });

  it('should handle non-JSON response gracefully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'The code looks good overall, no major issues found.'
      }
    });

    const provider = new GeminiProvider({ apiKeys: ['test-api-key'] });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['test.js']
    });

    expect(result.summary).toBe('The code looks good overall, no major issues found.');
    expect(result.suggestions).toHaveLength(0);
    expect(result.confidence).toBe(0.6);
  });

  it('should throw error with empty API keys', () => {
    expect(() => new GeminiProvider({
      apiKeys: []
    })).toThrow('At least one API key is required');
  });
});
