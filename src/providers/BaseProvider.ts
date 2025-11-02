import { IProvider, ReviewContext, ReviewResult } from './IProvider';

export abstract class BaseProvider implements IProvider {
  abstract name: string;
  protected apiKeys: string[];
  private currentKeyIndex = 0;

  constructor(apiKeys: string[]) {
    this.apiKeys = apiKeys || [];

    if (this.apiKeys.length === 0) {
      throw new Error(`At least one API key is required`);
    }
  }

  abstract analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult>;

  protected getCurrentApiKey(): string {
    return this.apiKeys[this.currentKeyIndex];
  }

  protected advanceToNextApiKey(): void {
    if (this.hasMultipleKeys()) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    }
  }

  protected getAvailableKeys(): string[] {
    return [...this.apiKeys];
  }

  protected getKeyCount(): number {
    return this.apiKeys.length;
  }

  protected hasMultipleKeys(): boolean {
    return this.apiKeys.length > 1;
  }

  // Bot-ready methods for future extension
  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
  abstract getModelInfo(): { model: string; maxTokens: number };
}

// Factory function for creating providers with configuration
export interface ProviderConfig {
  name: string;
  apiKeys: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export abstract class ConfigurableProvider extends BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    super(config.apiKeys);
    this.config = config;
  }

  protected getModel(): string {
    return this.config.model || this.getDefaultModel();
  }

  protected getMaxTokens(): number {
    return this.config.maxTokens || this.getDefaultMaxTokens();
  }

  protected getTemperature(): number {
    return this.config.temperature || 0.3;
  }

  protected getTimeout(): number {
    return this.config.timeout || 30000; // 30 seconds default
  }

  protected abstract getDefaultModel(): string;
  protected abstract getDefaultMaxTokens(): number;
}