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
  },

  // Multiple Providers Conflict Scenario
  'multi-provider-conflict': {
    provider: 'openai',
    summary: 'Multiple providers analyzed the code with varying perspectives. Security vs performance trade-offs identified.',
    issues: [
      {
        file: 'src/auth/AuthService.ts',
        line: 35,
        severity: 'warning',
        message: 'Caching introduces security risk - tokens may be stored longer than necessary',
        suggestion: 'Implement TTL-based cache with automatic invalidation'
      },
      {
        file: 'src/middleware/AuthMiddleware.ts',
        line: 18,
        severity: 'error',
        message: 'Potential undefined access when authorization header is missing',
        suggestion: 'Add proper null check before split operation'
      },
      {
        file: 'src/middleware/AuthMiddleware.ts',
        line: 18,
        severity: 'info',
        message: 'Different providers disagree on caching approach',
        suggestion: 'Consider your specific security requirements vs performance needs'
      }
    ],
    suggestions: [
      'Balance security concerns with performance requirements',
      'Implement comprehensive input validation',
      'Consider using secure token storage mechanisms',
      'Add monitoring for authentication failures'
    ]
  },

  // Large-scale Review Scenario
  'large-scale-review': {
    provider: 'claude',
    summary: 'Large-scale migration with multiple security and architectural considerations. Focus on systematic approach.',
    issues: [
      {
        file: 'src/auth/AuthService.ts',
        line: 150,
        severity: 'error',
        message: 'Database connection not properly closed in error scenarios',
        suggestion: 'Use try-finally blocks or connection pooling'
      },
      {
        file: 'src/auth/AuthController.ts',
        line: 200,
        severity: 'error',
        message: 'Mass assignment vulnerability in user update endpoint',
        suggestion: 'Implement proper field filtering and validation'
      },
      {
        file: 'src/auth/AuthMiddleware.ts',
        line: 75,
        severity: 'error',
        message: 'JWT verification without proper error handling',
        suggestion: 'Add comprehensive JWT validation and error responses'
      },
      {
        file: 'src/database/UserRepository.ts',
        line: 300,
        severity: 'warning',
        message: 'N+1 query problem in user role fetching',
        suggestion: 'Use JOIN queries or eager loading'
      },
      {
        file: 'src/utils/CryptoUtils.ts',
        line: 50,
        severity: 'error',
        message: 'Weak password hashing algorithm',
        suggestion: 'Use bcrypt or argon2 with proper salt rounds'
      }
    ],
    suggestions: [
      'Implement comprehensive security audit before deployment',
      'Add extensive integration tests for authentication flows',
      'Consider implementing circuit breaker pattern for external dependencies',
      'Add comprehensive logging and monitoring',
      'Implement proper database transaction management',
      'Add API rate limiting and abuse prevention',
      'Consider implementing gradual rollout strategy',
      'Add comprehensive documentation for new authentication system',
      'Implement proper error handling and user feedback',
      'Add performance monitoring and optimization'
    ]
  },

  // Retry Logic Review Scenario
  'retry-logic-review': {
    provider: 'openai',
    summary: 'Good retry implementation with exponential backoff. Consider additional resilience patterns.',
    issues: [
      {
        file: 'src/network/HttpClient.ts',
        line: 45,
        severity: 'error',
        message: 'No timeout configuration for HTTP requests',
        suggestion: 'Add reasonable timeout to prevent hanging requests'
      },
      {
        file: 'src/utils/RetryHandler.ts',
        line: 15,
        severity: 'warning',
        message: 'No maximum delay limit in exponential backoff',
        suggestion: 'Implement max delay cap to prevent excessive wait times'
      }
    ],
    suggestions: [
      'Add circuit breaker pattern for cascading failure protection',
      'Implement request timeout configuration',
      'Add jitter to prevent thundering herd problems',
      'Consider implementing dead letter queue for failed requests',
      'Add comprehensive logging for retry attempts and failures'
    ]
  },

  // Multi-language Review Scenario
  'multi-language-review': {
    provider: 'gemini',
    summary: 'Cross-language review covering Python backend, JavaScript frontend, and deployment infrastructure. Good security improvements noted.',
    issues: [
      {
        file: 'src/app.py',
        line: 18,
        severity: 'warning',
        message: 'SQL injection protection implemented, but consider using ORM',
        suggestion: 'SQLAlchemy or similar ORM provides additional protection'
      },
      {
        file: 'frontend/index.js',
        line: 28,
        severity: 'info',
        message: 'Good error handling implementation',
        suggestion: 'Consider adding retry logic for failed requests'
      },
      {
        file: 'scripts/deploy.sh',
        line: 8,
        severity: 'warning',
        message: 'Fixed sleep delay may not be sufficient for all deployments',
        suggestion: 'Implement proper health check with polling'
      }
    ],
    suggestions: [
      'Consider containerizing the application for better consistency',
      'Add comprehensive error logging across all components',
      'Implement proper environment variable management',
      'Add integration tests covering the full stack',
      'Consider adding API documentation generation'
    ]
  },

  // Custom Prompt Review Scenario
  'custom-prompt-review': {
    provider: 'openai',
    summary: 'Custom validation logic reviewed with focus on validation patterns and edge cases identified.',
    issues: [
      {
        file: 'src/validation/CustomValidator.ts',
        line: 25,
        severity: 'warning',
        message: 'Email regex doesn\'t handle all valid email formats',
        suggestion: 'Consider using a well-tested email validation library'
      },
      {
        file: 'src/validation/CustomValidator.ts',
        line: 27,
        severity: 'info',
        message: 'Good use of custom exception type',
        suggestion: 'Add error codes for better error handling'
      },
      {
        file: 'src/rules/BusinessRules.ts',
        line: 13,
        severity: 'info',
        message: 'Configuration-driven business rules implemented well',
        suggestion: 'Add validation for configuration values'
      }
    ],
    suggestions: [
      'Add comprehensive unit tests for edge cases in email validation',
      'Consider international email address requirements',
      'Add input sanitization before validation',
      'Implement proper error handling for malformed inputs',
      'Add validation for configuration values and types'
    ]
  },

  // Timeout Error Review Scenario
  'timeout-error-review': {
    provider: 'claude',
    summary: 'Analysis completed after timeout handling. Critical issues identified despite timeout challenges.',
    issues: [
      {
        file: 'src/timeout/TimeoutHandler.ts',
        line: 45,
        severity: 'error',
        message: 'Potential infinite loop in timeout handler',
        suggestion: 'Add proper loop termination condition'
      },
      {
        file: 'src/timeout/TimeoutHandler.ts',
        line: 67,
        severity: 'warning',
        message: 'Timeout value too high for responsive user experience',
        suggestion: 'Consider reducing timeout to 30 seconds or implementing progressive timeout'
      }
    ],
    suggestions: [
      'Implement circuit breaker pattern for repeated timeouts',
      'Add retry logic with exponential backoff',
      'Consider implementing timeout per provider rather than globally',
      'Add monitoring for timeout occurrences'
    ]
  },

  // Rate Limit Error Review Scenario
  'rate-limit-error-review': {
    provider: 'gemini',
    summary: 'Rate limiting handled gracefully. Recommendations for optimizing API usage patterns.',
    issues: [
      {
        file: 'src/ratelimit/RateLimiter.ts',
        line: 23,
        severity: 'warning',
        message: 'No exponential backoff implemented for rate limits',
        suggestion: 'Implement progressive delay increases'
      },
      {
        file: 'src/ratelimit/RateLimiter.ts',
        line: 34,
        severity: 'info',
        message: 'Good logging of rate limit events',
        suggestion: 'Add metrics for rate limit analysis'
      }
    ],
    suggestions: [
      'Implement request queuing during rate limit periods',
      'Add priority-based request processing',
      'Consider implementing request batching to reduce API calls',
      'Add rate limit prediction based on usage patterns'
    ]
  },

  // Network Error Review Scenario
  'network-error-review': {
    provider: 'openai',
    summary: 'Network resilience identified. Several improvements recommended for better error handling.',
    issues: [
      {
        file: 'src/network/NetworkClient.ts',
        line: 56,
        severity: 'error',
        message: 'No retry mechanism for network failures',
        suggestion: 'Implement retry logic with exponential backoff'
      },
      {
        file: 'src/network/NetworkClient.ts',
        line: 78,
        severity: 'warning',
        message: 'Missing connection timeout configuration',
        suggestion: 'Add reasonable timeout to prevent hanging requests'
      },
      {
        file: 'src/network/NetworkClient.ts',
        line: 89,
        severity: 'info',
        message: 'Basic error logging implemented',
        suggestion: 'Add more detailed network error context'
      }
    ],
    suggestions: [
      'Implement circuit breaker pattern for network failures',
      'Add network health checks before making requests',
      'Consider implementing request caching for network failures',
      'Add fallback mechanisms for critical network operations'
    ]
  },

  // Malformed Data Review Scenario
  'malformed-data-review': {
    provider: 'claude',
    summary: 'Data validation improvements needed. Several edge cases with malformed inputs identified.',
    issues: [
      {
        file: 'src/validation/DataValidator.ts',
        line: 12,
        severity: 'error',
        message: 'No input validation for API responses',
        suggestion: 'Add schema validation for all external API responses'
      },
      {
        file: 'src/validation/DataValidator.ts',
        line: 34,
        severity: 'warning',
        message: 'Silent failure on invalid data',
        suggestion: 'Add proper error handling for validation failures'
      },
      {
        file: 'src/validation/DataValidator.ts',
        line: 45,
        severity: 'info',
        message: 'Basic type checking implemented',
        suggestion: 'Add comprehensive type guards and runtime validation'
      }
    ],
    suggestions: [
      'Implement comprehensive input validation for all API responses',
      'Add data sanitization before processing',
      'Create custom error types for validation failures',
      'Add unit tests for malformed input scenarios'
    ]
  },

  // Resource Exhaustion Review Scenario
  'resource-exhaustion-review': {
    provider: 'gemini',
    summary: 'Resource management issues identified. Memory and processing optimizations needed.',
    issues: [
      {
        file: 'src/memory/MemoryManager.ts',
        line: 67,
        severity: 'error',
        message: 'Potential memory leak in large diff processing',
        suggestion: 'Implement proper memory cleanup for large objects'
      },
      {
        file: 'src/memory/MemoryManager.ts',
        line: 89,
        severity: 'warning',
        message: 'No memory usage monitoring',
        suggestion: 'Add memory usage tracking and alerts'
      },
      {
        file: 'src/processing/Processor.ts',
        line: 123,
        severity: 'info',
        message: 'Synchronous processing of large files',
        suggestion: 'Consider streaming or chunked processing for large files'
      }
    ],
    suggestions: [
      'Implement memory usage monitoring and optimization',
      'Add streaming processing for large files',
      'Consider implementing memory pooling for frequently allocated objects',
      'Add resource limits and graceful degradation'
    ]
  },

  // Concurrent Request Review Scenario
  'concurrent-request-review': {
    provider: 'openai',
    summary: 'Concurrency control improvements needed. Race conditions and request management issues identified.',
    issues: [
      {
        file: 'src/concurrency/ConcurrencyManager.ts',
        line: 23,
        severity: 'error',
        message: 'No request limiting implemented',
        suggestion: 'Add semaphore or queue-based request limiting'
      },
      {
        file: 'src/concurrency/ConcurrencyManager.ts',
        line: 45,
        severity: 'warning',
        message: 'Potential race condition in request handling',
        suggestion: 'Implement proper synchronization mechanisms'
      },
      {
        file: 'src/concurrency/ConcurrencyManager.ts',
        line: 67,
        severity: 'info',
        message: 'Basic async/await usage',
        suggestion: 'Consider using Promise.allSettled for better error handling'
      }
    ],
    suggestions: [
      'Implement proper concurrency control with request limiting',
      'Add request queuing and prioritization',
      'Consider implementing request cancellation mechanisms',
      'Add monitoring for concurrent request patterns'
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
