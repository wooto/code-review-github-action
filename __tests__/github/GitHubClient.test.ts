import { GitHubClient } from '../../src/github/GitHubClient';
import { Octokit } from '@octokit/rest';

jest.mock('@octokit/rest');
const MockedOctokit = Octokit as jest.MockedClass<typeof Octokit>;

describe('GitHubClient', () => {
  it('should fetch PR diff successfully', async () => {
    const mockGetPR = jest.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Test PR',
        base: { sha: 'abc123' },
        head: { sha: 'def456' }
      }
    });

    const mockListFiles = jest.fn().mockResolvedValue({
      data: [
        { filename: 'src/app.js' },
        { filename: 'src/utils.js' }
      ]
    });

    const mockCompareCommits = jest.fn().mockResolvedValue({
      data: {
        files: [
          { filename: 'src/app.js', patch: '@@ -1,3 +1,4 @@\n+const x = 1;' }
        ]
      }
    });

    MockedOctokit.mockImplementation(() => ({
      rest: {
        pulls: {
          get: mockGetPR,
          listFiles: mockListFiles
        },
        repos: {
          compareCommits: mockCompareCommits
        }
      }
    } as any));

    const client = new GitHubClient('test-token');
    const diff = await client.getPRDiff('owner', 'repo', 123);

    expect(diff).toContain('const x = 1;');
    expect(mockGetPR).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 123
    });
    expect(mockListFiles).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 123
    });
  });

  it('should get PR info with files list', async () => {
    const mockGetPR = jest.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Test PR',
        base: { sha: 'abc123' },
        head: { sha: 'def456' }
      }
    });

    const mockListFiles = jest.fn().mockResolvedValue({
      data: [
        { filename: 'src/app.js' },
        { filename: 'src/utils.js' }
      ]
    });

    MockedOctokit.mockImplementation(() => ({
      rest: {
        pulls: {
          get: mockGetPR,
          listFiles: mockListFiles
        }
      }
    } as any));

    const client = new GitHubClient('test-token');
    const prInfo = await client.getPRInfo('owner', 'repo', 123);

    expect(prInfo).toEqual({
      number: 123,
      title: 'Test PR',
      baseSha: 'abc123',
      headSha: 'def456',
      files: ['src/app.js', 'src/utils.js']
    });
  });

  it('should create review comment thread with correct commit SHA', async () => {
    const mockGetPR = jest.fn().mockResolvedValue({
      data: {
        number: 123,
        title: 'Test PR',
        base: { sha: 'abc123' },
        head: { sha: 'def456' }
      }
    });

    const mockListFiles = jest.fn().mockResolvedValue({ data: [] });

    const mockCreateReviewComment = jest.fn().mockResolvedValue({});

    MockedOctokit.mockImplementation(() => ({
      rest: {
        pulls: {
          get: mockGetPR,
          listFiles: mockListFiles,
          createReviewComment: mockCreateReviewComment
        }
      }
    } as any));

    const client = new GitHubClient('test-token');
    await client.createReviewCommentThread('owner', 'repo', 123, {
      path: 'src/app.js',
      line: 42,
      body: 'Consider refactoring this'
    });

    expect(mockCreateReviewComment).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 123,
      body: 'Consider refactoring this',
      commit_id: 'def456',
      path: 'src/app.js',
      line: 42
    });
  });

  it('should handle errors when getting PR info', async () => {
    const mockGetPR = jest.fn().mockRejectedValue(new Error('API Error'));

    MockedOctokit.mockImplementation(() => ({
      rest: {
        pulls: {
          get: mockGetPR,
          listFiles: jest.fn()
        }
      }
    } as any));

    const client = new GitHubClient('test-token');

    await expect(client.getPRInfo('owner', 'repo', 123))
      .rejects.toThrow('Failed to get PR info for owner/repo#123: API Error');
  });
});