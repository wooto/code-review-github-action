import { IProvider, ReviewContext, ReviewResult } from '../../providers/IProvider';
import { getMockResponse, MockReviewResponse } from './mockResponseHelpers';

export class MockProvider implements IProvider {
  name: string;
  private scenario: string;
  private shouldFail: boolean;
  private failureReason: string;

  constructor(
    name: string,
    scenario: string = 'basic-review',
    shouldFail: boolean = false,
    failureReason: string = 'API Error'
  ) {
    this.name = name;
    this.scenario = scenario;
    this.shouldFail = shouldFail;
    this.failureReason = failureReason;
  }

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    if (this.shouldFail) {
      throw new Error(`${this.name} API Error: ${this.failureReason}`);
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