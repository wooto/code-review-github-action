import { IProvider, ReviewContext, ReviewResult } from '../IProvider';
import Anthropic from '@anthropic-ai/sdk';
const { Completions } = Anthropic;

export class ClaudeProvider implements IProvider {
  name = 'Claude';
  private completions: InstanceType<typeof Completions>;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Claude API key is required');
    }
    const client = new Anthropic({ apiKey: apiKey.trim() });
    this.completions = new Completions(client);
  }

  async analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult> {
    const prompt = this.buildPrompt(diff, context);

    try {
      const response = await this.completions.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens_to_sample: 1000,
        prompt: `${Anthropic.HUMAN_PROMPT} ${prompt} ${Anthropic.AI_PROMPT}`,
      });

      if (!response.completion) {
        throw new Error('No response from Claude');
      }

      return this.parseResponse(response.completion);
    } catch (error) {
      // Sanitize error message to prevent security leaks
      throw new Error('Claude API error: Request failed');
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