// Comprehensive Error Handling Tests for AI Code Review Action
// These tests cover various failure scenarios, edge cases, and error recovery mechanisms

import { run } from '../../index';
import { MockGitHubClient } from '../mocks/mockGitHubHelpers';
import {
  MockProvider,
  createTimeoutOpenAIProvider,
  createTimeoutClaudeProvider,
  createTimeoutGeminiProvider,
  createRateLimitOpenAIProvider,
  createRateLimitClaudeProvider,
  createRateLimitGeminiProvider,
  createNetworkErrorOpenAIProvider,
  createNetworkErrorClaudeProvider,
  createNetworkErrorGeminiProvider,
  createMalformedOpenAIProvider,
  createMalformedClaudeProvider,
  createMalformedGeminiProvider,
  createIntermittentFailureProvider,
  createSlowOpenAIProvider,
  createSlowClaudeProvider,
  createSlowGeminiProvider
} from '../mocks/mockProviderHelpers';

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

describe('Error Handling and Edge Cases', () => {
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
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case 'providers': return 'openai,claude,gemini';
        case 'chunk-size': return '2000';
        case 'github-token': return 'test-token';
        default: return 'test-token';
      }
    });
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

    // Setup basic mock PR
    mockGitHubClient.addMockPR('test-owner', 'test-repo', 123, {
      number: 123,
      title: 'Test PR',
      baseSha: 'abc123',
      headSha: 'def456',
      files: ['src/test.ts']
    });

    mockGitHubClient.addMockDiff('test-owner', 'test-repo', 123, `File: src/test.ts
@@ -1,5 +1,7 @@
 function test() {
-  console.log('old');
+  console.log('new');
+  // Added new line
+  return true;
 }`);

    // Setup default DiffProcessor
    const mockDiffProcessor = {
      chunkDiff: jest.fn().mockReturnValue([{
        content: 'Sample diff content',
        files: ['src/test.ts'],
        size: 100
      }]),
      buildContext: jest.fn().mockReturnValue({
        prNumber: 123,
        repository: 'test-owner/test-repo',
        branch: 'feature-branch',
        files: ['src/test.ts']
      }),
      filterFiles: jest.fn().mockImplementation((files: string[], patterns: string[]) => files)
    } as any;

    (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);
  });

  afterEach(() => {
    // Reset GitHub client state between tests
    if (mockGitHubClient) {
      mockGitHubClient.setFailure(false);
      mockGitHubClient.resetFailures();
      mockGitHubClient.clearCreatedData();
    }

    // Reset all core mocks to prevent state bleeding
    mockGetInput.mockClear();
    mockGetMultilineInput.mockClear();
    mockInfo.mockClear();
    mockWarning.mockClear();
    mockSetFailed.mockClear();
    mockSetOutput.mockClear();

    // Reset default implementations
    mockGetInput.mockImplementation((name) => {
      switch (name) {
        case 'providers': return 'openai,claude,gemini';
        case 'chunk-size': return '2000';
        case 'github-token': return 'test-token';
        default: return 'test-token';
      }
    });
    mockGetMultilineInput.mockReturnValue(['test-key']);
    mockInfo.mockImplementation(() => {});
    mockWarning.mockImplementation(() => {});
    mockSetFailed.mockImplementation(() => {});
    mockSetOutput.mockImplementation(() => {});
  });

  describe('API Timeout Scenarios', () => {
    it('should handle OpenAI API timeout gracefully', async () => {
      const timeoutProvider = createTimeoutOpenAIProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return timeoutProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: openai API timeout')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle Claude API timeout gracefully', async () => {
      const timeoutProvider = createTimeoutClaudeProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return timeoutProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'claude';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-ant-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: claude API timeout')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle Gemini API timeout gracefully', async () => {
      const timeoutProvider = createTimeoutGeminiProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return timeoutProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'gemini';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['AIza-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: gemini API timeout')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should continue with other providers when one times out', async () => {
      const timeoutProvider = createTimeoutOpenAIProvider();
      const workingProvider = new MockProvider('claude');

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          // First call fails with timeout, second succeeds
          if (timeoutProvider.shouldFail) {
            return timeoutProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
          }
          return workingProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai,claude';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key', 'sk-ant-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: openai API timeout')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Scenarios', () => {
    it('should handle OpenAI rate limiting gracefully', async () => {
      const rateLimitProvider = createRateLimitOpenAIProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return rateLimitProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: openai API rate limit exceeded')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle multiple providers with rate limiting', async () => {
      const rateLimitOpenAI = createRateLimitOpenAIProvider();
      const rateLimitClaude = createRateLimitClaudeProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          // Simulate both providers being rate limited
          throw new Error('openai API rate limit exceeded: Retry after 45 seconds');
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai,claude';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key', 'sk-ant-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk:')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('Network Error Scenarios', () => {
    it('should handle network connectivity issues', async () => {
      const networkErrorProvider = createNetworkErrorOpenAIProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return networkErrorProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to analyze chunk: Error: openai Network error')
      );
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle intermittent network failures', async () => {
      const intermittentProvider = createIntermittentFailureProvider('openai', 2, 3);

      let callCount = 0;
      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) {
            return intermittentProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
          }
          // Third call succeeds
          return {
            summary: 'Analysis completed after retries',
            suggestions: [],
            confidence: 0.8
          };
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockWarning).toHaveBeenCalledTimes(2);
      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });
  });

  describe('Malformed Response Handling', () => {
    it('should handle malformed API responses gracefully', async () => {
      const malformedProvider = createMalformedOpenAIProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return malformedProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'openai';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      // Should still create a review comment despite malformed data
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should filter out invalid suggestions from malformed responses', async () => {
      const malformedProvider = createMalformedClaudeProvider();

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          return malformedProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);
      mockGetInput.mockImplementation((name) => {
        if (name === 'providers') return 'claude';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-ant-test-key']);

      await run();

      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
      expect(mockSetFailed).not.toHaveBeenCalled();

      // Verify that the review was created but individual comments for high severity issues were not created
      // since the malformed data had invalid severity levels
      expect(mockGitHubClient.createReviewCommentThread).not.toHaveBeenCalled();
    });
  });

  describe('GitHub API Error Scenarios', () => {
    it('should handle GitHub API timeout', async () => {
      mockGitHubClient.setFailureType(true, 'timeout', 'Request timed out after 30000ms');

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('GitHub API timeout: Request timed out after 30000ms');
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
    });

    it('should handle GitHub API rate limiting', async () => {
      mockGitHubClient.setFailureType(true, 'rate-limit', 'API rate limit exceeded');

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('GitHub API rate limit exceeded')
      );
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
    });

    it('should handle GitHub network errors', async () => {
      mockGitHubClient.setFailureType(true, 'network', 'Unable to reach api.github.com');

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('GitHub Network error: Unable to reach api.github.com');
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
    });

    it('should handle intermittent GitHub API failures', async () => {
      mockGitHubClient.setFailureType(true, 'error', 'Temporary failure', 2);

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith('GitHub API Error: Temporary failure');
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Error Scenarios', () => {
    it('should handle invalid chunk size configuration', async () => {
      mockGetInput.mockImplementation((name) => {
        if (name === 'chunk-size') return 'invalid';
        if (name === 'providers') return 'openai';
        return 'test-token';
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      // Should handle invalid chunk size gracefully - now with validation
      expect(mockSetFailed).toHaveBeenCalledWith(
        'Chunk size must be a positive number'
      );
    });

    it('should handle empty provider list', async () => {
      mockGetInput.mockImplementation((name) => {
        switch (name) {
          case 'providers': return '';
          case 'chunk-size': return '2000';
          case 'github-token': return 'test-token';
          default: return '';
        }
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Providers list is required and cannot be empty'
      );
    });

    it('should handle invalid provider names', async () => {
      mockGetInput.mockImplementation((name) => {
        switch (name) {
          case 'providers': return 'invalid-provider,another-invalid';
          case 'chunk-size': return '2000';
          case 'github-token': return 'test-token';
          default: return 'test-token';
        }
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockSetFailed).toHaveBeenCalledWith(
        'Unsupported providers: invalid-provider, another-invalid. Supported providers: openai, claude, gemini.'
      );
    });

    it('should handle missing required inputs', async () => {
      mockGetInput.mockImplementation((name) => {
        if (name === 'github-token') return '';
        return '';
      });
      mockGetMultilineInput.mockReturnValue([]);

      await run();

      // Should fail due to missing required inputs
      expect(mockSetFailed).toHaveBeenCalledWith(
        'GitHub token is required and cannot be empty'
      );
    });
  });

  describe('Data Processing Edge Cases', () => {
    it('should handle extremely large diffs', async () => {

      // Mock very large diff
      const largeDiff = 'File: src/large.ts\n' + '@@ -1,1000 +1,2000 @@\n' +
        Array.from({ length: 5000 }, (_, i) => `+ line ${i}: very long content that makes the diff large`).join('\n');

      mockGitHubClient.addMockDiff('test-owner', 'test-repo', 123, largeDiff);

      // Mock multiple chunks
      const mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;
      const chunks = Array.from({ length: 10 }, (_, i) => ({
        content: `Large chunk ${i + 1} content...`,
        files: [`src/file${i + 1}.ts`],
        size: 3000
      }));
      mockDiffProcessor.chunkDiff.mockReturnValue(chunks);

      (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

      await run();

      expect(mockInfo).toHaveBeenCalledWith('Analyzing chunk (3000 bytes, 1 files)');
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle empty diff content', async () => {
      mockGitHubClient.addMockDiff('test-owner', 'test-repo', 123, '');

      await run();

      expect(mockInfo).toHaveBeenCalledWith('No changes found in PR');
      expect(mockGitHubClient.createReviewComment).not.toHaveBeenCalled();
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle diff with only whitespace changes', async () => {

      mockGitHubClient.addMockDiff('test-owner', 'test-repo', 123, `File: src/test.ts
@@ -1,5 +1,5 @@

 function test() {
-
+
   console.log('test');
+
 }`);

      await run();

      // Should still process whitespace-only changes
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
      expect(mockSetFailed).not.toHaveBeenCalled();
    });

    it('should handle diff with binary files', async () => {

      mockGitHubClient.addMockDiff('test-owner', 'test-repo', 123, `File: binary/image.png
Binary files differ

File: src/test.ts
@@ -1,5 +1,7 @@
 function test() {
-  console.log('old');
+  console.log('new');
+  return true;
 }`);

      await run();

      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure scenarios', async () => {

      // Mock many chunks to simulate memory pressure
      const mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;
      const chunks = Array.from({ length: 100 }, (_, i) => ({
        content: `Memory-intensive chunk ${i + 1}`,
        files: [`src/memory${i + 1}.ts`],
        size: 1000
      }));
      mockDiffProcessor.chunkDiff.mockReturnValue(chunks);

      (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

      // Mock provider that succeeds but with delays to simulate processing
      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
          return {
            summary: 'Processed chunk',
            suggestions: [],
            confidence: 0.8
          };
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle concurrent request limits', async () => {

      // This test simulates hitting concurrent request limits
      let concurrentRequests = 0;
      const maxConcurrent = 5;

      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          concurrentRequests++;
          if (concurrentRequests > maxConcurrent) {
            throw new Error('Too many concurrent requests');
          }

          await new Promise(resolve => setTimeout(resolve, 50));
          concurrentRequests--;

          return {
            summary: 'Processed with concurrency control',
            suggestions: [],
            confidence: 0.8
          };
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

      // Mock multiple chunks to trigger concurrent processing
      const mockDiffProcessor = new DiffProcessor() as jest.Mocked<DiffProcessor>;
      const chunks = Array.from({ length: 10 }, (_, i) => ({
        content: `Concurrent chunk ${i + 1}`,
        files: [`src/concurrent${i + 1}.ts`],
        size: 500
      }));
      mockDiffProcessor.chunkDiff.mockReturnValue(chunks);

      (DiffProcessor as jest.Mock).mockImplementation(() => mockDiffProcessor);

      await run();

      // Should handle concurrency gracefully
      expect(mockSetFailed).not.toHaveBeenCalled();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should demonstrate graceful degradation with multiple failures', async () => {
      // Set up multiple failure scenarios
      mockGitHubClient.setDelay(1000); // Slow GitHub API

      const timeoutProvider = createTimeoutOpenAIProvider();
      const networkProvider = createNetworkErrorClaudeProvider();

      let failureCount = 0;
      const mockProviderManager = {
        analyzeCode: jest.fn().mockImplementation(async () => {
          failureCount++;
          if (failureCount === 1) {
            return timeoutProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
          } else if (failureCount === 2) {
            return networkProvider.analyzeCode('test diff', {
            prNumber: 123,
            repository: 'test-owner/test-repo',
            branch: 'feature-branch',
            files: ['src/test.ts']
          });
          } else {
            // Third call succeeds
            return {
              summary: 'Success after multiple failures',
              suggestions: [{
                file: 'src/test.ts',
                line: 1,
                severity: 'medium' as const,
                message: 'Found issue after retry',
                suggestion: 'Fix the issue'
              }],
              confidence: 0.8
            };
          }
        })
      } as any;

      (ProviderManager as jest.Mock).mockImplementation(() => mockProviderManager);

      await run();

      expect(mockWarning).toHaveBeenCalledTimes(2);
      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle cascading failures gracefully', async () => {
      // Simulate cascading failures: diff retrieval fails, then provider fails
      let callCount = 0;
      mockGitHubClient.setFailureType(true, 'error', 'Cascading failure', 3);

      // First 3 calls fail, 4th succeeds
      const originalGetPRDiff = mockGitHubClient.getPRDiff.bind(mockGitHubClient);
      mockGitHubClient.getPRDiff = jest.fn().mockImplementation(async (owner, repo, prNumber) => {
        callCount++;
        if (callCount <= 3) {
          throw new Error(`GitHub API Error: Cascading failure`);
        }
        return originalGetPRDiff(owner, repo, prNumber);
      });

      mockGitHubClient.setFailure(false); // Reset for successful call

      await run();

      // Since the first critical operation (getting diff) fails, the whole action should fail
      expect(mockSetFailed).toHaveBeenCalledWith('GitHub API Error: Cascading failure');
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely long input values', async () => {
      const longString = 'a'.repeat(100000);

      mockGetInput.mockImplementation((name) => {
        switch (name) {
          case 'custom-prompt': return longString;
          case 'providers': return 'openai';
          case 'chunk-size': return '2000';
          case 'github-token': return 'test-token';
          default: return 'test-token';
        }
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle special characters in inputs', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\n\t\\';

      mockGetInput.mockImplementation((name) => {
        switch (name) {
          case 'custom-prompt': return specialChars;
          case 'providers': return 'openai';
          case 'chunk-size': return '2000';
          case 'github-token': return 'test-token';
          default: return 'test-token';
        }
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle Unicode characters in inputs', async () => {
      const unicodeText = '🤖 AI Code Review with 中文, العربية, 한국어, עברית';

      mockGetInput.mockImplementation((name) => {
        switch (name) {
          case 'custom-prompt': return unicodeText;
          case 'providers': return 'openai';
          case 'chunk-size': return '2000';
          case 'github-token': return 'test-token';
          default: return 'test-token';
        }
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });

    it('should handle malformed JSON-like inputs', async () => {
      const malformedJson = '{"invalid": json structure "missing": quotes}';

      mockGetInput.mockImplementation((name) => {
        switch (name) {
          case 'custom-prompt': return malformedJson;
          case 'providers': return 'openai';
          case 'chunk-size': return '2000';
          case 'github-token': return 'test-token';
          default: return 'test-token';
        }
      });
      mockGetMultilineInput.mockReturnValue(['sk-test-key']);

      await run();

      expect(mockSetFailed).not.toHaveBeenCalled();
      expect(mockGitHubClient.createReviewComment).toHaveBeenCalled();
    });
  });
});
