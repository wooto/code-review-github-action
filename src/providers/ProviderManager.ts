import { IProvider, ReviewContext, ReviewResult } from './IProvider';

export interface ProviderStats {
  providerName: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: Date;
}

export class ProviderManager {
  private providers: IProvider[];
  private currentIndex = 0;
  private usageStats: Map<string, ProviderStats> = new Map();
  private failFast: boolean;

  constructor(providers: IProvider[], failFast: boolean = false) {
    this.providers = providers.filter(p => p !== undefined);
    this.failFast = failFast;

    if (this.providers.length === 0) {
      throw new Error('No valid providers provided');
    }

    // Initialize stats
    this.providers.forEach(provider => {
      this.usageStats.set(provider.name, {
        providerName: provider.name,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: new Date()
      });
    });
  }

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    const attempts = this.providers.length;
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      const provider = this.providers[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.providers.length;

      const stats = this.usageStats.get(provider.name)!;
      stats.usageCount++;
      stats.lastUsed = new Date();

      try {
        const result = await provider.analyzeCode(diff, context);
        stats.successCount++;

        console.info(`✅ ${provider.name} completed successfully`);
        return result;
      } catch (error) {
        lastError = error as Error;
        stats.failureCount++;

        console.warn(`❌ Provider ${provider.name} failed:`, error);

        if (this.failFast) {
          throw new Error(`Provider ${provider.name} failed: ${error}`);
        }
        // Continue to next provider
      }
    }

    // All providers failed
    throw lastError || new Error('All providers failed to analyze the code');
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  getUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.usageStats.forEach((stat, providerName) => {
      stats[providerName] = stat.usageCount;
    });
    return stats;
  }

  getDetailedStats(): ProviderStats[] {
    return Array.from(this.usageStats.values());
  }

  resetStats(): void {
    this.usageStats.forEach(stats => {
      stats.usageCount = 0;
      stats.successCount = 0;
      stats.failureCount = 0;
    });
  }
}