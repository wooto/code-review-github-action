// src/index.ts
import * as core from '@actions/core';

async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('github-token', { required: true });
    const providers = core.getInput('providers') || 'openai,claude,gemini';

    core.info('Starting AI code review...');
    core.info(`Using providers: ${providers}`);

    // TODO: Implement actual review logic
    core.setOutput('review-summary', 'Review completed successfully');

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