import { IProvider } from '../../src/providers/IProvider';

class MockProvider implements IProvider {
  name = 'mock';

  async analyzeCode(diff: string, context: any): Promise<any> {
    return { summary: 'Mock review', suggestions: [] };
  }
}

describe('IProvider Interface', () => {
  it('should enforce provider interface contract', async () => {
    const provider = new MockProvider();

    expect(provider.name).toBe('mock');
    const result = await provider.analyzeCode('test diff', {});

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('suggestions');
  });
});