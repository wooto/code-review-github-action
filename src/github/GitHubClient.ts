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
  severity?: 'high' | 'medium' | 'low';
  category?: string;
  suggestion?: string;
  codeExample?: string;
}

export interface ExistingComment {
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
        files: files.map((file: { filename: string }) => file.filename)
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
        ?.filter((file: { patch?: string }) => file.patch)
        .map((file: { filename: string; patch?: string }) => `File: ${file.filename}\n${file.patch || ''}`)
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

  async isDuplicateComment(
    newComment: ReviewComment,
    existingComments: ExistingComment[]
  ): Promise<boolean> {
    return existingComments.some(existing =>
      existing.path === newComment.path &&
      existing.line === newComment.line &&
      existing.body.includes(newComment.body.substring(0, 50)) // Check first 50 chars
    );
  }

  async createReviewCommentWithDeduplication(
    owner: string,
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<boolean> {
    try {
      // Get existing comments for the file
      const { data: existingComments } = await this.octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: prNumber
      });

      // Map GitHub API response to our ExistingComment interface
      const fileComments: ExistingComment[] = existingComments
        .filter((c: any) => c.path === comment.path && c.line === comment.line)
        .map((c: any) => ({
          path: c.path,
          line: c.line,
          body: c.body
        }));

      const isDuplicate = await this.isDuplicateComment(comment, fileComments);

      if (!isDuplicate) {
        await this.createReviewCommentThread(owner, repo, prNumber, comment);
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to check/create review comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
