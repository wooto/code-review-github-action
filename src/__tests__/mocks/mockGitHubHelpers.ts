import { PRInfo, ReviewComment } from '../../github/GitHubClient';

export class MockGitHubClient {
  private mockPRs: Map<string, PRInfo> = new Map();
  private mockDiffs: Map<string, string> = new Map();
  private shouldFail: boolean = false;
  private failureReason: string = 'GitHub API Error';
  private failureType: 'error' | 'rate-limit' | 'timeout' | 'network' = 'error';
  private failureCount: number = 1;
  private currentFailureCount: number = 0;
  private delayMs: number = 100;
  private createdComments: ReviewComment[] = [];
  private createdReviews: Array<{body: string, comments: ReviewComment[]}> = [];
  private token: string;

  // Mock methods
  public createReviewComment: jest.MockedFunction<(owner: string, repo: string, prNumber: number, body: string, comments?: ReviewComment[]) => Promise<void>>;
  public createReviewCommentThread: jest.MockedFunction<(owner: string, repo: string, prNumber: number, comment: ReviewComment) => Promise<void>>;

  constructor(token?: string) {
    this.token = token || 'mock-token';

    // Initialize mock methods
    this.createReviewComment = jest.fn().mockImplementation(this._createReviewComment.bind(this));
    this.createReviewCommentThread = jest.fn().mockImplementation(this._createReviewCommentThread.bind(this));
  }

  // Setup methods for testing
  addMockPR(owner: string, repo: string, prNumber: number, prInfo: PRInfo): void {
    const key = `${owner}/${repo}#${prNumber}`;
    this.mockPRs.set(key, prInfo);
  }

  addMockDiff(owner: string, repo: string, prNumber: number, diff: string): void {
    const key = `${owner}/${repo}#${prNumber}`;
    this.mockDiffs.set(key, diff);
  }

  setFailure(shouldFail: boolean, reason: string = 'GitHub API Error'): void {
    this.shouldFail = shouldFail;
    this.failureReason = reason;
  }

  setFailureType(
    shouldFail: boolean,
    failureType: 'error' | 'rate-limit' | 'timeout' | 'network' = 'error',
    reason: string = 'GitHub API Error',
    failureCount: number = 1,
    delayMs: number = 100
  ): void {
    this.shouldFail = shouldFail;
    this.failureType = failureType;
    this.failureReason = reason;
    this.failureCount = failureCount;
    this.delayMs = delayMs;
    this.currentFailureCount = 0;
  }

  resetFailures(): void {
    this.currentFailureCount = 0;
  }

  setDelay(delayMs: number): void {
    this.delayMs = delayMs;
  }

