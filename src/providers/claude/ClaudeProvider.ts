import { ConfigurableProvider, ProviderConfig } from '../BaseProvider';
import { ReviewContext, ReviewResult, ReviewSuggestion } from '../IProvider';
import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeConfig {
  apiKeys: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class ClaudeProvider extends ConfigurableProvider {
  name = 'Claude';
  private clients: Map<string, Anthropic> = new Map();

  constructor(config: ClaudeConfig) {
    super({
      name: 'Claude',
      apiKeys: config.apiKeys,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      timeout: config.timeout
    });

    // Initialize clients for each API key
    this.apiKeys.forEach(key => {
      this.clients.set(key, new Anthropic({
        apiKey: key.trim(),
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

      // Simple health check - send a minimal message
      await client.messages.create({
        model: this.getModel(),
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      });
      return true;
    } catch (error) {
      // Sanitize error message to prevent security leaks
      console.warn('Claude health check failed');
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
      throw new Error('Claude client not found for API key');
    }

    const prompt = this.buildPrompt(diff, context);

    try {
      const response = await client.messages.create({
        model: this.getModel(),
        max_tokens: this.getMaxTokens(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      return this.parseResponse(content.text);
    } catch (error) {
      // Sanitize error message to prevent security leaks
      throw new Error('Claude API error: Request failed');
    } finally {
      // Move to next API key for round-robin
      this.advanceToNextApiKey();
    }
  }

  private buildPrompt(diff: string, context: ReviewContext): string {
    return `You are an expert code reviewer. Please analyze this pull request diff:

Repository: ${context.repository}
PR Number: ${context.prNumber}
Branch: ${context.branch}

\`\`\`diff
${diff}
\`\`\`

Focus on:
- Security vulnerabilities and potential exploits
- Performance bottlenecks and optimizations
- Code maintainability and readability
- Edge cases and error handling
- Adherence to best practices and conventions

Provide your response in this JSON format:
{
  "summary": "Brief summary of your review",
  "suggestions": [
    {
      "file": "filename.js",
      "line": 10,
      "severity": "low|medium|high",
      "message": "Description of the issue",
      "suggestion": "How to fix it (optional)"
    }
  ]
}`;
  }

  protected getDefaultModel(): string {
    return 'claude-3-sonnet-20240229';
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

  private parseResponse(content: string): ReviewResult {
    try {
      // Extract JSON from response (Claude might include explanatory text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Claude review completed',
        suggestions: parsed.suggestions || [],
        confidence: 0.85
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        summary: content,
        suggestions: [],
        confidence: 0.6
      };
    }
  }
}