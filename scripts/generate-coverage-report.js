#!/usr/bin/env node

/**
 * Generate comprehensive coverage report
 * Creates detailed coverage analysis with trends and metrics
 */

const fs = require('fs');
const path = require('path');

function generateCoverageReport() {
  console.log('📊 Generating comprehensive coverage report...');

  try {
    // Read coverage data
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');

    if (!fs.existsSync(coveragePath)) {
      console.error('❌ Coverage data not found. Run tests with coverage first.');
      process.exit(1);
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

    // Calculate overall metrics
    const metrics = calculateCoverageMetrics(coverageData);

    // Generate HTML report
    generateHTMLReport(metrics);

    // Generate JSON report for API consumption
    generateJSONReport(metrics);

    // Generate summary for GitHub
    generateGitHubSummary(metrics);

    console.log('✅ Coverage report generated successfully!');
    console.log(`📁 Reports available in: test-results/`);

  } catch (error) {
    console.error('❌ Error generating coverage report:', error.message);
    process.exit(1);
  }
}

function calculateCoverageMetrics(coverageData) {
  const files = Object.keys(coverageData);
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalLines = 0;
  let coveredLines = 0;

  const fileMetrics = {};

  files.forEach(filePath => {
    const fileData = coverageData[filePath];
    const fileName = path.relative(process.cwd(), filePath);

    // Statement coverage
    const statements = Object.values(fileData.s || {});
    totalStatements += statements.length;
    coveredStatements += statements.filter(s => s > 0).length;

    // Branch coverage
    const branches = Object.values(fileData.b || {});
    branches.forEach(branch => {
      totalBranches += branch.length;
      coveredBranches += branch.filter(b => b > 0).length;
    });

    // Function coverage
    const functions = Object.values(fileData.f || {});
    totalFunctions += functions.length;
    coveredFunctions += functions.filter(f => f > 0).length;

    // Line coverage
    const lines = Object.values(fileData.l || {});
    totalLines += lines.length;
    coveredLines += lines.filter(l => l > 0).length;

    // File-specific metrics
    fileMetrics[fileName] = {
      statements: {
        total: statements.length,
        covered: statements.filter(s => s > 0).length,
        percentage: statements.length > 0 ? (statements.filter(s => s > 0).length / statements.length * 100) : 100
      },
      branches: {
        total: branches.reduce((acc, branch) => acc + branch.length, 0),
        covered: branches.reduce((acc, branch) => acc + branch.filter(b => b > 0).length, 0),
        percentage: branches.reduce((acc, branch) => acc + branch.length, 0) > 0
          ? (branches.reduce((acc, branch) => acc + branch.filter(b => b > 0).length, 0) / branches.reduce((acc, branch) => acc + branch.length, 0) * 100)
          : 100
      },
      functions: {
        total: functions.length,
        covered: functions.filter(f => f > 0).length,
        percentage: functions.length > 0 ? (functions.filter(f => f > 0).length / functions.length * 100) : 100
      },
      lines: {
        total: lines.length,
        covered: lines.filter(l => l > 0).length,
        percentage: lines.length > 0 ? (lines.filter(l => l > 0).length / lines.length * 100) : 100
      }
    };
  });

  // Calculate overall percentages
  const overallMetrics = {
    statements: {
      total: totalStatements,
      covered: coveredStatements,
      percentage: totalStatements > 0 ? (coveredStatements / totalStatements * 100) : 100
    },
    branches: {
      total: totalBranches,
      covered: coveredBranches,
      percentage: totalBranches > 0 ? (coveredBranches / totalBranches * 100) : 100
    },
    functions: {
      total: totalFunctions,
      covered: coveredFunctions,
      percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100) : 100
    },
    lines: {
      total: totalLines,
      covered: coveredLines,
      percentage: totalLines > 0 ? (coveredLines / totalLines * 100) : 100
    }
  };

  // Calculate overall coverage
  const overallCoverage = (
    overallMetrics.statements.percentage +
    overallMetrics.branches.percentage +
    overallMetrics.functions.percentage +
    overallMetrics.lines.percentage
  ) / 4;

  return {
    timestamp: new Date().toISOString(),
    overall: {
      coverage: Math.round(overallCoverage * 100) / 100,
      ...overallMetrics
    },
    files: fileMetrics,
    summary: {
      totalFiles: files.length,
      filesWith100Coverage: Object.values(fileMetrics).filter(f => f.lines.percentage === 100).length,
      filesWithLowCoverage: Object.values(fileMetrics).filter(f => f.lines.percentage < 80).length,
      averageFileCoverage: Object.values(fileMetrics).reduce((acc, f) => acc + f.lines.percentage, 0) / files.length
    }
  };
}

