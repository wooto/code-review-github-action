import { ConfigurableProvider } from '../BaseProvider';
import { ReviewContext, ReviewResult } from '../IProvider';
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
    } catch {
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
    } catch {
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
    return `You are an expert code reviewer. Analyze this pull request diff and provide detailed, line-by-line feedback.

Repository: ${context.repository}
PR Number: ${context.prNumber}
Branch: ${context.branch}

\`\`\`diff
${diff}
\`\`\`

ANALYSIS FOCUS:
- Security vulnerabilities (injections, authentication, data exposure)
- Performance bottlenecks (inefficient algorithms, memory usage)
- Code correctness (logic errors, edge cases, race conditions)
- Code style and maintainability (readability, structure, patterns)
- Best practices and conventions

REVIEW REQUIREMENTS:
1. Analyze EACH changed function/method individually
2. For each issue found, provide SPECIFIC line numbers
3. Suggest concrete improvements with code examples when helpful
4. Prioritize security and correctness issues
5. Consider the broader context of the changes

RESPONSE FORMAT (strict JSON):
{
  "summary": "Detailed summary of your overall review",
  "suggestions": [
    {
      "file": "filename.js",
      "line": 15,
      "severity": "high|medium|low",
      "message": "Specific description of the issue with context",
      "suggestion": "Detailed suggestion with code example if applicable"
    }
  ]
}

IMPORTANT:
- Provide feedback for EVERY significant change
- Be constructive and educational in your feedback
- Include both problems and positive observations
- If code looks good, acknowledge what's done well`;
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
    } catch {
      // Fallback if JSON parsing fails
      return {
        summary: content,
        suggestions: [],
        confidence: 0.6
      };
    }
  }
}
