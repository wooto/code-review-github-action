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
      if (name === 'providers') {
        return 'openai,claude';
      }
      return '';
    });
  });

  it('should run successfully with required inputs', async () => {
    await run();

    expect(mockInfo).toHaveBeenCalledWith('Starting AI code review...');
    expect(mockInfo).toHaveBeenCalledWith('Using providers: openai,claude');
    expect(mockSetOutput).toHaveBeenCalledWith('review-summary', 'Review completed successfully');
    expect(mockSetFailed).not.toHaveBeenCalled();
  });

  it('should use default providers when none specified', async () => {
    mockGetInput.mockImplementation((name, options) => {
      if (name === 'github-token') {
        return 'test-token';
      }
      return '';
    });

    await run();

    expect(mockInfo).toHaveBeenCalledWith('Using providers: openai,claude,gemini');
  });

  it('should handle missing github-token gracefully', async () => {
    mockGetInput.mockImplementation((name, options) => {
      if (name === 'github-token' && options?.required) {
        throw new Error('Input required and not supplied: github-token');
      }
      return '';
    });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith('Input required and not supplied: github-token');
    expect(mockSetOutput).not.toHaveBeenCalled();
  });

  it('should handle unexpected errors', async () => {
    mockGetInput.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    await run();

    expect(mockSetFailed).toHaveBeenCalledWith('Unexpected error');
    expect(mockSetOutput).not.toHaveBeenCalled();
  });
});