  // Override methods for mocking
  async getPRInfo(owner: string, repo: string, prNumber: number): Promise<PRInfo> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delayMs));

    if (this.shouldFail && this.currentFailureCount < this.failureCount) {
      this.currentFailureCount++;

      switch (this.failureType) {
        case 'timeout':
          throw new Error(`GitHub API timeout: Request timed out after 30000ms`);
        case 'rate-limit':
          throw new Error(`GitHub API rate limit exceeded: Retry after ${Math.floor(Math.random() * 60) + 1} seconds`);
        case 'network':
          throw new Error(`GitHub Network error: Unable to reach api.github.com`);
        case 'error':
        default:
          throw new Error(`GitHub API Error: ${this.failureReason}`);
      }
    }

    const key = `${owner}/${repo}#${prNumber}`;
    const mockPR = this.mockPRs.get(key);

    if (!mockPR) {
      throw new Error(`No mock PR found for ${key}`);
    }

    return mockPR;
  }

  async getPRDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delayMs));

    if (this.shouldFail && this.currentFailureCount < this.failureCount) {
      this.currentFailureCount++;

      switch (this.failureType) {
        case 'timeout':
          throw new Error(`GitHub API timeout: Request timed out after 30000ms`);
        case 'rate-limit':
          throw new Error(`GitHub API rate limit exceeded: Retry after ${Math.floor(Math.random() * 60) + 1} seconds`);
        case 'network':
          throw new Error(`GitHub Network error: Unable to reach api.github.com`);
        case 'error':
        default:
          throw new Error(`GitHub API Error: ${this.failureReason}`);
      }
    }

    const key = `${owner}/${repo}#${prNumber}`;
    const mockDiff = this.mockDiffs.get(key);

    if (mockDiff !== undefined) {
      return mockDiff;
    }

    // Return a default diff if no specific mock is set
    return `File: src/example.ts
@@ -1,5 +1,7 @@
 function example() {
-  console.log('old');
+  console.log('new');
+  // New comment
+  return true;
 }`;
  }

  async _createReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    comments?: ReviewComment[]
  ): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delayMs));

    if (this.shouldFail && this.currentFailureCount < this.failureCount) {
      this.currentFailureCount++;

      switch (this.failureType) {
        case 'timeout':
          throw new Error(`GitHub API timeout: Request timed out after 30000ms`);
        case 'rate-limit':
          throw new Error(`GitHub API rate limit exceeded: Retry after ${Math.floor(Math.random() * 60) + 1} seconds`);
        case 'network':
          throw new Error(`GitHub Network error: Unable to reach api.github.com`);
        case 'error':
        default:
          throw new Error(`GitHub API Error: ${this.failureReason}`);
      }
    }

    this.createdReviews.push({
      body,
      comments: comments || []
    });
  }

  async _createReviewCommentThread(
    owner: string,
    repo: string,
    prNumber: number,
    comment: ReviewComment
  ): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, this.delayMs));

    if (this.shouldFail && this.currentFailureCount < this.failureCount) {
      this.currentFailureCount++;

      switch (this.failureType) {
        case 'timeout':
          throw new Error(`GitHub API timeout: Request timed out after 30000ms`);
        case 'rate-limit':
          throw new Error(`GitHub API rate limit exceeded: Retry after ${Math.floor(Math.random() * 60) + 1} seconds`);
        case 'network':
          throw new Error(`GitHub Network error: Unable to reach api.github.com`);
        case 'error':
        default:
          throw new Error(`GitHub API Error: ${this.failureReason}`);
      }
    }

    this.createdComments.push(comment);
  }

  // Helper methods for testing
  getCreatedComments(): ReviewComment[] {
    return [...this.createdComments];
  }

  getCreatedReviews(): Array<{body: string, comments: ReviewComment[]}> {
    return [...this.createdReviews];
  }

  clearCreatedData(): void {
    this.createdComments = [];
    this.createdReviews = [];
  }

  // Factory methods for common test scenarios
  static createWithBasicPR(): MockGitHubClient {
    const client = new MockGitHubClient();

    client.addMockPR('owner', 'repo', 123, {
      number: 123,
      title: 'Test PR',
      baseSha: 'abc123',
      headSha: 'def456',
      files: ['src/index.ts', 'src/providers/ProviderManager.ts']
    });

    client.addMockDiff('owner', 'repo', 123, `File: src/index.ts
@@ -44,7 +44,8 @@
   }

-  processReview() {
+  async processReview() {
+    // TODO: Add error handling
     const diff = await this.getDiff();
     const results = await this.analyzeCode(diff);
     return results;
@@ -52,6 +53,12 @@
 }

 File: src/providers/ProviderManager.ts
@@ -20,7 +20,8 @@
 export class ProviderManager {
   private providers: Map<string, IProvider> = new Map();

-  addProvider(name: string, provider: IProvider) {
+  addProvider(name: string, provider: IProvider) {
+    // TODO: Validate provider
     this.providers.set(name, provider);
   }
+
+  // Magic number for retry logic
+  private MAX_RETRIES = 3;`);

    return client;
  }

  static createWithSecurityPR(): MockGitHubClient {
    const client = new MockGitHubClient();

    client.addMockPR('owner', 'repo', 456, {
      number: 456,
      title: 'Security updates',
      baseSha: 'xyz789',
      headSha: 'uvw012',
      files: ['src/github/GitHubClient.ts', 'src/index.ts']
    });

    client.addMockDiff('owner', 'repo', 456, `File: src/github/GitHubClient.ts
@@ -64,7 +64,8 @@
   async getPRDiff(owner: string, repo: string, prNumber: number): Promise<string> {
     try {
       const query = \`SELECT * FROM prs WHERE pr_number = \${prNumber}\`;
-      const result = await db.query(query);
+      const result = await db.query('SELECT * FROM prs WHERE pr_number = ?', [prNumber]);
       return result.diff;
     } catch (error) {
       throw new Error(\`Failed to get diff: \${error}\`);
     }

File: src/index.ts
@@ -86,7 +87,8 @@
   async handleError(error: Error) {
     console.error('Processing error:', error);
-    console.log('API Key:', process.env.API_KEY);
+    // TODO: Remove sensitive logging
+    console.log('API Key:', process.env.API_KEY?.substring(0, 4) + '***');
     return error.message;
   }`);

    return client;
  }

  static createWithEmptyPR(): MockGitHubClient {
    const client = new MockGitHubClient();

    client.addMockPR('owner', 'repo', 789, {
      number: 789,
      title: 'Documentation update',
      baseSha: 'mno345',
      headSha: 'pqr678',
      files: ['README.md']
    });

    client.addMockDiff('owner', 'repo', 789, `File: README.md
@@ -1,4 +1,5 @@
 # Code Review Action

-A simple code review action.
No newline at end of file
+A simple code review action.
+
+## Usage
+Add this to your workflow...`);

    return client;
  }
}
