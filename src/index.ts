import * as core from '@actions/core';
import * as github from '@actions/github';
import { DiffProcessor } from './DiffProcessor';
import { VersionSafeUtils } from './version-safe-utils';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github_token', { required: true });
    const octokit = github.getOctokit(token);

    const context = github.context;
    if (!context.payload.pull_request) {
      core.setFailed('This action only works on pull requests');
      return;
    }

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
    });

    const diffProcessor = new DiffProcessor();
    const results = [];

    for (const file of files) {
      if (file.patch) {
        const analysis = diffProcessor.processDiff(file.patch, file.filename || '');
        results.push({
          file: file.filename,
          analysis: analysis
        });
      }
    }

    // Create summary comment
    const summary = generateSummary(results);

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.pull_request.number,
      body: summary
    });

    core.info('Code review completed successfully');

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred');
    }
  }
}

function generateSummary(results: any[]): string {
  const totalFiles = results.length;
  const totalIssues = results.reduce((sum, result) => sum + result.analysis.issues.length, 0);

  let summary = `## Code Review Summary\n\n`;
  summary += `- **Files reviewed**: ${totalFiles}\n`;
  summary += `- **Issues found**: ${totalIssues}\n\n`;

  if (totalIssues > 0) {
    summary += `### Issues Found:\n\n`;
    results.forEach(result => {
      if (result.analysis.issues.length > 0) {
        summary += `#### ${result.file}\n`;
        result.analysis.issues.forEach((issue: any) => {
          summary += `- ${issue.severity}: ${issue.message} (line ${issue.line})\n`;
        });
        summary += '\n';
      }
    });
  } else {
    summary += `✅ No issues found! Great job!\n`;
  }

  return summary;
}

if (require.main === module) {
  run();
}

export { run };