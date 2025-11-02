# Usage Guide

This guide provides detailed instructions for using the AI Code Review GitHub Action with various configurations and use cases.

## Table of Contents

- [Setup](#setup)
- [API Key Configuration](#api-key-configuration)
- [Multi-Provider Configuration](#multi-provider-configuration)
- [Round-Robin Load Balancing](#round-robin-load-balancing)
- [Custom Review Focus](#custom-review-focus)
- [Advanced Configuration](#advanced-configuration)
- [Bot Migration Path](#bot-migration-path)
- [Troubleshooting](#troubleshooting)

## Setup

### 1. Create Repository Secrets

Navigate to your GitHub repository settings → Secrets and variables → Actions and add the following secrets:

#### OpenAI API Keys
Create a secret named `OPENAI_API_KEYS` with JSON array format:
```json
["sk-YourOpenAIKey1", "sk-YourOpenAIKey2", "sk-YourOpenAIKey3"]
```

#### Claude API Keys
Create a secret named `CLAUDE_API_KEYS` with JSON array format:
```json
["sk-ant-YourClaudeKey1", "sk-ant-YourClaudeKey2"]
```

#### Gemini API Keys
Create a secret named `GEMINI_API_KEYS` with JSON array format:
```json
["AIzaYourGeminiKey1", "AIzaYourGeminiKey2"]
```

### 2. Create Workflow File

Create `.github/workflows/ai-review.yml` in your repository:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: AI Code Review
        uses: your-username/code-review-action@latest
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
          claude-api-keys: ${{ secrets.CLAUDE_API_KEYS }}
          gemini-api-keys: ${{ secrets.GEMINI_API_KEYS }}
```

## API Key Configuration

### Single Provider Setup

If you only want to use one AI provider, configure only that provider's keys:

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
    providers: 'openai'  # Only use OpenAI
```

### Multiple Keys per Provider

Each provider supports multiple API keys for load balancing and rate limit handling:

```json
// Example: 3 OpenAI keys for high-volume repositories
["sk-proj-key1", "sk-proj-key2", "sk-proj-key3"]

// Example: 2 Claude keys for redundancy
["sk-ant-key1", "sk-ant-key2"]
```

The action automatically distributes requests across available keys using round-robin rotation.

## Multi-Provider Configuration

### Provider Selection

Control which providers are used with the `providers` input:

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
    claude-api-keys: ${{ secrets.CLAUDE_API_KEYS }}
    gemini-api-keys: ${{ secrets.GEMINI_API_KEYS }}
    providers: 'openai,claude'  # Exclude Gemini
```

### Provider Priority

Providers are used in the order specified. The action will round-robin through all configured providers:

```yaml
providers: 'claude,openai,gemini'  # Claude first, then OpenAI, then Gemini
```

## Round-Robin Load Balancing

### How It Works

The action implements intelligent load balancing across two dimensions:

1. **Provider Level**: Rotates between different AI providers (OpenAI, Claude, Gemini)
2. **Key Level**: Rotates between multiple API keys within each provider

### Example Load Distribution

With 3 OpenAI keys and 2 Claude keys:

```
Request 1: OpenAI Key 1
Request 2: Claude Key 1
Request 3: OpenAI Key 2
Request 4: Gemini Key 1
Request 5: Claude Key 2
Request 6: OpenAI Key 3
```

### Benefits

- **Rate Limit Management**: Distributes API calls across multiple keys
- **Reliability**: If one provider fails, others continue working
- **Cost Optimization**: Spread costs across different providers
- **Performance**: Parallel processing when possible

## Custom Review Focus

### Predefined Focus Areas

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
    review-focus: 'security,performance,style'  # Default
```

Available focus areas:
- `security` - Security vulnerabilities and best practices
- `performance` - Performance optimizations and bottlenecks
- `style` - Code style and readability
- `bugs` - Potential bugs and edge cases
- `maintainability` - Code maintainability and documentation
- `testing` - Test coverage and test quality

### Custom Focus Areas

```yaml
review-focus: 'security,performance,maintainability'
```

### Custom Instructions

Use the `custom-prompt` input for specific requirements:

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
    custom-prompt: |
      Focus on:
      1. Accessibility compliance
      2. Internationalization support
      3. Error handling patterns
      4. Documentation completeness

      Please provide specific line-by-line suggestions for improvements.
```

## Advanced Configuration

### File Filtering

Exclude certain files from analysis:

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
    skip-patterns: '*.min.js,*.min.css,package-lock.json,dist/*,generated/*'
```

### Chunk Size Adjustment

For large repositories, adjust chunk size:

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
    chunk-size: '3000'  # Larger chunks for faster processing
```

### Conditional Review

Only review certain types of changes:

```yaml
- name: AI Code Review
  if: contains(github.event.pull_request.labels.*.name, 'needs-review')
  uses: your-username/code-review-action@latest
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
```

## Bot Migration Path

### Architecture Overview

This GitHub Action uses a bot-ready architecture designed for easy migration to standalone services:

#### Provider Interface
```typescript
interface IProvider {
  name: string;
  analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult>;
}
```

#### Key Management
- Abstracted API key rotation logic
- Health check capabilities
- Configurable timeout and retry policies

#### Multi-Provider Support
- Round-robin distribution algorithm
- Failover handling
- Usage statistics tracking

### Migration Steps

1. **Extract Provider Classes**: Reuse OpenAI, Claude, and Gemini providers
2. **Implement Key Management**: Port round-robin key rotation
3. **Add Health Monitoring**: Use built-in health check methods
4. **Centralize Configuration**: Adapt configuration system for bot deployment
5. **Add Webhook Handling**: Replace GitHub Actions context with webhook processing

### Bot Service Benefits

- **Reduced Latency**: No GitHub Actions queue delays
- **Cost Control**: Centralized usage tracking and limits
- **Advanced Features**: Real-time notifications, dashboards
- **Multi-Repository**: Single bot instance for multiple repositories

## Troubleshooting

### Common Issues

#### 1. "No valid providers configured"
**Cause**: No API keys provided for any provider
**Solution**: Ensure at least provider has valid API keys configured

#### 2. "API rate limit exceeded"
**Cause**: Single API key overwhelmed with requests
**Solution**: Add multiple API keys for the provider

#### 3. "This action can only be run on pull requests"
**Cause**: Workflow triggered on non-PR event
**Solution**: Ensure workflow triggers only on pull_request events

#### 4. "No changes found in PR"
**Cause**: PR has no file changes or all files filtered out
**Solution**: Check skip-patterns configuration

### Debug Mode

Enable debug logging:

```yaml
- name: AI Code Review
  uses: your-username/code-review-action@latest
  env:
    ACTIONS_STEP_DEBUG: true
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
```

### Support

For issues and questions:
1. Check [GitHub Issues](https://github.com/your-username/code-review-action/issues)
2. Review [Examples](../examples/)
3. Create a new issue with details about your configuration

## Best Practices

1. **Use Multiple Keys**: Configure at least 2-3 keys per provider for reliability
2. **Start Small**: Begin with one provider, then add others as needed
3. **Custom Focus**: Tailor review-focus to your project's specific needs
4. **Monitor Usage**: Track API usage and costs across providers
5. **Filter Noise**: Use skip-patterns to exclude generated files and dependencies
