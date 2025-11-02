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
export declare class DiffProcessor {
    private versionSafeUtils;
    constructor();
    processDiff(patch: string, filename: string): DiffAnalysis;
    private analyzeComplexity;
    private analyzeLine;
    private analyzeFile;
}
//# sourceMappingURL=DiffProcessor.d.ts.map