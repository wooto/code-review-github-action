import { IProvider, ReviewContext, ReviewResult } from '../../providers/IProvider';
import { getMockResponse, MockReviewResponse } from './mockResponseHelpers';

export class MockProvider implements IProvider {
  name: string;
  private scenario: string;
  public shouldFail: boolean;
  public failureReason: string;
  public failureType: 'error' | 'timeout' | 'rate-limit' | 'network' | 'malformed';
  public failureCount: number;
  public currentFailureCount: number;
  public delayMs: number;

  constructor(
    name: string,
    scenario: string = 'basic-review',
    shouldFail: boolean = false,
    failureReason: string = 'API Error',
    failureType: 'error' | 'timeout' | 'rate-limit' | 'network' | 'malformed' = 'error',
    failureCount: number = 1,
    delayMs: number = 100
  ) {
    this.name = name;
    this.scenario = scenario;
    this.shouldFail = shouldFail;
    this.failureReason = failureReason;
    this.failureType = failureType;
    this.failureCount = failureCount;
    this.currentFailureCount = 0;
    this.delayMs = delayMs;
  }

  async analyzeCode(_diff: string, _context: ReviewContext): Promise<ReviewResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delayMs + Math.random() * 200));

    // Handle failure scenarios
    if (this.shouldFail && this.currentFailureCount < this.failureCount) {
      this.currentFailureCount++;

      switch (this.failureType) {
        case 'timeout':
          throw new Error(`${this.name} API timeout`);

        case 'rate-limit':
          throw new Error(`${this.name} API rate limit exceeded`);

        case 'network':
          throw new Error(`${this.name} Network error`);

        case 'malformed':
          // Return malformed data that might cause issues downstream
          return {
            summary: '',  // Empty summary
            suggestions: [
              {
                file: '',  // Empty file name
                line: -1,  // Invalid line number
                severity: 'invalid' as any,  // Invalid severity
                message: '',
                suggestion: ''
              }
            ],
            confidence: -1  // Invalid confidence
          };

        case 'error':
        default:
          throw new Error(`${this.name} API Error: ${this.failureReason}`);
      }
    }

    const mockResponse: MockReviewResponse = getMockResponse(this.scenario, this.name);

    // Convert mock response to ReviewResult format
    const suggestions = mockResponse.issues.map(issue => ({
      file: issue.file,
      line: issue.line,
      severity: this.mapSeverity(issue.severity),
      message: issue.message,
      suggestion: issue.suggestion
    }));

    return {
      summary: mockResponse.summary,
      suggestions,
      confidence: 0.8 + Math.random() * 0.2 // 80-100% confidence
    };
  }

  private mapSeverity(severity: string): 'low' | 'medium' | 'high' {
    switch (severity) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      case 'info': return 'low';
      default: return 'low';
    }
  }

  // Helper method for testing
  setScenario(scenario: string): void {
    this.scenario = scenario;
  }

  // Helper method for testing error scenarios
  setFailure(shouldFail: boolean, reason: string = 'API Error'): void {
    this.shouldFail = shouldFail;
    this.failureReason = reason;
  }

  // Helper method for testing specific failure types
  setFailureType(
    shouldFail: boolean,
    failureType: 'error' | 'timeout' | 'rate-limit' | 'network' | 'malformed' = 'error',
    reason: string = 'API Error',
    failureCount: number = 1,
    delayMs: number = 100
  ): void {
    this.shouldFail = shouldFail;
    this.failureType = failureType;
    this.failureReason = reason;
    this.failureCount = failureCount;
    this.delayMs = delayMs;
    this.currentFailureCount = 0;
  }

  // Reset failure state
  resetFailures(): void {
    this.currentFailureCount = 0;
  }
}

// Pre-configured mock providers for different scenarios
export const createMockOpenAIProvider = (scenario: string = 'basic-review'): MockProvider => {
  return new MockProvider('openai', scenario);
};

export const createMockClaudeProvider = (scenario: string = 'basic-review'): MockProvider => {
  return new MockProvider('claude', scenario);
};

export const createMockGeminiProvider = (scenario: string = 'basic-review'): MockProvider => {
  return new MockProvider('gemini', scenario);
};

// Failing providers for error testing
export const createFailingOpenAIProvider = (reason: string = 'Rate limit exceeded'): MockProvider => {
  return new MockProvider('openai', 'basic-review', true, reason);
};

export const createFailingClaudeProvider = (reason: string = 'Invalid API key'): MockProvider => {
  return new MockProvider('claude', 'basic-review', true, reason);
};

export const createFailingGeminiProvider = (reason: string = 'Service unavailable'): MockProvider => {
  return new MockProvider('gemini', 'basic-review', true, reason);
};

// Timeout failure providers
export const createTimeoutOpenAIProvider = (): MockProvider => {
  return new MockProvider('openai', 'basic-review', true, 'Request timeout', 'timeout');
};

export const createTimeoutClaudeProvider = (): MockProvider => {
  return new MockProvider('claude', 'basic-review', true, 'Request timeout', 'timeout');
};

export const createTimeoutGeminiProvider = (): MockProvider => {
  return new MockProvider('gemini', 'basic-review', true, 'Request timeout', 'timeout');
};

// Rate limit failure providers
export const createRateLimitOpenAIProvider = (): MockProvider => {
  return new MockProvider('openai', 'basic-review', true, 'Rate limit exceeded', 'rate-limit');
};

export const createRateLimitClaudeProvider = (): MockProvider => {
  return new MockProvider('claude', 'basic-review', true, 'Rate limit exceeded', 'rate-limit');
};

export const createRateLimitGeminiProvider = (): MockProvider => {
  return new MockProvider('gemini', 'basic-review', true, 'Rate limit exceeded', 'rate-limit');
};

// Network failure providers
export const createNetworkErrorOpenAIProvider = (): MockProvider => {
  return new MockProvider('openai', 'basic-review', true, 'Network unreachable', 'network');
};

export const createNetworkErrorClaudeProvider = (): MockProvider => {
  return new MockProvider('claude', 'basic-review', true, 'Network unreachable', 'network');
};

export const createNetworkErrorGeminiProvider = (): MockProvider => {
  return new MockProvider('gemini', 'basic-review', true, 'Network unreachable', 'network');
};

// Malformed response providers
export const createMalformedOpenAIProvider = (): MockProvider => {
  return new MockProvider('openai', 'basic-review', true, 'Malformed response', 'malformed');
};

export const createMalformedClaudeProvider = (): MockProvider => {
  return new MockProvider('claude', 'basic-review', true, 'Malformed response', 'malformed');
};

export const createMalformedGeminiProvider = (): MockProvider => {
  return new MockProvider('gemini', 'basic-review', true, 'Malformed response', 'malformed');
};

// Intermittent failure providers (fail some requests, succeed others)
export const createIntermittentFailureProvider = (
  name: string,
  failureCount: number = 1,
  _totalRequests: number = 3
): MockProvider => {
  return new MockProvider(name, 'basic-review', true, 'Intermittent failure', 'error', failureCount);
};

// Slow response providers (for testing timeouts)
export const createSlowOpenAIProvider = (delayMs: number = 35000): MockProvider => {
  return new MockProvider('openai', 'basic-review', false, '', 'error', 0, delayMs);
};

export const createSlowClaudeProvider = (delayMs: number = 35000): MockProvider => {
  return new MockProvider('claude', 'basic-review', false, '', 'error', 0, delayMs);
};

export const createSlowGeminiProvider = (delayMs: number = 35000): MockProvider => {
  return new MockProvider('gemini', 'basic-review', false, '', 'error', 0, delayMs);
};
