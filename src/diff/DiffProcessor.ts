import { ReviewContext } from '../providers/IProvider';

export interface ChunkedDiff {
  content: string;
  files: string[];
  size: number;
}

export class DiffProcessor {
  private maxChunkSize: number;

  constructor(maxChunkSize: number = 2000) {
    this.maxChunkSize = maxChunkSize;
  }

  chunkDiff(diff: string): ChunkedDiff[] {
    if (!diff || diff.trim().length === 0) {
      return [];
    }

    if (diff.length <= this.maxChunkSize) {
      return [{
        content: diff,
        files: this.extractFiles(diff),
        size: diff.length
      }];
    }

    const chunks: ChunkedDiff[] = [];
    const lines = diff.split('\n');
    let currentChunk = '';
    let currentSize = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineWithNewline = line + '\n';

      // Check if this line starts a new file or hunk
      const isNewFile = line.startsWith('File:') || line.startsWith('diff --git');
      const isNewHunk = line.startsWith('@@');

      // If adding this line would exceed the chunk size AND we're not in the middle of a hunk,
      // and we have enough content already, start a new chunk
      const shouldStartNewChunk = currentSize > 0 &&
                                (currentSize + lineWithNewline.length) > this.maxChunkSize &&
                                !this.isInMiddleOfHunk(currentChunk) &&
                                (isNewFile || isNewHunk || currentSize > this.maxChunkSize / 2);

      if (shouldStartNewChunk) {
        // Save current chunk if it has content
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            files: this.extractFiles(currentChunk),
            size: currentChunk.length
          });
        }

        // Start new chunk
        currentChunk = lineWithNewline;
        currentSize = lineWithNewline.length;
      } else {
        // Add line to current chunk
        currentChunk += lineWithNewline;
        currentSize += lineWithNewline.length;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        files: this.extractFiles(currentChunk),
        size: currentChunk.length
      });
    }

    return chunks;
  }

  filterFiles(files: string[], skipPatterns: string[]): string[] {
    try {
      if (!files || !Array.isArray(files)) {
        return [];
      }

      if (!skipPatterns || skipPatterns.length === 0) {
        return [...files]; // Return a copy to avoid mutation
      }

      return files.filter(file => {
        if (!file || typeof file !== 'string') {
          return false;
        }

        return !skipPatterns.some(pattern => {
          if (!pattern || typeof pattern !== 'string') {
            return false;
          }

          try {
            // Simple glob pattern matching
            const regex = new RegExp(
              pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
            );
            return regex.test(file);
          } catch (error) {
            console.warn(`Invalid pattern "${pattern}":`, error);
            return false;
          }
        });
      });
    } catch (error) {
      console.warn('Error filtering files:', error);
      return [...files]; // Return original files on error
    }
  }

  private isInMiddleOfHunk(chunk: string): boolean {
    const lines = chunk.split('\n');

    // Count diff context and change lines that don't start a new hunk
    let inHunk = false;
    let hasUnclosedHunk = false;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        inHunk = true;
      } else if (line.startsWith('diff --git') || line.startsWith('File:')) {
        inHunk = false;
        hasUnclosedHunk = false;
      } else if (inHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-') || line.trim() === '')) {
        hasUnclosedHunk = true;
      }
    }

    return hasUnclosedHunk;
  }

  private extractFiles(diff: string): string[] {
    try {
      const fileRegex = /^File:\s*(.+)$/gm;
      const files = [];
      let match;

      while ((match = fileRegex.exec(diff)) !== null) {
        files.push(match[1]);
      }

      return files;
    } catch (error) {
      console.warn('Failed to extract files from diff:', error);
      return [];
    }
  }

  buildContext(prNumber: number, repository: string, branch: string, files: string[]): ReviewContext {
    try {
      // Validate inputs
      if (typeof prNumber !== 'number' || prNumber <= 0) {
        throw new Error('PR number must be a positive number');
      }

      if (!repository || typeof repository !== 'string') {
        throw new Error('Repository must be a non-empty string');
      }

      if (!branch || typeof branch !== 'string') {
        throw new Error('Branch must be a non-empty string');
      }

      if (!files || !Array.isArray(files)) {
        throw new Error('Files must be an array');
      }

      return {
        prNumber,
        repository: repository.trim(),
        branch: branch.trim(),
        files: [...files] // Return a copy to avoid mutation
      };
    } catch (error) {
      throw new Error(`Failed to build review context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}