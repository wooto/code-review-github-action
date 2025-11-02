export interface ReviewContext {
  prNumber: number;
  repository: string;
  branch: string;
  files: string[];
}

export interface ReviewSuggestion {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

export interface ReviewResult {
  summary: string;
  suggestions: ReviewSuggestion[];
  confidence: number;
}

export interface IProvider {
  name: string;
  analyzeCode(diff: string, context: ReviewContext): Promise<ReviewResult>;
}