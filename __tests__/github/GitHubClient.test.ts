import { GitHubClient } from '../../src/github/GitHubClient';
import { Octokit } from '@octokit/rest';

jest.mock('@octokit/rest');
const MockedOctokit = Octokit as jest.MockedClass<typeof Octokit>;

describe('GitHubClient', () => {
  it('should fetch PR diff successfully', async () => {
    const mockGetPR = jest.fn().mockResolvedValue({
      data: {
        number: 123,
        base: { sha: 'abc123' },
        head: { sha: 'def456' }
      }
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
          get: mockGetPR
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
  });
});