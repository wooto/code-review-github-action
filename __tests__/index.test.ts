// __tests__/index.test.ts
import { run } from '../src/index';
import { GitHubClient } from '../src/github/GitHubClient';
import { ProviderManager } from '../src/providers/ProviderManager';
import { OpenAIProvider } from '../src/providers/openai/OpenAIProvider';

// Mock dependencies
jest.mock('../src/github/GitHubClient');
jest.mock('../src/providers/ProviderManager');
jest.mock('../src/providers/openai/OpenAIProvider');
jest.mock('../src/providers/claude/ClaudeProvider');
jest.mock('../src/providers/gemini/GeminiProvider');

// Mock @actions/core and @actions/github
jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
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
  }
}));

import * as core from '@actions/core';

describe('GitHub Action Integration', () => {
  let mockGitHubClient: jest.Mocked<GitHubClient>;
  let mockProviderManager: jest.Mocked<ProviderManager>;
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

    (GitHubClient as jest.Mock).mockImplementation(() => mockGitHubClient);
    (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

    // Get mock functions
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockGetMultilineInput = core.getMultilineInput as jest.MockedFunction<typeof core.getMultilineInput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;
    mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;

    // Set up default mock behavior for inputs
    mockGetInput.mockImplementation((name, options) => {
      switch (name) {
        case 'github-token':
          return 'test-token';
        case 'providers':
          return 'openai,claude';
        case 'review-focus':
          return 'security,performance';
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
          return ['test-openai-key-1', 'test-openai-key-2'];
        case 'claude-api-keys':
          return ['test-claude-key'];
        case 'gemini-api-keys':
          return [];
        default:
          return [];
      }
    });

    // Setup GitHub client mocks
    mockGitHubClient.getPRDiff.mockResolvedValue('test diff content');
    mockGitHubClient.createReviewComment.mockResolvedValue();
    mockGitHubClient.createReviewCommentThread.mockResolvedValue();

    // Setup provider manager mock
    mockProviderManager.analyzeCode.mockResolvedValue({
      summary: 'Review completed',
      suggestions: [
        {
          file: 'test.js',
          line: 10,
          severity: 'medium' as const,
          message: 'Consider improving this code',
          suggestion: 'Use const instead of let'
        },
        {
          file: 'security.js',
          line: 25,
          severity: 'high' as const,
          message: 'Potential SQL injection vulnerability',
          suggestion: 'Use parameterized queries'
        }
      ],
      confidence: 0.8
    });
  });

  it('should filter out skip patterns correctly', async () => {
    // Test that filtering logic works by directly testing the DiffProcessor
    const { DiffProcessor } = require('../src/diff/DiffProcessor');
    const processor = new DiffProcessor();

    const files = ['app.js', 'app.min.js', 'package-lock.json', 'README.md'];
    const skipPatterns = ['*.min.js', 'package-lock.json'];

    const filtered = processor.filterFiles(files, skipPatterns);

    // Should filter out the matching patterns
    expect(filtered).toEqual(['app.js', 'README.md']);
    expect(filtered).not.toContain('app.min.js');
    expect(filtered).not.toContain('package-lock.json');
  });

  it('should process PR and create review with all components', async () => {
    await expect(run()).resolves.not.toThrow();

    // Verify GitHub client usage
    expect(mockGitHubClient.getPRDiff).toHaveBeenCalledWith('test-owner', 'test-repo', 123);
    expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();

    // Verify high severity issues get individual comments
    expect(mockGitHubClient.createReviewCommentThread).toHaveBeenCalledWith(
      'test-owner',
      'test-repo',
      123,
      {
        path: 'security.js',
        line: 25,
        body: expect.stringContaining('🚨 **High Severity Issue**')
      }
    );

    // Verify provider manager usage
    expect(mockProviderManager.analyzeCode).toHaveBeenCalled();

    // Verify outputs
    expect(mockSetOutput).toHaveBeenCalledWith(
      'review-summary',
      expect.stringContaining('🤖 AI Code Review Summary')
    );
    expect(mockInfo).toHaveBeenCalledWith('Review completed with 2 suggestions');
  });

  it('should handle empty diff gracefully', async () => {
    mockGitHubClient.getPRDiff.mockResolvedValue('');

    await run();

    expect(mockInfo).toHaveBeenCalledWith('No changes found in PR');
    expect(mockProviderManager.analyzeCode).not.toHaveBeenCalled();
  });

  it('should handle provider failures gracefully', async () => {
    mockProviderManager.analyzeCode.mockRejectedValue(new Error('Provider API error'));

    await run();

    expect(mockWarning).toHaveBeenCalledWith('Failed to analyze chunk: Error: Provider API error');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  it('should validate required API keys', async () => {
    mockGetMultilineInput.mockImplementation((name) => {
      // No API keys provided
      return [];
    });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(
      'No valid providers configured. Please provide at least one API key.'
    );
  });

  it('should handle missing pull request context', async () => {
    // Clear previous mocks and set up new context
    jest.clearAllMocks();

    // Re-mock github with missing PR context
    const githubModule = require('@actions/github');
    githubModule.context = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      payload: {}
    };

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith(
      'This action can only be run on pull requests'
    );
  });
});