import { ConfigurableProvider, ProviderConfig } from '../BaseProvider';
import { ReviewContext, ReviewResult, ReviewSuggestion } from '../IProvider';
import OpenAI from 'openai';

export interface OpenAIConfig {
  apiKeys: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class OpenAIProvider extends ConfigurableProvider {
  name = 'OpenAI';
  private clients: Map<string, OpenAI> = new Map();

  constructor(config: OpenAIConfig) {
    super({
      name: 'OpenAI',
      apiKeys: config.apiKeys,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      timeout: config.timeout
    });

    // Initialize clients for each API key
    this.apiKeys.forEach(key => {
      this.clients.set(key, new OpenAI({
        apiKey: key,
        timeout: this.getTimeout()
      }));
    });
  }

  async initialize(): Promise<void> {
    // Bot-ready initialization
    await this.healthCheck();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testKey = this.getCurrentApiKey();
      const client = this.clients.get(testKey);
      if (!client) return false;

      // Simple health check - list models
      await client.models.list();
      return true;
    } catch (error) {
      // Sanitize error message to prevent security leaks
      console.warn('OpenAI health check failed');
      return false;
    }
  }

  getModelInfo(): { model: string; maxTokens: number } {
    return {
      model: this.getModel(),
      maxTokens: this.getMaxTokens()
    };
  }

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    const apiKey = this.getCurrentApiKey();
    const client = this.clients.get(apiKey);

    if (!client) {
      throw new Error('OpenAI client not found for API key');
    }

    const prompt = this.buildPrompt(diff, context);

    try {
      const response = await client.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: 'system',
            content: 'You are an expert code reviewer. Analyze the provided code diff and provide constructive feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.getTemperature(),
        max_tokens: this.getMaxTokens()
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseResponse(content);
    } catch (error) {
      // Sanitize error message to prevent security leaks
      throw new Error('OpenAI API error: Request failed');
    } finally {
      // Move to next API key for round-robin
      this.advanceToNextApiKey();
    }
  }

  protected getDefaultModel(): string {
    return 'gpt-4';
  }

  protected getDefaultMaxTokens(): number {
    return 1000;
  }

  // Expose getCurrentApiKey for testing
  getCurrentApiKey(): string {
    return super.getCurrentApiKey();
  }

  // Expose advanceToNextApiKey for testing
  advanceToNextApiKey(): void {
    super.advanceToNextApiKey();
  }

  private buildPrompt(diff: string, context: ReviewContext): string {
    return `
Please review this pull request diff:

Repository: ${context.repository}
PR Number: ${context.prNumber}
Branch: ${context.branch}

\`\`\`diff
${diff}
\`\`\`

Focus on:
- Security vulnerabilities
- Performance issues
- Code style and readability
- Potential bugs
- Best practices

Provide your response in this JSON format:
{
  "summary": "Brief summary of the review",
  "suggestions": [
    {
      "file": "filename.js",
      "line": 10,
      "severity": "low|medium|high",
      "message": "Description of the issue",
      "suggestion": "How to fix it (optional)"
    }
  ]
}
`;
  }

  private parseResponse(content: string): ReviewResult {
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'Review completed',
        suggestions: parsed.suggestions || [],
        confidence: 0.8
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        summary: content,
        suggestions: [],
        confidence: 0.5
      };
    }
  }
}
