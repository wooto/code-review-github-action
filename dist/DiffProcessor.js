"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffProcessor = void 0;
const version_safe_utils_1 = require("./version-safe-utils");
class DiffProcessor {
    constructor() {
        this.versionSafeUtils = new version_safe_utils_1.VersionSafeUtils();
    }
    processDiff(patch, filename) {
        const startTime = this.versionSafeUtils.now();
        const issues = [];
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
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
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
    analyzeComplexity(line, currentComplexity) {
        // Simple complexity analysis
        if (line.includes('if') || line.includes('for') || line.includes('while')) {
            return currentComplexity + 1;
        }
        if (line.includes('&&') || line.includes('||')) {
            return currentComplexity + 1;
        }
        return currentComplexity;
    }
    analyzeLine(line, lineNumber) {
        const issues = [];
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
        if (line.trim().length > 120) {
            issues.push({
                line: lineNumber,
                severity: 'warning',
                message: 'Line exceeds 120 characters',
                rule: 'max-line-length'
            });
        }
        return issues;
    }
    analyzeFile(filename) {
        const issues = [];
        // File-specific checks
        if (filename.includes('test') && !filename.includes('.spec.') && !filename.includes('.test.')) {
            issues.push({
                line: 0,
                severity: 'info',
                message: 'Test file should follow naming convention (.test. or .spec.)',
                rule: 'test-file-naming'
            });
        }
        return issues;
    }
}
exports.DiffProcessor = DiffProcessor;
//# sourceMappingURL=DiffProcessor.js.map