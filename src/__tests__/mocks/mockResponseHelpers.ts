export interface MockReviewResponse {
  provider: 'openai' | 'claude' | 'gemini';
  summary: string;
  issues: Array<{
    file: string;
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
  }>;
  suggestions: string[];
}

export const MOCK_RESPONSES: Record<string, MockReviewResponse> = {
  // Basic Review Scenario
  'basic-review': {
    provider: 'openai',
    summary: 'Overall the code looks good. Found a few minor improvements that could enhance readability and maintainability.',
    issues: [
      {
        file: 'src/index.ts',
        line: 45,
        severity: 'warning',
        message: 'Consider adding error handling for API failures',
        suggestion: 'Wrap API calls in try-catch blocks'
      },
      {
        file: 'src/providers/ProviderManager.ts',
        line: 23,
        severity: 'info',
        message: 'Magic number detected',
        suggestion: 'Extract to a named constant'
      }
    ],
    suggestions: [
      'Consider adding TypeScript types for API responses',
      'Add input validation for user parameters',
      'Document the retry logic for failed requests'
    ]
  },

  // Security Issues Scenario
  'security-review': {
    provider: 'claude',
    summary: 'Several security concerns identified that should be addressed before merging this PR.',
    issues: [
      {
        file: 'src/github/GitHubClient.ts',
        line: 67,
        severity: 'error',
        message: 'Potential SQL injection vulnerability',
        suggestion: 'Use parameterized queries or input sanitization'
      },
      {
        file: 'src/index.ts',
        line: 89,
        severity: 'error',
        message: 'Sensitive data logged to console',
        suggestion: 'Remove or mask sensitive information in logs'
      },
      {
        file: 'src/providers/openai/OpenAIProvider.ts',
        line: 34,
        severity: 'warning',
        message: 'API key exposed in error message',
        suggestion: 'Sanitize error messages before displaying'
      }
    ],
    suggestions: [
      'Implement proper input validation and sanitization',
      'Use secure logging practices',
      'Add rate limiting to prevent API abuse',
      'Review all API endpoints for security vulnerabilities'
    ]
  },

  // Performance Issues Scenario
  'performance-review': {
    provider: 'gemini',
    summary: 'Performance bottlenecks identified that could impact user experience and resource usage.',
    issues: [
      {
        file: 'src/diff/DiffProcessor.ts',
        line: 112,
        severity: 'warning',
        message: 'Inefficient string concatenation in loop',
        suggestion: 'Use array.join() or template literals'
      },
      {
        file: 'src/providers/BaseProvider.ts',
        line: 45,
        severity: 'warning',
        message: 'Synchronous file operations blocking event loop',
        suggestion: 'Use async file operations'
      },
      {
        file: 'src/index.ts',
        line: 78,
        severity: 'info',
        message: 'Unnecessary API call in loop',
        suggestion: 'Batch API requests or cache results'
      }
    ],
    suggestions: [
      'Implement proper caching strategy',
      'Use streaming for large file processing',
      'Optimize database queries',
      'Consider implementing request batching'
    ]
  },

  // No Issues Scenario
  'no-issues': {
    provider: 'openai',
    summary: 'Code looks excellent! No issues found. Well-structured and follows best practices.',
    issues: [],
    suggestions: [
      'Consider adding more unit tests for edge cases',
      'Documentation could be expanded for new contributors'
    ]
  },

  // Error Handling Scenario
  'error-handling': {
    provider: 'claude',
    summary: 'Several error handling improvements needed to make the code more robust.',
    issues: [
      {
        file: 'src/providers/ProviderManager.ts',
        line: 56,
        severity: 'error',
        message: 'Unhandled promise rejection',
        suggestion: 'Add proper error handling for async operations'
      },
      {
        file: 'src/index.ts',
        line: 123,
        severity: 'warning',
        message: 'Generic error message',
        suggestion: 'Provide more specific error messages for better debugging'
      }
    ],
    suggestions: [
      'Implement comprehensive error handling strategy',
      'Add logging for debugging purposes',
      'Create custom error types for different scenarios'
    ]
  }
};

// Provider-specific response variations
export const PROVIDER_RESPONSES = {
  openai: {
    style: 'concise and direct',
    summaryPrefix: 'Code Review Summary:',
    issuePrefix: '• Issue:',
    suggestionPrefix: '• Suggestion:'
  },
  claude: {
    style: 'detailed and analytical',
    summaryPrefix: '📋 Code Analysis Summary:',
    issuePrefix: '🔍 Finding:',
    suggestionPrefix: '💡 Recommendation:'
  },
  gemini: {
    style: 'structured and comprehensive',
    summaryPrefix: '## Code Review Report',
    issuePrefix: '### Issue Identified:',
    suggestionPrefix: '### Suggested Improvement:'
  }
};

export const getMockResponse = (scenario: string, provider: string): MockReviewResponse => {
  const baseResponse = MOCK_RESPONSES[scenario];
  if (!baseResponse) {
    throw new Error(`Unknown scenario: ${scenario}`);
  }

  const providerStyle = PROVIDER_RESPONSES[provider as keyof typeof PROVIDER_RESPONSES];
  if (!providerStyle) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Adapt response based on provider style
  return {
    ...baseResponse,
    provider: provider as any,
    summary: `${providerStyle.summaryPrefix} ${baseResponse.summary}`
  };
};