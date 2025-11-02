import { getOctokit } from '@actions/github';

export interface PRInfo {
  number: number;
  title: string;
  baseSha: string;
  headSha: string;
  files: string[];
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

export class GitHubClient {
  private octokit: ReturnType<typeof getOctokit>;

  constructor(token: string) {
    this.octokit = getOctokit(token);
  }

  async getPRInfo(owner: string, repo: string, prNumber: number): Promise<PRInfo> {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });

      // Get the list of files in the PR
      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber
      });

      return {
        number: data.number,
        title: data.title,
        baseSha: data.base.sha,
        headSha: data.head.sha,
        files: files.map((file: any) => file.filename)
      };
    } catch (error) {
      throw new Error(`Failed to get PR info for ${owner}/${repo}#${prNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPRDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    try {
      const prInfo = await this.getPRInfo(owner, repo, prNumber);

      const { data } = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: prInfo.baseSha,
        head: prInfo.headSha
      });

      const diffs = data.files
        ?.filter((file: any) => file.patch)
        .map((file: any) => `File: ${file.filename}\n${file.patch}`)
        .join('\n\n') || '';

      return diffs;
    } catch (error) {
      throw new Error(`Failed to get PR diff for ${owner}/${repo}#${prNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    comments?: ReviewComment[]
  ): Promise<void> {
    try {
      await this.octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body,
        comments: comments || [],
        event: 'COMMENT'
      });
    } catch (error) {
      throw new Error(`Failed to create review comment for ${owner}/${repo}#${prNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createReviewCommentThread(
    owner: string,
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<void> {
    try {
      // Get the PR info to use the actual head commit SHA
      const prInfo = await this.getPRInfo(owner, repo, prNumber);

      await this.octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number: prNumber,
        body: comment.body,
        commit_id: prInfo.headSha,
        path: comment.path,
        line: comment.line
      });
    } catch (error) {
      throw new Error(`Failed to create review comment thread for ${owner}/${repo}#${prNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
