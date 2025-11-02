import * as core from '@actions/core';
import * as github from '@actions/github';
import { run } from '../src/index';

// Mock the external dependencies
jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(),
  context: {}
}));

const mockCore = core as jest.Mocked<typeof core>;
const mockGithub = github as jest.Mocked<typeof github>;

describe('index.ts', () => {
  let mockOctokit: any;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock octokit
    mockOctokit = {
      rest: {
        pulls: {
          listFiles: jest.fn()
        },
        issues: {
          createComment: jest.fn()
        }
      }
    };

    // Setup mock context
    mockContext = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      payload: {
        pull_request: {
          number: 123
        }
      }
    };

    mockGithub.getOctokit.mockReturnValue(mockOctokit);
    Object.assign(mockGithub.context, mockContext);
    mockCore.getInput.mockReturnValue('test-token');
  });

  describe('run function', () => {
    it('should process pull request files and create summary comment', async () => {
      // Mock input
      const mockFiles = [
        {
          filename: 'test.js',
          patch: '@@ -1,3 +1,4 @@\n+console.log("test");\n console.log("existing");'
        }
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: mockFiles
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockCore.getInput).toHaveBeenCalledWith('github_token', { required: true });
      expect(mockGithub.getOctokit).toHaveBeenCalledWith('test-token');
      expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123
      });
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Code review completed successfully');
    });

    it('should fail when not running on pull request', async () => {
      // Reset context without pull_request
      Object.assign(mockGithub.context, {
        repo: {
          owner: 'test-owner',
          repo: 'test-repo'
        },
        payload: {}
      });

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('This action only works on pull requests');
    });

    it('should handle files without patches', async () => {
      const mockFiles = [
        { filename: 'binary.jpg' }, // No patch
        { filename: 'test.js', patch: '@@ -1,1 +1,2 @@\n+console.log("test");' }
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: mockFiles
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Code review completed successfully');
    });

    it('should handle empty file list', async () => {
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: []
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Code review completed successfully');
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockOctokit.rest.pulls.listFiles.mockRejectedValue(apiError);

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('API Error');
    });

    it('should handle non-Error objects', async () => {
      mockOctokit.rest.pulls.listFiles.mockRejectedValue('String error');

      await run();

      expect(mockCore.setFailed).toHaveBeenCalledWith('An unexpected error occurred');
    });

    it('should handle missing filename', async () => {
      const mockFiles = [
        { patch: '@@ -1,1 +1,2 @@\n+console.log("test");' } // No filename
      ];

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: mockFiles
      });

      mockOctokit.rest.issues.createComment.mockResolvedValue({});

      await run();

      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
      expect(mockCore.info).toHaveBeenCalledWith('Code review completed successfully');
    });
  });
});