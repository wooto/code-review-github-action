// src/index.ts
import * as core from '@actions/core';
import * as github from '@actions/github';
import { GitHubClient } from './github/GitHubClient';
import { DiffProcessor } from './diff/DiffProcessor';
import { ProviderManager } from './providers/ProviderManager';
import { OpenAIProvider } from './providers/openai/OpenAIProvider';
import { ClaudeProvider } from './providers/claude/ClaudeProvider';
import { GeminiProvider } from './providers/gemini/GeminiProvider';

async function run(): Promise<void> {
  try {
    // Get inputs
    const githubToken = core.getInput('github-token', { required: true });
    const providersInput = core.getInput('providers') || 'openai,claude,gemini';
    const reviewFocus = core.getInput('review-focus') || 'security,performance,style';
    const chunkSize = parseInt(core.getInput('chunk-size') || '2000');
    const customPrompt = core.getInput('custom-prompt');
    const skipPatterns = core.getInput('skip-patterns')?.split(',') || [];

    // Get API keys arrays
    const openaiKeys = core.getMultilineInput('openai-api-keys');
    const claudeKeys = core.getMultilineInput('claude-api-keys');
    const geminiKeys = core.getMultilineInput('gemini-api-keys');

    // Get PR context
    const context = github.context;
    if (!context.payload.pull_request) {
      throw new Error('This action can only be run on pull requests');
    }

    const prNumber = context.payload.pull_request.number;
    const { owner, repo } = context.repo;

    core.info(`Processing PR #${prNumber} in ${owner}/${repo}`);
    core.info(`Using providers: ${providersInput}`);

    // Initialize GitHub client
    const githubClient = new GitHubClient(githubToken);

    // Get PR diff
    const diff = await githubClient.getPRDiff(owner, repo, prNumber);
    if (!diff) {
      core.info('No changes found in PR');
      return;
    }

    // Process diff
    const diffProcessor = new DiffProcessor(chunkSize);
    const chunks = diffProcessor.chunkDiff(diff);

    // Initialize providers
    const providers = [];
    const enabledProviders = providersInput.split(',').map(p => p.trim().toLowerCase());

    if (enabledProviders.includes('openai') && openaiKeys.length > 0) {
      providers.push(new OpenAIProvider({ apiKeys: openaiKeys }));
    }

    if (enabledProviders.includes('claude') && claudeKeys.length > 0) {
      providers.push(new ClaudeProvider({ apiKeys: claudeKeys }));
    }

    if (enabledProviders.includes('gemini') && geminiKeys.length > 0) {
      providers.push(new GeminiProvider({ apiKeys: geminiKeys }));
    }

    if (providers.length === 0) {
      throw new Error('No valid providers configured. Please provide at least one API key.');
    }

    const providerManager = new ProviderManager(providers);

    // Analyze chunks
    const allSuggestions = [];
    const reviewContext = diffProcessor.buildContext(
      prNumber,
      `${owner}/${repo}`,
      context.payload.pull_request.head.ref,
      []
    );

    for (const chunk of chunks) {
      core.info(`Analyzing chunk (${chunk.size} bytes, ${chunk.files.length} files)`);

      try {
        const result = await providerManager.analyzeCode(chunk.content, reviewContext);
        allSuggestions.push(...result.suggestions);

        core.info(`Chunk analysis completed. Confidence: ${result.confidence}`);
      } catch (error) {
        core.warning(`Failed to analyze chunk: ${error}`);
        // Continue with other chunks
      }
    }

    // Filter and format results
    const filteredSuggestions = allSuggestions.filter(suggestion => {
      const file = suggestion.file;
      // filterFiles returns files that should be kept (not matching skip patterns)
      const keepFiles = diffProcessor.filterFiles([file], skipPatterns);
      return keepFiles.includes(file);
    });

    // Create review comment
    const summary = `🤖 AI Code Review Summary

**Focus Areas:** ${reviewFocus}
**Files Analyzed:** ${chunks.flatMap(c => c.files).length}
**Suggestions Found:** ${filteredSuggestions.length}

${filteredSuggestions.length > 0 ?
  filteredSuggestions.map(s =>
    `**${s.severity.toUpperCase()}** - \`${s.file}:${s.line}\`
${s.message}${s.suggestion ? `\n\n💡 **Suggestion:** ${s.suggestion}` : ''}`
  ).join('\n\n') :
  '🎉 No issues found! Your code looks great.'
}

---
*Review powered by multi-provider AI analysis*`;

    await githubClient.createReviewComment(owner, repo, prNumber, summary);

    // Create individual comments for high-severity issues
    const highSeveritySuggestions = filteredSuggestions.filter(s => s.severity === 'high');
    for (const suggestion of highSeveritySuggestions) {
      await githubClient.createReviewCommentThread(owner, repo, prNumber, {
        path: suggestion.file,
        line: suggestion.line,
        body: `🚨 **High Severity Issue**

${suggestion.message}

${suggestion.suggestion ? `💡 **Suggestion:** ${suggestion.suggestion}` : ''}`
      });
    }

    core.setOutput('review-summary', summary);
    core.info(`Review completed with ${filteredSuggestions.length} suggestions`);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

if (require.main === module) {
  run();
}

export { run };