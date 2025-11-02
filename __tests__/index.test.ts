// __tests__/index.test.ts
import { run } from '../src/index';
import * as core from '@actions/core';

// Mock @actions/core
jest.mock('@actions/core');

describe('GitHub Action', () => {
  let mockGetInput: jest.MockedFunction<typeof core.getInput>;
  let mockInfo: jest.MockedFunction<typeof core.info>;
  let mockSetFailed: jest.MockedFunction<typeof core.setFailed>;
  let mockSetOutput: jest.MockedFunction<typeof core.setOutput>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mock functions
    mockGetInput = core.getInput as jest.MockedFunction<typeof core.getInput>;
    mockInfo = core.info as jest.MockedFunction<typeof core.info>;
    mockSetFailed = core.setFailed as jest.MockedFunction<typeof core.setFailed>;
    mockSetOutput = core.setOutput as jest.MockedFunction<typeof core.setOutput>;

    // Set up default mock behavior
    mockGetInput.mockImplementation((name, options) => {
      if (name === 'github-token') {
        return 'test-token';
      }
      return '';
    });
  });

  it('should handle missing inputs gracefully', async () => {
    await run();

    expect(mockInfo).toHaveBeenCalledWith('Starting AI code review...');
    expect(mockSetOutput).toHaveBeenCalledWith('review-summary', 'Review completed successfully');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });
});