import { Octokit } from '@octokit/rest';

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
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getPRInfo(owner: string, repo: string, prNumber: number): Promise<PRInfo> {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    return {
      number: data.number,
      title: data.title,
      baseSha: data.base.sha,
      headSha: data.head.sha,
      files: []
    };
  }

  async getPRDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    const prInfo = await this.getPRInfo(owner, repo, prNumber);

    const { data } = await this.octokit.rest.repos.compareCommits({
      owner,
      repo,
      base: prInfo.baseSha,
      head: prInfo.headSha
    });

    const diffs = data.files
      ?.filter(file => file.patch)
      .map(file => `File: ${file.filename}\n${file.patch}`)
      .join('\n\n') || '';

    return diffs;
  }

  async createReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    comments?: ReviewComment[]
  ): Promise<void> {
    await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      body,
      comments: comments || [],
      event: 'COMMENT'
    });
  }

  async createReviewCommentThread(
    owner: string,
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<void> {
    await this.octokit.rest.pulls.createReviewComment({
      owner,
      repo,
      pull_number: prNumber,
      body: comment.body,
      commit_id: 'HEAD', // This would typically be the actual commit SHA
      path: comment.path,
      line: comment.line
    });
  }
}