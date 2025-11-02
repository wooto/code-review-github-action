import { GitHubClient, ReviewComment } from '../../src/github/GitHubClient';

test('should avoid duplicate comments', async () => {
  const githubClient = new GitHubClient('test-token');
  const existingComments = [
    { path: 'test.js', line: 10, body: 'existing comment' }
  ];

  // Mock existing comments check
  const newComment = { path: 'test.js', line: 10, body: 'existing comment' };
  const isDuplicate = await githubClient.isDuplicateComment(newComment, existingComments);

  expect(isDuplicate).toBe(true);
});