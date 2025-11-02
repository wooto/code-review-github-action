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
    if (diff.length <= this.maxChunkSize) {
      return [{
        content: diff,
        files: this.extractFiles(diff),
        size: diff.length
      }];
    }

    const chunks: ChunkedDiff[] = [];

    // For simple text chunks, split by character count
    for (let i = 0; i < diff.length; i += this.maxChunkSize) {
      const chunk = diff.substring(i, i + this.maxChunkSize);
      chunks.push({
        content: chunk,
        files: this.extractFiles(chunk),
        size: chunk.length
      });
    }

    return chunks;
  }

  filterFiles(files: string[], skipPatterns: string[]): string[] {
    if (!skipPatterns || skipPatterns.length === 0) {
      return files;
    }

    return files.filter(file => {
      return !skipPatterns.some(pattern => {
        // Simple glob pattern matching
        const regex = new RegExp(
          pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
        );
        return regex.test(file);
      });
    });
  }

  private extractFiles(diff: string): string[] {
    const fileRegex = /^File:\s*(.+)$/gm;
    const files = [];
    let match;

    while ((match = fileRegex.exec(diff)) !== null) {
      files.push(match[1]);
    }

    return files;
  }

  buildContext(prNumber: number, repository: string, branch: string, files: string[]): ReviewContext {
    return {
      prNumber,
      repository,
      branch,
      files
    };
  }
}