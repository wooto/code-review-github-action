import { VersionSafeUtils } from './version-safe-utils';

export interface Issue {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  rule?: string;
}

export interface DiffAnalysis {
  issues: Issue[];
  metrics: {
    linesAdded: number;
    linesRemoved: number;
    complexity: number;
  };
}

export class DiffProcessor {
  private versionSafeUtils: VersionSafeUtils;

  constructor() {
    this.versionSafeUtils = new VersionSafeUtils();
  }

  processDiff(patch: string, filename: string): DiffAnalysis {
    const startTime = this.versionSafeUtils.now();

    const issues: Issue[] = [];
    const lines = patch.split('\n');

    let linesAdded = 0;
    let linesRemoved = 0;
    let complexity = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('+') && !line.startsWith('+++')) {
        linesAdded++;
        complexity = this.analyzeComplexity(line, complexity);

        // Analyze for potential issues
        const lineIssues = this.analyzeLine(line.substring(1), i);
        issues.push(...lineIssues);
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        linesRemoved++;
      }
    }

    // File-specific analysis
    const fileIssues = this.analyzeFile(filename);
    issues.push(...fileIssues);

    const processingTime = this.versionSafeUtils.now() - startTime;
    console.log(`Diff processing completed in ${processingTime}ms`);

    return {
      issues,
      metrics: {
        linesAdded,
        linesRemoved,
        complexity
      }
    };
  }

  private analyzeComplexity(line: string, currentComplexity: number): number {
    // Simple complexity analysis
    if (line.includes('if') || line.includes('for') || line.includes('while')) {
      return currentComplexity + 1;
    }
    if (line.includes('&&') || line.includes('||')) {
      return currentComplexity + 1;
    }
    return currentComplexity;
  }

  private analyzeLine(line: string, lineNumber: number): Issue[] {
    const issues: Issue[] = [];

    // Check for common issues
    if (line.includes('console.log')) {
      issues.push({
        line: lineNumber,
        severity: 'warning',
        message: 'console.log statement found',
        rule: 'no-console'
      });
    }

    if (line.includes('TODO:') || line.includes('FIXME:')) {
      issues.push({
        line: lineNumber,
        severity: 'info',
        message: 'TODO or FIXME comment found',
        rule: 'todo-comments'
      });
    }

    if (line.length > 120) {
      issues.push({
        line: lineNumber,
        severity: 'warning',
        message: 'Line exceeds 120 characters',
        rule: 'max-line-length'
      });
    }

    return issues;
  }

  private analyzeFile(filename: string): Issue[] {
    // File-specific checks can be added here
    return [];
  }
}