function generateHTMLReport(metrics) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric .label { color: #666; font-size: 0.9em; }
        .coverage-excellent { border-left-color: #28a745; }
        .coverage-excellent .value { color: #28a745; }
        .coverage-good { border-left-color: #ffc107; }
        .coverage-good .value { color: #ffc107; }
        .coverage-poor { border-left-color: #dc3545; }
        .coverage-poor .value { color: #dc3545; }
        .files-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .files-table th, .files-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .files-table th { background: #f8f9fa; font-weight: 600; }
        .files-table tr:hover { background: #f8f9fa; }
        .coverage-bar { width: 100px; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; transition: width 0.3s ease; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Code Coverage Report</h1>
            <p>Comprehensive test coverage analysis for Code Review Action</p>
        </div>

        <div class="metrics">
            <div class="metric ${getCoverageClass(metrics.overall.coverage)}">
                <h3>Overall Coverage</h3>
                <div class="value">${metrics.overall.coverage}%</div>
                <div class="label">Total Test Coverage</div>
            </div>
            <div class="metric">
                <h3>Statements</h3>
                <div class="value">${metrics.overall.statements.percentage}%</div>
                <div class="label">${metrics.overall.statements.covered}/${metrics.overall.statements.total}</div>
            </div>
            <div class="metric">
                <h3>Branches</h3>
                <div class="value">${metrics.overall.branches.percentage}%</div>
                <div class="label">${metrics.overall.branches.covered}/${metrics.overall.branches.total}</div>
            </div>
            <div class="metric">
                <h3>Functions</h3>
                <div class="value">${metrics.overall.functions.percentage}%</div>
                <div class="label">${metrics.overall.functions.covered}/${metrics.overall.functions.total}</div>
            </div>
        </div>

        <div class="summary">
            <h2>📊 Summary</h2>
            <ul>
                <li><strong>Total Files:</strong> ${metrics.summary.totalFiles}</li>
                <li><strong>Files with 100% Coverage:</strong> ${metrics.summary.filesWith100Coverage}</li>
                <li><strong>Files with Low Coverage (&lt;80%):</strong> ${metrics.summary.filesWithLowCoverage}</li>
                <li><strong>Average File Coverage:</strong> ${Math.round(metrics.summary.averageFileCoverage * 100) / 100}%</li>
            </ul>
        </div>

        <div class="files-section">
            <h2>📁 File Coverage Details</h2>
            <table class="files-table">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Statements</th>
                        <th>Branches</th>
                        <th>Functions</th>
                        <th>Lines</th>
                        <th>Coverage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(metrics.files).map(([file, fileMetrics]) => `
                        <tr>
                            <td>${file}</td>
                            <td>${fileMetrics.statements.percentage}%</td>
                            <td>${fileMetrics.branches.percentage}%</td>
                            <td>${fileMetrics.functions.percentage}%</td>
                            <td>${fileMetrics.lines.percentage}%</td>
                            <td>
                                <div class="coverage-bar">
                                    <div class="coverage-fill ${getCoverageClass(fileMetrics.lines.percentage)}"
                                         style="width: ${fileMetrics.lines.percentage}%; background: ${getCoverageColor(fileMetrics.lines.percentage)}"></div>
                                </div>
                                ${Math.round(fileMetrics.lines.percentage * 100) / 100}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="timestamp">
            Report generated on ${new Date(metrics.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>`;

  const reportsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(reportsDir, 'coverage-report.html'), html);
  console.log('📄 HTML coverage report generated');
}

function generateJSONReport(metrics) {
  const reportsDir = path.join(process.cwd(), 'test-results');
  fs.writeFileSync(path.join(reportsDir, 'coverage-metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('📄 JSON coverage report generated');
}

function generateGitHubSummary(metrics) {
  const summary = `## 📊 Test Coverage Report

### 🎯 Overall Coverage: **${metrics.overall.coverage}%**

| Metric | Coverage | Details |
|--------|----------|---------|
| Statements | ${metrics.overall.statements.percentage}% | ${metrics.overall.statements.covered}/${metrics.overall.statements.total} |
| Branches | ${metrics.overall.branches.percentage}% | ${metrics.overall.branches.covered}/${metrics.overall.branches.total} |
| Functions | ${metrics.overall.functions.percentage}% | ${metrics.overall.functions.covered}/${metrics.overall.functions.total} |
| Lines | ${metrics.overall.lines.percentage}% | ${metrics.overall.lines.covered}/${metrics.overall.lines.total} |

### 📈 Summary Statistics
- **Total Files**: ${metrics.summary.totalFiles}
- **Files with 100% Coverage**: ${metrics.summary.filesWith100Coverage}
- **Files with Low Coverage (<80%)**: ${metrics.summary.filesWithLowCoverage}
- **Average File Coverage**: ${Math.round(metrics.summary.averageFileCoverage * 100) / 100}%

### 📁 File Coverage Details
${Object.entries(metrics.files).map(([file, fileMetrics]) =>
  `| \`${file}\` | ${fileMetrics.lines.percentage}% | ${fileMetrics.statements.percentage}% statements, ${fileMetrics.branches.percentage}% branches, ${fileMetrics.functions.percentage}% functions |`
).join('\n')}

### 🏆 Coverage Status
${getCoverageStatus(metrics.overall.coverage)}

*Report generated on ${new Date(metrics.timestamp).toLocaleString()}*`;

  const reportsDir = path.join(process.cwd(), 'test-results');
  fs.writeFileSync(path.join(reportsDir, 'coverage-summary.md'), summary);
  console.log('📄 GitHub summary report generated');
}

function getCoverageClass(percentage) {
  if (percentage >= 90) return 'coverage-excellent';
  if (percentage >= 80) return 'coverage-good';
  return 'coverage-poor';
}

function getCoverageColor(percentage) {
  if (percentage >= 90) return '#28a745';
  if (percentage >= 80) return '#ffc107';
  return '#dc3545';
}

function getCoverageStatus(percentage) {
  if (percentage >= 90) return '🟢 **Excellent Coverage** - Test suite is well maintained!';
  if (percentage >= 80) return '🟡 **Good Coverage** - Room for improvement.';
  return '🔴 **Needs Improvement** - Consider adding more tests.';
}

if (require.main === module) {
  generateCoverageReport();
}

module.exports = { generateCoverageReport, calculateCoverageMetrics };
