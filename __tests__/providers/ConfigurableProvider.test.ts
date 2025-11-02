import { ConfigurableProvider, ProviderConfig } from '../../src/providers/BaseProvider';
import { ReviewContext, ReviewResult } from '../../src/providers/IProvider';

class TestConfigurableProvider extends ConfigurableProvider {
  name = 'TestConfigurableProvider';

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    const key = this.getCurrentApiKey();
    this.advanceToNextApiKey(); // Simulate successful API call
    return {
      summary: `Test analysis with model ${this.getModel()} and key ${key}`,
      suggestions: [],
      confidence: 0.9
    };
  }

  async initialize(): Promise<void> {
    // Bot-ready initialization
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  getModelInfo(): { model: string; maxTokens: number } {
    return { model: this.getModel(), maxTokens: this.getMaxTokens() };
  }

  protected getDefaultModel(): string {
    return 'default-model';
  }

  protected getDefaultMaxTokens(): number {
    return 2048;
  }

  // Expose protected methods for testing
  public testGetModel(): string {
    return this.getModel();
  }

  public testGetMaxTokens(): number {
    return this.getMaxTokens();
  }

  public testGetTemperature(): number {
    return this.getTemperature();
  }

  public testGetTimeout(): number {
    return this.getTimeout();
  }
}

describe('ConfigurableProvider', () => {
  const mockContext: ReviewContext = {
    prNumber: 789,
    repository: 'test/configurable-repo',
    branch: 'feature',
    files: ['src/configurable.ts']
  };

  it('should use provided configuration values', () => {
    const config: ProviderConfig = {
      name: 'TestProvider',
      apiKeys: ['key1', 'key2'],
      model: 'custom-model',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 60000
    };

    const provider = new TestConfigurableProvider(config);

    expect(provider.testGetModel()).toBe('custom-model');
    expect(provider.testGetMaxTokens()).toBe(4096);
    expect(provider.testGetTemperature()).toBe(0.7);
    expect(provider.testGetTimeout()).toBe(60000);
  });

  it('should fall back to default values when configuration is missing', () => {
    const config: ProviderConfig = {
      name: 'TestProvider',
      apiKeys: ['key1']
      // No model, maxTokens, temperature, or timeout provided
    };

    const provider = new TestConfigurableProvider(config);

    expect(provider.testGetModel()).toBe('default-model');
    expect(provider.testGetMaxTokens()).toBe(2048);
    expect(provider.testGetTemperature()).toBe(0.3); // Default temperature
    expect(provider.testGetTimeout()).toBe(30000); // Default timeout
  });

  it('should use partial configuration with defaults for missing values', () => {
    const config: ProviderConfig = {
      name: 'TestProvider',
      apiKeys: ['key1'],
      model: 'partial-model'
      // Only model is provided, others should use defaults
    };

    const provider = new TestConfigurableProvider(config);

    expect(provider.testGetModel()).toBe('partial-model');
    expect(provider.testGetMaxTokens()).toBe(2048); // Default
    expect(provider.testGetTemperature()).toBe(0.3); // Default
    expect(provider.testGetTimeout()).toBe(30000); // Default
  });

  it('should work with API key rotation', async () => {
    const config: ProviderConfig = {
      name: 'TestProvider',
      apiKeys: ['key1', 'key2', 'key3']
    };

    const provider = new TestConfigurableProvider(config);

    const result1 = await provider.analyzeCode('test', mockContext);
    const result2 = await provider.analyzeCode('test', mockContext);
    const result3 = await provider.analyzeCode('test', mockContext);
    const result4 = await provider.analyzeCode('test', mockContext);

    expect(result1.summary).toContain('key1');
    expect(result2.summary).toContain('key2');
    expect(result3.summary).toContain('key3');
    expect(result4.summary).toContain('key1'); // Back to first

    // Should also include the model name
    expect(result1.summary).toContain('default-model');
  });

  it('should return correct model info', () => {
    const config: ProviderConfig = {
      name: 'TestProvider',
      apiKeys: ['key1'],
      model: 'info-test-model',
      maxTokens: 1500
    };

    const provider = new TestConfigurableProvider(config);
    const modelInfo = provider.getModelInfo();

    expect(modelInfo.model).toBe('info-test-model');
    expect(modelInfo.maxTokens).toBe(1500);
  });

  it('should handle default configuration properly', () => {
    const config: ProviderConfig = {
      name: 'TestProvider',
      apiKeys: ['single-key']
    };

    const provider = new TestConfigurableProvider(config);

    // Should use all defaults
    expect(provider.testGetModel()).toBe('default-model');
    expect(provider.testGetMaxTokens()).toBe(2048);
    expect(provider.testGetTemperature()).toBe(0.3);
    expect(provider.testGetTimeout()).toBe(30000);

    const modelInfo = provider.getModelInfo();
    expect(modelInfo.model).toBe('default-model');
    expect(modelInfo.maxTokens).toBe(2048);
  });
});