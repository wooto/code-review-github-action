// Integration tests for the complete AI Code Review Action using mock infrastructure
import { run } from '../../index';
import { MockGitHubClient } from '../mocks/mockGitHubHelpers';
import { MockProvider, createMockOpenAIProvider, createMockClaudeProvider, createMockGeminiProvider } from '../mocks/mockProviderHelpers';
import { getScenario, TestScenario } from '../scenarios/reviewScenarioDefinitions';

// Mock external dependencies
jest.mock('@actions/core');
jest.mock('@actions/github');
jest.mock('../../github/GitHubClient');
jest.mock('../../providers/openai/OpenAIProvider');
jest.mock('../../providers/claude/ClaudeProvider');
jest.mock('../../providers/gemini/GeminiProvider');
jest.mock('../../providers/ProviderManager');
jest.mock('../../diff/DiffProcessor');

import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from '../../github/GitHubClient';
import { OpenAIProvider } from '../../providers/openai/OpenAIProvider';
import { ClaudeProvider } from '../../providers/claude/ClaudeProvider';
import { GeminiProvider } from '../../providers/gemini/GeminiProvider';
import { ProviderManager } from '../../providers/ProviderManager';
import { DiffProcessor } from '../../diff/DiffProcessor';

describe('Action Integration Tests - Full Execution Flow', () => {
  let mockGitHubClient: jest.Mocked<MockGitHubClient>;
  let mockGetInput: jest.MockedFunction<typeof core.getInput>;
  let mockGetMultilineInput: jest.MockedFunction<typeof core.getMultilineInput>;
  let mockInfo: jest.MockedFunction<typeof core.info>;
  let mockWarning: jest.MockedFunction<typeof core.warning>;
  let mockSetFailed: jest.MockedFunction<typeof core.setFailed>;
  let mockSetOutput: jest.MockedFunction<typeof core.setOutput>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup MockGitHubClient
    mockGitHubClient = new MockGitHubClient() as jest.Mocked<MockGitHubClient>;
    (GitHubClient as jest.Mock).mockImplementation(() => mockGitHubClient);

    // Setup core mocks
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockGetMultilineInput = core.getMultilineInput as jest.MockedFunction<typeof core.getMultilineInput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockWarning = core.warning as jest.MockedFunction<typeof core.warning>;
    mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;

    // Setup default core mock implementations
    mockGetInput.mockImplementation((_name) => 'test-token');
    mockGetMultilineInput.mockReturnValue(['test-key']);
    mockInfo.mockImplementation(() => {});
    mockWarning.mockImplementation(() => {});
    mockSetFailed.mockImplementation(() => {});
    mockSetOutput.mockImplementation(() => {});

    // Setup GitHub context
    (github.context as any) = {
      repo: { owner: 'test-owner', repo: 'test-repo' },
      payload: { pull_request: { number: 123, head: { ref: 'feature-branch' } } }
    };
  });

  // Helper function to setup a test scenario
  const setupScenario = (scenario: TestScenario) => {
    // Setup GitHub context
    (github.context as any) = {
      repo: { owner: scenario.mockPRContext.owner, repo: scenario.mockPRContext.repo },
      payload: {
        pull_request: {
          number: scenario.mockPRContext.prNumber,
          head: { ref: 'feature-branch' }
        }
      }
    };

    // Setup action inputs
    mockGetInput.mockImplementation((name: string) => {
      const inputs = scenario.actionInputs;
      if (name in inputs) {
        const value = inputs[name as keyof typeof inputs];
        return Array.isArray(value) ? value.join(',') : value as string;
      }
      return '';
    });

    mockGetMultilineInput.mockImplementation((name: string) => {
      const inputs = scenario.actionInputs;
      if (name in inputs) {
        const value = inputs[name as keyof typeof inputs];
        return Array.isArray(value) ? value : [];
      }
      return [];
    });

    // Setup mock GitHub client
    mockGitHubClient.addMockPR(
      scenario.mockPRContext.owner,
      scenario.mockPRContext.repo,
      scenario.mockPRContext.prNumber,
      {
        number: scenario.mockPRContext.prNumber,
        title: scenario.mockPRContext.title,
        baseSha: scenario.mockPRContext.baseSha,
        headSha: scenario.mockPRContext.headSha,
        files: scenario.mockPRContext.files
      }
    );

    mockGitHubClient.addMockDiff(
      scenario.mockPRContext.owner,
      scenario.mockPRContext.repo,
      scenario.mockPRContext.prNumber,
      scenario.diffContent
    );

    // Clear previous data
    mockGitHubClient.clearCreatedData();

    // Setup mock providers if scenario specifies mock response
    if (scenario.mockScenario) {
      const mockProviders: MockProvider[] = [];
      const enabledProviders = scenario.actionInputs.providers?.split(',').map(p => p.trim()) || [];

      if (enabledProviders.includes('openai') && scenario.actionInputs['openai-api-keys']?.length) {
        const provider = createMockOpenAIProvider(scenario.mockScenario);
        if (scenario.name === 'provider-failure') {
          provider.setFailure(true, 'Rate limit exceeded');
        }
        mockProviders.push(provider);
      }

      if (enabledProviders.includes('claude') && scenario.actionInputs['claude-api-keys']?.length) {
        const provider = createMockClaudeProvider(scenario.mockScenario);
        if (scenario.name === 'provider-failure') {
          provider.setFailure(true, 'Service unavailable');
        }
        mockProviders.push(provider);
      }

      if (enabledProviders.includes('gemini') && scenario.actionInputs['gemini-api-keys']?.length) {
        const provider = createMockGeminiProvider(scenario.mockScenario);
        mockProviders.push(provider);
      }

      // Mock ProviderManager to return our mock providers
      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async (diff: string, context: any) => {
          // Use the first provider for analysis (simulate ProviderManager behavior)
          if (mockProviders.length > 0) {
            return mockProviders[0].analyzeCode(diff, context);
          }
          throw new Error('No providers available');
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
    }

    // Setup DiffProcessor
    const mockDiffProcessor = {
      chunkDiff: jest.fn().mockReturnValue([{
        content: scenario.diffContent || 'Sample diff',
        files: scenario.mockPRContext.files,
        size: scenario.diffContent.length || 100
      }]),
      buildContext: jest.fn().mockReturnValue({
        prNumber: scenario.mockPRContext.prNumber,
        repository: `${scenario.mockPRContext.owner}/${scenario.mockPRContext.repo}`,
        branch: 'feature-branch',
        files: scenario.mockPRContext.files
      }),
      filterFiles: jest.fn().mockImplementation((files: string[], patterns: string[]) => {
        if (!patterns || patterns.length === 0) return files;

        return files.filter(file => {
          return !patterns.some(pattern => {
            if (pattern.startsWith('*')) {
              const suffix = pattern.substring(1);
              return file.endsWith(suffix);
            }
            return file === pattern;
          });
        });
      })
    } as any;

    (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);
  };

  // Helper function to verify scenario outcomes
  const verifyScenarioOutcome = async (scenario: TestScenario) => {
    const { expectedOutcome } = scenario;

    if (expectedOutcome.shouldSucceed) {
      // Should not call setFailed
      expect(mockSetFailed).not.toHaveBeenCalled();

      // Should create review comment if expected
      if (expectedOutcome.shouldCreateReviewComment) {
        expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
      }

      // Check output contains expected strings
      if (expectedOutcome.expectedOutputContains && expectedOutcome.expectedOutputContains.length > 0) {
        for (const expectedString of expectedOutcome.expectedOutputContains) {
          expect(mockSetOutput).toHaveBeenCalledWith(
            'review-summary',
            expect.stringContaining(expectedString)
          );
        }
      }

      // Check created comments count
      if (expectedOutcome.expectedCommentsCreated !== undefined) {
        const totalComments = mockGitHubClient.getCreatedReviews().length +
                            mockGitHubClient.getCreatedComments().length;
        expect(totalComments).toBeGreaterThanOrEqual(expectedOutcome.expectedCommentsCreated);
      }

    } else {
      // Should fail with expected error
      expect(mockSetFailed).toHaveBeenCalledWith(
        expectedOutcome.errorMessage || expect.any(String)
      );
    }
  };

  describe('Complete Action Execution Flow Tests', () => {
    it('should handle basic review scenario successfully', async () => {
      const scenario = getScenario('basic-review')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify specific workflow steps
      expect(mockGitHubClient.getPRDiff).toHaveBeenCalledWith(
        scenario.mockPRContext.owner,
        scenario.mockPRContext.repo,
        scenario.mockPRContext.prNumber
      );

      expect(mockInfo).toHaveBeenCalledWith(`Processing PR #${scenario.mockPRContext.prNumber} in ${scenario.mockPRContext.owner}/${scenario.mockPRContext.repo}`);
      expect(mockInfo).toHaveBeenCalledWith(`Using providers: ${scenario.actionInputs.providers}`);
    });

    it('should handle security issues scenario and create high severity comments', async () => {
      const scenario = getScenario('security-issues')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify high severity comments are created
      const individualComments = mockGitHubClient.getCreatedComments();
      expect(individualComments.length).toBeGreaterThan(0);

      // Verify comment format for high severity issues
      individualComments.forEach(comment => {
        expect(comment.body).toContain('🚨 **High Severity Issue**');
      });
    });

    it('should handle performance issues scenario', async () => {
      const scenario = getScenario('performance-issues')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Focus Areas:** performance')
      );
    });

    it('should handle no issues scenario gracefully', async () => {
      const scenario = getScenario('no-issues')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('🎉 No issues found! Your code looks great.')
      );
    });

    it('should handle error handling scenario', async () => {
      const scenario = getScenario('error-handling')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Should still create review comments despite error handling issues
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle empty PR scenario without errors', async () => {
      const scenario = getScenario('empty-pr')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      expect(mockInfo).toHaveBeenCalledWith('No changes found in PR');
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
    });

    it('should handle configuration error (no API keys)', async () => {
      const scenario = getScenario('no-api-keys')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      expect(mockSetFailed).toHaveBeenCalledWith(
        'No valid providers configured. Please provide at least one API key.'
      );
    });

    it('should handle provider failures gracefully', async () => {
      const scenario = getScenario('provider-failure')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Should still succeed despite provider failures
      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk:')
      );
    });

    it('should respect skip patterns', async () => {
      const scenario = getScenario('skip-patterns')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify that filtered files were processed
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });
  });

  describe('GitHub API Integration Tests', () => {
    it('should properly interact with GitHub API for review creation', async () => {
      const scenario = getScenario('basic-review')!;
      setupScenario(scenario);

      await run();

      // Verify GitHub API calls
      expect(mockGitHubClient.getPRDiff).toHaveBeenCalledTimes(1);
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalledTimes(1);

      // Verify review comment format
      const createdReviews = mockGitHubClient.getCreatedReviews();
      expect(createdReviews[0].body).toContain('🤖 AI Code Review Summary');
      expect(createdReviews[0].body).toContain('Focus Areas:');
      expect(createdReviews[0].body).toContain('Files Analyzed:');
      expect(createdReviews[0].body).toContain('Suggestions Found:');
    });

    it('should create individual comments for high severity issues', async () => {
      const scenario = getScenario('security-issues')!;
      setupScenario(scenario);

      await run();

      const createdComments = mockGitHubClient.getCreatedComments();
      expect(createdComments.length).toBeGreaterThan(0);

      // Verify individual comment format
      createdComments.forEach(comment => {
        expect(comment.body).toContain('🚨 **High Severity Issue**');
        expect(typeof comment.path).toBe('string');
        expect(typeof comment.line).toBe('number');
      });
    });

    it('should handle GitHub API errors gracefully', async () => {
      const scenario = getScenario('basic-review')!;
      setupScenario(scenario);

      // Simulate GitHub API failure
      mockGitHubClient.setFailure(true, 'Rate limit exceeded');

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('GitHub API Error: Rate limit exceeded');
    });
  });

  describe('Provider Integration Tests', () => {
    it('should initialize providers with correct API keys', async () => {
      const scenario = getScenario('basic-review')!;
      setupScenario(scenario);

      await run();

      // Verify provider initialization
      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: scenario.actionInputs['openai-api-keys']
        })
      );
      expect(ClaudeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: scenario.actionInputs['claude-api-keys']
        })
      );
      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: scenario.actionInputs['gemini-api-keys']
        })
      );
    });

    it('should use only enabled providers', async () => {
      const customScenario = { ...getScenario('basic-review')! };
      customScenario.actionInputs.providers = 'openai,claude';
      customScenario.actionInputs['gemini-api-keys'] = [];

      setupScenario(customScenario);

      await run();

      expect(OpenAIProvider).toHaveBeenCalled();
      expect(ClaudeProvider).toHaveBeenCalled();
      expect(GeminiProvider).not.toHaveBeenCalled();
    });

    it('should handle provider API failures gracefully', async () => {
      const scenario = getScenario('provider-failure')!;
      setupScenario(scenario);

      await run();

      // Should not fail the entire action due to provider issues
      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk:')
      );
    });
  });

  describe('Multi-Chunk Processing Tests', () => {
    it('should handle large PRs with multiple chunks', async () => {
      const scenario = getScenario('performance-issues')!;
      setupScenario(scenario);

      // Mock multiple chunks
      const mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;
      mockDiffProcessor.chunkDiff.mockReturnValue([
        {
          content: 'Chunk 1 content',
          files: ['file1.ts'],
          size: 1500
        },
        {
          content: 'Chunk 2 content',
          files: ['file2.ts'],
          size: 1200
        },
        {
          content: 'Chunk 3 content',
          files: ['file3.ts'],
          size: 1800
        }
      ]);

      (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

      await run();

      // Should process all chunks
      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (1500 bytes, 1 files)');
      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (1200 bytes, 1 files)');
      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (1800 bytes, 1 files)');
    });
  });

  describe('Configuration and Input Validation', () => {
    it('should handle custom chunk size configuration', async () => {
      const scenario = getScenario('basic-review')!;
      scenario.actionInputs['chunk-size'] = '5000';
      setupScenario(scenario);

      await run();

      expect(DiffProcessor).toHaveBeenCalledWith(5000);
    });

    it('should handle custom review focus', async () => {
      const scenario = getScenario('basic-review')!;
      scenario.actionInputs['review-focus'] = 'security,testing';
      setupScenario(scenario);

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Focus Areas:** security,testing')
      );
    });

    it('should handle custom skip patterns', async () => {
      const scenario = getScenario('skip-patterns')!;
      setupScenario(scenario);

      await run();

      // Verify filtering was applied
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle missing pull request context', async () => {
      (github.context as any).payload = {};

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        'This action can only be run on pull requests'
      );
    });
  });

  describe('Output Generation Tests', () => {
    it('should generate properly formatted review summary', async () => {
      const scenario = getScenario('basic-review')!;
      setupScenario(scenario);

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringMatching(/🤖 AI Code Review Summary[\s\S]*Focus Areas:[\s\S]*Files Analyzed:[\s\S]*Suggestions Found:/)
      );
    });

    it('should include action outputs for downstream workflows', async () => {
      const scenario = getScenario('security-issues')!;
      setupScenario(scenario);

      await run();

      expect(mockSetOutput).toHaveBeenCalledWith('review-summary', expect.any(String));
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing after partial chunk failures', async () => {
      const scenario = getScenario('provider-failure')!;
      setupScenario(scenario);

      // Mock multiple chunks with one failing
      const mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;
      mockDiffProcessor.chunkDiff.mockReturnValue([
        { content: 'Chunk 1', files: ['file1.ts'], size: 100 },
        { content: 'Chunk 2', files: ['file2.ts'], size: 100 }
      ]);

      // Configure ProviderManager mock to fail on second chunk
      let callCount = 0;
      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Provider API error');
          }
          return {
            summary: 'Chunk analysis result',
            suggestions: [],
            confidence: 0.8
          };
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk:')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('Additional Scenario Tests', () => {
    it('should handle multi-provider conflict scenario', async () => {
      const scenario = getScenario('multi-provider-conflict')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify multiple providers were used
      expect(OpenAIProvider).toHaveBeenCalled();
      expect(ClaudeProvider).toHaveBeenCalled();
      expect(GeminiProvider).toHaveBeenCalled();

      // Verify combined suggestions from multiple providers
      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Suggestions Found:** 3')
      );
    });

    it('should handle large-scale PR scenario with multiple chunks', async () => {
      const scenario = getScenario('large-scale-pr')!;
      setupScenario(scenario);

      // Mock many chunks to simulate large PR
      const mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;
      const chunks = Array.from({ length: 5 }, (_, i) => ({
        content: `Large chunk ${i + 1} with substantial changes...`,
        files: [`src/auth/file${i + 1}.ts`],
        size: 2000
      }));
      mockDiffProcessor.chunkDiff.mockReturnValue(chunks);

      (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

      await run();

      await verifyScenarioOutcome(scenario);

      // Should process all chunks - verify through ProviderManager mock calls
      expect(ProviderManager).toHaveBeenCalled();
      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (2000 bytes, 1 files)');
    });

    it('should handle network timeout and retry logic scenario', async () => {
      const scenario = getScenario('network-timeout-retry')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify retry logic suggestions are included
      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Suggestions Found:** 2')
      );
    });

    it('should handle multi-language scenario', async () => {
      const scenario = getScenario('multi-language')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify different file types are processed
      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Suggestions Found:** 3')
      );
    });

    it('should handle custom prompt override scenario', async () => {
      const scenario = getScenario('custom-prompt-override')!;
      setupScenario(scenario);

      await run();

      await verifyScenarioOutcome(scenario);

      // Verify custom prompt focus is reflected in output
      expect(mockSetOutput).toHaveBeenCalledWith(
        'review-summary',
        expect.stringContaining('**Focus Areas:** validation')
      );

      // Verify custom prompt was used
      const customPrompt = scenario.actionInputs['custom-prompt'];
      expect(customPrompt).toContain('validation logic');
    });

    it('should handle custom chunk size in large PR scenario', async () => {
      const scenario = getScenario('large-scale-pr')!;
      setupScenario(scenario);

      await run();

      // Verify custom chunk size was used
      expect(DiffProcessor).toHaveBeenCalledWith(1500);
    });

    it('should handle multiple API keys per provider', async () => {
      const scenario = getScenario('large-scale-pr')!;
      setupScenario(scenario);

      await run();

      // Verify multiple API keys were configured
      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: ['sk-test-key-1', 'sk-test-key-2']
        })
      );
    });

    it('should handle provider-specific response styles', async () => {
      const scenario = getScenario('multi-provider-conflict')!;
      setupScenario(scenario);

      await run();

      // Verify each provider was initialized with correct API keys
      expect(OpenAIProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: scenario.actionInputs['openai-api-keys']
        })
      );
      expect(ClaudeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: scenario.actionInputs['claude-api-keys']
        })
      );
      expect(GeminiProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeys: scenario.actionInputs['gemini-api-keys']
        })
      );
    });
  });
});
