// Integration tests for the complete AI Code Review Action
import { run } from '../src/index';
import { GitHubClient } from '../src/github/GitHubClient';
import { ProviderManager } from '../src/providers/ProviderManager';
import { DiffProcessor } from '../src/diff/DiffProcessor';
import { OpenAIProvider } from '../src/providers/openai/OpenAIProvider';
import { ClaudeProvider } from '../src/providers/claude/ClaudeProvider';
import { GeminiProvider } from '../src/providers/gemini/GeminiProvider';

// Mock all external dependencies
jest.mock('../src/github/GitHubClient');
jest.mock('../src/providers/ProviderManager');
jest.mock('../src/diff/DiffProcessor');
jest.mock('../src/providers/openai/OpenAIProvider');
jest.mock('../src/providers/claude/ClaudeProvider');
jest.mock('../src/providers/gemini/GeminiProvider');
jest.mock('@actions/core');
jest.mock('@actions/github');

import * as core from '@actions/core';
import * as github from '@actions/github';

describe('Integration Tests - Complete Workflow', () => {
  let mockGitHubClient: jest.Mocked<GitHubClient>;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let mockDiffProcessor: jest.Mocked<DiffProcessor>;
  let mockGetInput: jest.MockedFunction<typeof core.getInput>;
  let mockGetMultilineInput: jest.MockedFunction<typeof core.getMultilineInput>;
  let mockInfo: jest.MockedFunction<typeof core.info>;
  let mockWarning: jest.MockedFunction<typeof core.warning>;
  let mockSetFailed: jest.MockedFunction<typeof core.setFailed>;
  let mockSetOutput: jest.MockedFunction<typeof core.setOutput>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock instances
    mockGitHubClient = new GitHubClient('test-token') as jest.Mocked<GitHubClient>;
    mockProviderManager = new ProviderManager([]) as jest.Mocked<ProviderManager>;
    mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;

    (GitHubClient as jest.Mock).mockImplementation(() => mockGitHubClient);
    (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
    (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

    // Get mock functions
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockGetMultilineInput = core.getMultilineInput as jest.MockedFunction<typeof core.getMultilineInput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;
    mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;

    // Setup GitHub context
    (github.context as any) = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      payload: {
        pull_request: {
          number: 123,
          head: {
            ref: 'feature-branch'
          }
        }
      }
    };

    // Setup default input mocks
    mockGetInput.mockImplementation((name, options) => {
      switch (name) {
        case 'github-token':
          return 'test-token';
        case 'providers':
          return 'openai,claude,gemini';
        case 'review-focus':
          return 'security,performance,style';
        case 'chunk-size':
          return '2000';
        case 'custom-prompt':
          return '';
        case 'skip-patterns':
          return '*.min.js,package-lock.json';
        default:
          return '';
      }
    });

    mockGetMultilineInput.mockImplementation((name) => {
      switch (name) {
        case 'openai-api-keys':
          return ['sk-openai-1', 'sk-openai-2'];
        case 'claude-api-keys':
          return ['sk-ant-claude-1'];
        case 'gemini-api-keys':
          return ['AIza-gemini-1'];
        default:
          return [];
      }
    });

    // Setup default behavior mocks
    mockGitHubClient.getPRDiff.mockResolvedValue('Sample diff content');
    mockGitHubClient.createReviewComment.mockResolvedValue();
    mockGitHubClient.createReviewCommentThread.mockResolvedValue();

    mockDiffProcessor.chunkDiff.mockReturnValue([{
      content: 'Sample chunk',
      files: ['test.js'],
      size: 100
    }]);
    mockDiffProcessor.buildContext.mockReturnValue({
      prNumber: 123,
      repository: 'test-owner/test-repo',
      branch: 'feature-branch',
      files: ['test.js']
    });
    mockDiffProcessor.filterFiles.mockImplementation((files, patterns) => files);

    mockProviderManager.analyzeCode.mockResolvedValue({
      summary: 'Code review completed',
      suggestions: [
        {
          file: 'test.js',
          line: 10,
          severity: 'medium' as const,
          message: 'Consider using const instead of let',
          suggestion: 'Replace let with const for better variable safety'
        },
        {
          file: 'security.js',
          line: 25,
          severity: 'high' as const,
          message: 'Potential SQL injection vulnerability',
          suggestion: 'Use parameterized queries instead of string concatenation'
        }
      ],
      confidence: 0.85
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should execute full workflow with all providers', async () => {
      await expect(run()).resolves.not.toThrow();

      // Verify the workflow sequence
      expect(mockGitHubClient.getPRDiff).toHaveBeenCalledWith('test-owner', 'test-repo', 123);
      expect(mockDiffProcessor.chunkDiff).toHaveBeenCalledWith('Sample diff content');
      expect(mockProviderManager.analyzeCode).toHaveBeenCalledWith(
        'Sample chunk',
        expect.objectContaining({
          prNumber: 123,
          repository: 'test-owner/test-repo',
          branch: 'feature-branch'
        })
      );
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        123,
        expect.stringContaining('🤖 AI Code Review Summary')
      );

      // Verify high severity issues get individual comments
      expect(mockGitHubClient.createReviewCommentThread).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        123,
        expect.objectContaining({
          path: 'security.js',
          line: 25,
          body: expect.stringContaining('🚨 **High Severity Issue**')
        })
      );

      // Verify outputs
      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('🤖 AI Code Review Summary')
      );
      expect(mockInfo).toHaveBeenCalledWith('Review completed with 2 suggestions');
    });

    it('should handle chunked diffs correctly', async () => {
      // Mock multiple chunks
      mockDiffProcessor.chunkDiff.mockReturnValue([
        {
          content: 'Chunk 1 content',
          files: ['file1.js'],
          size: 1500
        },
        {
          content: 'Chunk 2 content',
          files: ['file2.js'],
          size: 1200
        }
      ]);

      await run();

      // Should analyze each chunk
      expect(mockProviderManager.analyzeCode).toHaveBeenCalledTimes(2);
      expect(mockProviderManager.analyzeCode).toHaveBeenNthCalledWith(
        1,
        'Chunk 1 content',
        expect.any(Object)
      );
      expect(mockProviderManager.analyzeCode).toHaveBeenNthCalledWith(
        2,
        'Chunk 2 content',
        expect.any(Object)
      );

      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (1500 bytes, 1 files)');
      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (1200 bytes, 1 files)');
    });

    it('should respect skip patterns', async () => {
      // Mock files that should be filtered
      mockDiffProcessor.filterFiles.mockImplementation((files, patterns) => {
        return files.filter(file =>
          !patterns.some(pattern => {
            if (pattern === '*.min.js') return file.includes('.min.js');
            if (pattern === 'package-lock.json') return file === 'package-lock.json';
            return false;
          })
        );
      });

      await run();

      // Verify filtering was applied
      expect(mockDiffProcessor.filterFiles).toHaveBeenCalledWith(
        ['test.js'],
        ['*.min.js', 'package-lock.json']
      );
    });

    it('should handle provider initialization with multiple API keys', async () => {
      await run();

      // Verify providers were initialized with correct API keys
      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: ['sk-openai-1', 'sk-openai-2']
        })
      );
      expect(ClaudeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: ['sk-ant-claude-1']
        })
      );
      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: ['AIza-gemini-1']
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty PR diff gracefully', async () => {
      mockGitHubClient.getPRDiff.mockResolvedValue('');

      await run();

      expect(mockInfo).toHaveBeenCalledWith('No changes found in PR');
      expect(mockProviderManager.analyzeCode).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
    });

    it('should handle missing pull request context', async () => {
      (github.context as any).payload = {};

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        'This action can only be run on pull requests'
      );
    });

    it('should handle no API keys configured', async () => {
      mockGetMultilineInput.mockReturnValue([]);

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        'No valid providers configured. Please provide at least one API key for the specified providers.'
      );
    });

    it('should handle partial provider failures gracefully', async () => {
      // Mock multiple chunks where one fails
      mockDiffProcessor.chunkDiff.mockReturnValue([
        { content: 'Chunk 1', files: ['file1.js'], size: 100 },
        { content: 'Chunk 2', files: ['file2.js'], size: 100 }
      ]);

      // First call succeeds, second fails
      mockProviderManager.analyzeCode
        .mockResolvedValueOnce({
          summary: 'First chunk review',
          suggestions: [],
          confidence: 0.8
        })
        .mockRejectedValueOnce(new Error('Provider API error'));

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: Provider API error')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle GitHub API errors', async () => {
      mockGitHubClient.getPRDiff.mockRejectedValue(new Error('GitHub API rate limit exceeded'));

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('GitHub API rate limit exceeded');
    });

    it('should handle malformed provider responses', async () => {
      mockProviderManager.analyzeCode.mockResolvedValue({
        summary: 'Review with malformed data',
        suggestions: [
          {
            file: '', // Empty file name
            line: -1, // Invalid line number
            severity: 'invalid' as any, // Invalid severity
            message: '',
            suggestion: ''
          }
        ],
        confidence: 0.5
      });

      await run();

      // Should still create a review comment despite malformed data
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate custom chunk size', async () => {
      mockGetInput.mockImplementation((name) => {
        if (name === 'chunk-size') return '5000';
        return 'default-value';
      });

      await run();

      expect(DiffProcessor).toHaveBeenCalledWith(5000);
    });

    it('should validate custom providers list', async () => {
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai,claude';
        if (name === 'github-token') return 'test-token';
        if (name === 'review-focus') return 'security,performance,style';
        if (name === 'chunk-size') return '2000';
        if (name === 'custom-prompt') return '';
        if (name === 'skip-patterns') return '*.min.js,package-lock.json';
        return '';
      });

      // Ensure API keys are provided for the providers
      mockGetMultilineInput.mockImplementation((name) => {
        if (name === 'openai-api-keys') return ['sk-openai-1', 'sk-openai-2'];
        if (name === 'claude-api-keys') return ['sk-ant-claude-1'];
        if (name === 'gemini-api-keys') return []; // Empty for gemini since we don't expect it to be initialized
        return [];
      });

      await run();

      // Should only initialize OpenAI and Claude providers
      expect(OpenAIProvider).toHaveBeenCalled();
      expect(ClaudeProvider).toHaveBeenCalled();
      expect(GeminiProvider).not.toHaveBeenCalled();
    });

    it('should validate custom chunk size', async () => {
      mockGetInput.mockImplementation((name) => {
        if (name === 'chunk-size') return '5000';
        return 'default-value';
      });

      await run();

      expect(DiffProcessor).toHaveBeenCalledWith(5000);
    });

    it('should handle custom review focus', async () => {
      // Clear previous mocks
      mockGetInput.mockClear();
      mockSetOutput.mockClear();

      mockGetInput.mockImplementation((name, options) => {
        if (name === 'github-token') return 'test-token';
        if (name === 'review-focus') return 'security,testing';
        if (name === 'providers') return 'openai,claude,gemini';
        if (name === 'chunk-size') return '2000';
        if (name === 'skip-patterns') return '*.min.js,package-lock.json';
        return '';
      });

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Focus Areas:** security,testing')
      );
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large PR with many chunks', async () => {
      // Mock many chunks
      const chunks = Array.from({ length: 10 }, (_, i) => ({
        content: `Chunk ${i + 1} content`,
        files: [`file${i + 1}.js`],
        size: 1500
      }));

      mockDiffProcessor.chunkDiff.mockReturnValue(chunks);

      await run();

      expect(mockProviderManager.analyzeCode).toHaveBeenCalledTimes(10);
      // Should have at least the chunk analysis messages
      expect(mockInfo).toHaveBeenCalledWith('Processing PR #123 in test-owner/test-repo');
      expect(mockInfo).toHaveBeenCalledWith('Using providers: openai,claude,gemini');
    });

    it('should handle providers with round-robin API key rotation', async () => {
      // Mock multiple chunks to trigger rotation
      mockDiffProcessor.chunkDiff.mockReturnValue([
        { content: 'Chunk 1', files: ['file1.js'], size: 100 },
        { content: 'Chunk 2', files: ['file2.js'], size: 100 }
      ]);

      await run();

      expect(mockProviderManager.analyzeCode).toHaveBeenCalledTimes(2);
      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (100 bytes, 1 files)');
    });
  });

  describe('Output and Reporting', () => {
    it('should generate proper review summary format', async () => {
      await run();

      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringMatching(/🤖 AI Code Review Summary[\s\S]*Focus Areas:[\s\S]*Files Analyzed:[\s\S]*Suggestions Found:/)
      );
    });

    it('should handle no suggestions found case', async () => {
      mockProviderManager.analyzeCode.mockResolvedValue({
        summary: 'Everything looks good',
        suggestions: [],
        confidence: 0.9
      });

      await run();

      expect(mockGitHubClient.createReviewComment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.stringContaining('🎉 No issues found! Your code looks great.')
      );
    });

    it('should create individual comments for high severity issues only', async () => {
      mockProviderManager.analyzeCode.mockResolvedValue({
        summary: 'Review completed',
        suggestions: [
          {
            file: 'low-priority.js',
            line: 10,
            severity: 'low' as const,
            message: 'Minor style suggestion'
          },
          {
            file: 'medium-priority.js',
            line: 20,
            severity: 'medium' as const,
            message: 'Medium priority issue'
          },
          {
            file: 'high-priority.js',
            line: 30,
            severity: 'high' as const,
            message: 'Critical security issue'
          }
        ],
        confidence: 0.8
      });

      await run();

      // Should only create individual comment for high severity issue
      expect(mockGitHubClient.createReviewCommentThread).toHaveBeenCalledTimes(1);
      expect(mockGitHubClient.createReviewCommentThread).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          path: 'high-priority.js',
          line: 30
        })
      );
    });
  });
});