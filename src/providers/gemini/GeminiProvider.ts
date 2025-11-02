import { ConfigurableProvider, ProviderConfig } from '../BaseProvider';
import { ReviewContext, ReviewResult, ReviewSuggestion } from '../IProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiConfig {
  apiKeys: string[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export class GeminiProvider extends ConfigurableProvider {
  name = 'Gemini';
  private clients: Map<string, GoogleGenerativeAI> = new Map();

  constructor(config: GeminiConfig) {
    super({
      name: 'Gemini',
      apiKeys: config.apiKeys,
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      timeout: config.timeout
    });

    // Initialize clients for each API key
    this.apiKeys.forEach(key => {
      this.clients.set(key, new GoogleGenerativeAI(key.trim()));
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

      // Simple health check - get the model
      const model = client.getGenerativeModel({ model: this.getModel() });
      // Try a simple generation to verify the API key works
      await model.generateContent('Hi');
      return true;
    } catch (error) {
      // Sanitize error message to prevent security leaks
      console.warn('Gemini health check failed');
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
      throw new Error('Gemini client not found for API key');
    }

    const prompt = this.buildPrompt(diff, context);

    try {
      const model = client.getGenerativeModel({ model: this.getModel() });
      const response = await model.generateContent(prompt);
      const content = response.response.text();

      if (!content) {
        throw new Error('No response from Gemini');
      }

      return this.parseResponse(content);
    } catch (error) {
      // Sanitize error message to prevent security leaks
      throw new Error('Gemini API error: Request failed');
    } finally {
      // Move to next API key for round-robin
      this.advanceToNextApiKey();
    }
  }

  protected getDefaultModel(): string {
    return 'gemini-pro';
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
    return `You are an expert code reviewer. Analyze this pull request diff and provide constructive feedback:

Repository: ${context.repository}
PR Number: ${context.prNumber}
Branch: ${context.branch}

\`\`\`diff
${diff}
\`\`\`

Please focus on:
- Security issues and vulnerabilities
- Performance optimization opportunities
- Code quality and maintainability
- Bug potential and edge cases
- Best practices and design patterns

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

  private parseResponse(content: string): ReviewResult {
    try {
      // Extract JSON from response (Gemini might include explanatory text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Gemini review completed',
        suggestions: parsed.suggestions || [],
        confidence: 0.82
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
