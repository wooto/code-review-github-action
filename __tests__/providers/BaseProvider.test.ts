import { BaseProvider } from '../../src/providers/BaseProvider';
import { ReviewContext, ReviewResult } from '../../src/providers/IProvider';

class TestProvider extends BaseProvider {
  name = 'TestProvider';

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    return {
      summary: `Test analysis with key: ${this.getCurrentApiKey()}`,
      suggestions: [],
      confidence: 0.8
    };
  }

  async initialize(): Promise<void> {
    // Bot-ready initialization
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  getModelInfo(): { model: string; maxTokens: number } {
    return { model: 'test-model', maxTokens: 1000 };
  }

  // Expose protected methods for testing
  public testGetCurrentApiKey(): string {
    return this.getCurrentApiKey();
  }

  public testGetAvailableKeys(): string[] {
    return this.getAvailableKeys();
  }

  public testGetKeyCount(): number {
    return this.getKeyCount();
  }

  public testHasMultipleKeys(): boolean {
    return this.hasMultipleKeys();
  }
}

describe('BaseProvider', () => {
  it('should round-robin through multiple API keys', async () => {
    const provider = new TestProvider(['key1', 'key2', 'key3']);

    const result1 = await provider.analyzeCode('test', {} as ReviewContext);
    const result2 = await provider.analyzeCode('test', {} as ReviewContext);
    const result3 = await provider.analyzeCode('test', {} as ReviewContext);
    const result4 = await provider.analyzeCode('test', {} as ReviewContext);

    expect(result1.summary).toContain('key1');
    expect(result2.summary).toContain('key2');
    expect(result3.summary).toContain('key3');
    expect(result4.summary).toContain('key1'); // Back to first
  });

  it('should throw error with empty API keys', () => {
    expect(() => new TestProvider([])).toThrow('At least one API key is required');
  });

  it('should work with single API key', async () => {
    const provider = new TestProvider(['single-key']);

    expect(provider.testGetAvailableKeys()).toEqual(['single-key']);

    const result = await provider.analyzeCode('test', {} as ReviewContext);
    expect(result.summary).toContain('single-key');
  });

  it('should report correct key count and multiple keys status', () => {
    const singleKeyProvider = new TestProvider(['key1']);
    const multiKeyProvider = new TestProvider(['key1', 'key2']);

    expect(singleKeyProvider.testGetKeyCount()).toBe(1);
    expect(singleKeyProvider.testHasMultipleKeys()).toBe(false);

    expect(multiKeyProvider.testGetKeyCount()).toBe(2);
    expect(multiKeyProvider.testHasMultipleKeys()).toBe(true);
  });
});