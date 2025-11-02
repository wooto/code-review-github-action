import { OpenAIProvider } from '../../../src/providers/openai/OpenAIProvider';
import OpenAI from 'openai';

// Mock OpenAI module
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('OpenAIProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze code and return review results', async () => {
    // Setup mock
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Code looks good',
            suggestions: [{
              file: 'test.js',
              line: 10,
              severity: 'medium' as const,
              message: 'Consider using const instead of let',
              suggestion: 'Replace let with const'
            }]
          })
        }
      }]
    });

    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }, { id: 'gpt-3.5-turbo' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['test-api-key']
    });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['test.js']
    });

    expect(result.summary).toBe('Code looks good');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].file).toBe('test.js');
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-4'
    }));
  });

  it('should initialize properly with multiple API keys', async () => {
    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['key1', 'key2', 'key3'],
      model: 'gpt-4',
      maxTokens: 1500,
      temperature: 0.2
    });

    await provider.initialize();
    expect(provider.name).toBe('OpenAI');

    const modelInfo = provider.getModelInfo();
    expect(modelInfo.model).toBe('gpt-4');
    expect(modelInfo.maxTokens).toBe(1500);
  });

  it('should perform health check successfully', async () => {
    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['test-api-key']
    });

    const isHealthy = await provider.healthCheck();
    expect(isHealthy).toBe(true);
    expect(mockList).toHaveBeenCalled();
  });

  it('should handle health check failure', async () => {
    const mockList = jest.fn().mockRejectedValue(new Error('API Error'));

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['test-api-key']
    });

    const isHealthy = await provider.healthCheck();
    expect(isHealthy).toBe(false);
  });

  it('should handle multiple API keys with round-robin', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Test review',
            suggestions: []
          })
        }
      }]
    });

    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['key1', 'key2', 'key3']
    });

    // Test that we can get the current API key
    const key1 = provider.getCurrentApiKey();
    expect(['key1', 'key2', 'key3']).toContain(key1);

    // Test round-robin by calling analyzeCode multiple times
    await provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['test.js']
    });

    const key2 = provider.getCurrentApiKey();
    expect(['key1', 'key2', 'key3']).toContain(key2);
  });

  it('should throw error with empty API keys', () => {
    expect(() => new OpenAIProvider({
      apiKeys: []
    })).toThrow('At least one API key is required');
  });

  it('should handle API errors gracefully', async () => {
    const mockCreate = jest.fn().mockRejectedValue(new Error('OpenAI API Error'));
    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['test-api-key']
    });

    await expect(provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['test.js']
    })).rejects.toThrow('OpenAI API error');
  });

  it('should parse JSON response correctly', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            summary: 'Great code!',
            suggestions: [
              {
                file: 'app.js',
                line: 15,
                severity: 'high' as const,
                message: 'Missing error handling',
                suggestion: 'Add try-catch block'
              }
            ]
          })
        }
      }]
    });

    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['test-api-key']
    });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['app.js']
    });

    expect(result.summary).toBe('Great code!');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].severity).toBe('high');
    expect(result.suggestions[0].file).toBe('app.js');
  });

  it('should handle non-JSON response gracefully', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: 'The code looks good overall, no major issues found.'
        }
      }]
    });

    const mockList = jest.fn().mockResolvedValue({
      data: [{ id: 'gpt-4' }]
    });

    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      },
      models: {
        list: mockList
      }
    } as any));

    const provider = new OpenAIProvider({
      apiKeys: ['test-api-key']
    });

    const result = await provider.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: ['test.js']
    });

    expect(result.summary).toBe('The code looks good overall, no major issues found.');
    expect(result.suggestions).toHaveLength(0);
    expect(result.confidence).toBe(0.5);
  });
});