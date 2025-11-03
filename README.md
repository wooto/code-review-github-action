# AI Code Review GitHub Action

A powerful, multi-provider AI code review action that analyzes pull requests and provides intelligent feedback using OpenAI, Claude, and Gemini.

## Features

- 🤖 **Multiple AI Providers**: OpenAI GPT-4, Claude, Google Gemini
- 🔄 **Round-Robin Load Balancing**: Distribute requests across providers
- 📊 **Intelligent Chunking**: Handle large PRs efficiently
- 🎯 **Focused Reviews**: Security, performance, style, or custom focus areas
- 🚀 **Zero Configuration**: Works out of the box with sensible defaults
- 🔧 **Highly Customizable**: Extensive configuration options

## Quick Start

Add this to your `.github/workflows/ai-review.yml`:

```yaml
name: AI Code Review
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: your-username/code-review-action@latest
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          openai-api-keys: ${{ secrets.OPENAI_API_KEYS }}
          claude-api-keys: ${{ secrets.CLAUDE_API_KEYS }}
          gemini-api-keys: ${{ secrets.GEMINI_API_KEYS }}
```

## Configuration

### Required Inputs

- `github-token`: GitHub token with `pull-requests: write` permissions
- At least one provider API keys array (see below)

### Provider API Keys

Create repository secrets with array format (GitHub Actions automatically handles this as JSON):

```json
// OPENAI_API_KEYS secret value in GitHub repository settings
["sk-key1", "sk-key2", "sk-key3"]

// CLAUDE_API_KEYS secret value
["sk-ant-key1", "sk-ant-key2"]

// GEMINI_API_KEYS secret value
["AIza-key1", "AIza-key2"]
```

The action automatically round-robins through these keys to distribute load and handle rate limits.

### Bot Migration Path

This architecture is designed for easy migration to standalone bot service:

- Same provider interfaces can be reused
- Key management logic is abstracted
- Round-robin and health check logic portable
- Configuration system ready for centralized deployment

### Optional Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `providers` | Comma-separated providers to use | `openai,claude,gemini` |
| `review-focus` | Areas to focus on | `security,performance,style` |
| `chunk-size` | Max chunk size for analysis | `2000` |
| `custom-prompt` | Custom review instructions | - |
| `skip-patterns` | File patterns to ignore | `*.min.js,package-lock.json` |
| `comment-all-severities` | Create comments for all severity levels | `true` |
| `comment-format` | Comment formatting style | `enhanced` |
| `max-comments-per-file` | Maximum comments per file | `10` |
| `include-code-examples` | Include code examples in comments | `true` |

## Examples

See the [examples](./examples/) directory for more configuration options.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.
