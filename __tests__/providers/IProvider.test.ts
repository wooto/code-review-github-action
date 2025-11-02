import { IProvider, ReviewContext, ReviewResult } from '../../src/providers/IProvider';

class MockProvider implements IProvider {
  name = 'mock';

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    return { summary: 'Mock review', suggestions: [], confidence: 0.8 };
  }
}

describe('IProvider Interface', () => {
  const mockContext: ReviewContext = {
    prNumber: 456,
    repository: 'test/mock-repo',
    branch: 'develop',
    files: ['src/mock.ts']
  };

  it('should enforce provider interface contract', async () => {
    const provider = new MockProvider();

    expect(provider.name).toBe('mock');
    const result = await provider.analyzeCode('test diff', mockContext);

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('suggestions');
    expect(result).toHaveProperty('confidence');
  });
});
