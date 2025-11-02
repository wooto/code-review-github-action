import { ProviderManager } from '../../src/providers/ProviderManager';
import { IProvider, ReviewResult, ReviewContext } from '../../src/providers/IProvider';

class TestProvider implements IProvider {
  constructor(public name: string, private shouldFail: boolean = false) {}

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    if (this.shouldFail) {
      throw new Error(`${this.name} API error`);
    }
    return {
      summary: `Review from ${this.name}`,
      suggestions: [],
      confidence: 0.8
    };
  }
}

describe('ProviderManager', () => {
  it('should round-robin between providers', async () => {
    const providers = [
      new TestProvider('provider1'),
      new TestProvider('provider2')
    ];

    const manager = new ProviderManager(providers);

    const result1 = await manager.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: []
    });
    const result2 = await manager.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: []
    });

    expect(result1.summary).toContain('provider1');
    expect(result2.summary).toContain('provider2');
  });

  it('should handle provider failures gracefully', async () => {
    const providers = [
      new TestProvider('failing-provider', true),
      new TestProvider('working-provider')
    ];

    const manager = new ProviderManager(providers);
    const result = await manager.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: []
    });

    expect(result.summary).toContain('working-provider');
  });

  it('should track provider usage statistics', async () => {
    const providers = [
      new TestProvider('provider1'),
      new TestProvider('provider2')
    ];

    const manager = new ProviderManager(providers);

    await manager.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: []
    });
    await manager.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: []
    });
    await manager.analyzeCode('test diff', {
      prNumber: 123,
      repository: 'test/repo',
      branch: 'main',
      files: []
    });

    const stats = manager.getUsageStats();
    expect(stats['provider1']).toBe(2);
    expect(stats['provider2']).toBe(1);
  });
});