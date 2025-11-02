"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const DiffProcessor_1 = require("./DiffProcessor");
async function run() {
    try {
        const token = core.getInput('github_token', { required: true });
        const octokit = github.getOctokit(token);
        const context = github.context;
        if (!context.payload.pull_request) {
            core.setFailed('This action only works on pull requests');
            return;
        }
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: context.payload.pull_request.number,
        });
        const diffProcessor = new DiffProcessor_1.DiffProcessor();
        const results = [];
        for (const file of files) {
            if (file.patch) {
                const analysis = diffProcessor.processDiff(file.patch, file.filename || '');
                results.push({
                    file: file.filename,
                    analysis: analysis
                });
            }
        }
        // Create summary comment
        const summary = generateSummary(results);
        await octokit.rest.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.payload.pull_request.number,
            body: summary
        });
        core.info('Code review completed successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('An unexpected error occurred');
        }
    }
}
function generateSummary(results) {
    const totalFiles = results.length;
    const totalIssues = results.reduce((sum, result) => sum + result.analysis.issues.length, 0);
    let summary = `## Code Review Summary\n\n`;
    summary += `- **Files reviewed**: ${totalFiles}\n`;
    summary += `- **Issues found**: ${totalIssues}\n\n`;
    if (totalIssues > 0) {
        summary += `### Issues Found:\n\n`;
        results.forEach(result => {
            if (result.analysis.issues.length > 0) {
                summary += `#### ${result.file}\n`;
                result.analysis.issues.forEach((issue) => {
                    summary += `- ${issue.severity}: ${issue.message} (line ${issue.line})\n`;
                });
                summary += '\n';
            }
        });
    }
    else {
        summary += `✅ No issues found! Great job!\n`;
    }
    return summary;
}
if (require.main === module) {
    run();
}
//# sourceMappingURL=index.js.map