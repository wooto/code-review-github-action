#!/usr/bin/env node

/**
 * Test Performance Trend Analysis
 * Analyzes test performance and coverage trends over time
 */

const fs = require('fs');
const path = require('path');

function analyzeTestTrends() {
  console.log('📈 Analyzing test performance trends...');

  try {
    const reportsDir = path.join(process.cwd(), 'test-results');
    const trendsDir = path.join(reportsDir, 'trends');

    // Create trends directory
    if (!fs.existsSync(trendsDir)) {
      fs.mkdirSync(trendsDir, { recursive: true });
    }

    // Load current test data
    const currentData = loadCurrentTestData();

    // Load historical data
    const historicalData = loadHistoricalData(trendsDir);

    // Add current data to history
    historicalData.push(currentData);

    // Keep only last 30 runs
    if (historicalData.length > 30) {
      historicalData.splice(0, historicalData.length - 30);
    }

    // Save updated historical data
    saveHistoricalData(trendsDir, historicalData);

    // Generate trend analysis
    const trendAnalysis = generateTrendAnalysis(historicalData);

    // Save trend analysis
    saveTrendAnalysis(trendsDir, trendAnalysis);

    // Generate HTML trend report
    generateTrendHTMLReport(trendsDir, trendAnalysis);

    console.log('✅ Test trend analysis completed');
    console.log(`📁 Trend reports available in: ${trendsDir}`);

  } catch (error) {
    console.error('❌ Error analyzing test trends:', error.message);
  }
}

function loadCurrentTestData() {
  const reportsDir = path.join(process.cwd(), 'test-results');
  const currentData = {
    timestamp: new Date().toISOString(),
    runId: process.env.GITHUB_RUN_ID || 'local-' + Date.now(),
    branch: process.env.GITHUB_REF_NAME || 'main',
    commit: process.env.GITHUB_SHA || 'local',
  };

  // Load coverage data
  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
    if (fs.existsSync(coveragePath)) {
      const { calculateCoverageMetrics } = require('./generate-coverage-report');
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      currentData.coverage = calculateCoverageMetrics(coverageData);
    }
  } catch (error) {
    console.warn('⚠️ Could not load coverage data:', error.message);
  }

  // Load performance data
  try {
    const perfPath = path.join(reportsDir, 'test-performance.json');
    if (fs.existsSync(perfPath)) {
      currentData.performance = JSON.parse(fs.readFileSync(perfPath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️ Could not load performance data:', error.message);
  }

  return currentData;
}

function loadHistoricalData(trendsDir) {
  try {
    const historyPath = path.join(trendsDir, 'test-history.json');
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️ Could not load historical data:', error.message);
  }

  return [];
}

function saveHistoricalData(trendsDir, historicalData) {
  const historyPath = path.join(trendsDir, 'test-history.json');
  fs.writeFileSync(historyPath, JSON.stringify(historicalData, null, 2));
}

function generateTrendAnalysis(historicalData) {
  if (historicalData.length < 2) {
    return {
      summary: 'Insufficient data for trend analysis',
      trends: {},
      recommendations: []
    };
  }

  const analysis = {
    summary: '',
    trends: {},
    recommendations: [],
    dataPoints: historicalData.length
  };

  // Coverage trends
  const coverageData = historicalData.filter(d => d.coverage);
  if (coverageData.length >= 2) {
    const coverageTrend = calculateTrend(coverageData.map(d => d.coverage.overall.coverage));
    analysis.trends.coverage = {
      current: coverageData[coverageData.length - 1].coverage.overall.coverage,
      previous: coverageData[coverageData.length - 2].coverage.overall.coverage,
      trend: coverageTrend,
      direction: coverageTrend > 0 ? 'improving' : coverageTrend < 0 ? 'declining' : 'stable'
    };
  }

  // Performance trends
  const perfData = historicalData.filter(d => d.performance);
  if (perfData.length >= 2) {
    const durationTrend = calculateTrend(perfData.map(d => d.performance.totalDuration));
    analysis.trends.performance = {
      current: perfData[perfData.length - 1].performance.totalDuration,
      previous: perfData[perfData.length - 2].performance.totalDuration,
      trend: durationTrend,
      direction: durationTrend < 0 ? 'improving' : durationTrend > 0 ? 'declining' : 'stable'
    };

    if (perfData[perfData.length - 1].performance.summary) {
      analysis.trends.testCount = {
        current: perfData[perfData.length - 1].performance.summary.totalTests,
        previous: perfData[perfData.length - 2].performance.summary.totalTests,
        trend: perfData[perfData.length - 1].performance.summary.totalTests - perfData[perfData.length - 2].performance.summary.totalTests
      };
    }
  }

  // Generate summary and recommendations
  analysis.summary = generateSummary(analysis.trends);
  analysis.recommendations = generateRecommendations(analysis.trends);

  return analysis;
}

function calculateTrend(values) {
  if (values.length < 2) return 0;

  // Simple linear regression to calculate trend
  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // Sum of 0,1,2,...n-1
  const sumY = values.reduce((sum, val) => sum + val, 0);
  const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of 0,1,2,...n-1

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

function generateSummary(trends) {
  const summaries = [];

  if (trends.coverage) {
    const coverageDir = trends.coverage.direction;
    summaries.push(`Coverage is ${coverageDir} (${trends.coverage.current.toFixed(1)}%)`);
  }

  if (trends.performance) {
    const perfDir = trends.performance.direction;
    const currentSec = (trends.performance.current / 1000).toFixed(1);
    summaries.push(`Test performance is ${perfDir} (${currentSec}s total duration)`);
  }

  if (trends.testCount) {
    const testChange = trends.testCount.trend;
    const testWord = testChange > 0 ? 'increased' : testChange < 0 ? 'decreased' : 'unchanged';
    summaries.push(`Test count has ${testWord} (${trends.testCount.current} tests)`);
  }

  return summaries.join('. ') || 'No significant trends detected.';
}

function generateRecommendations(trends) {
  const recommendations = [];

  if (trends.coverage && trends.coverage.direction === 'declining') {
    recommendations.push('🔍 Consider adding more tests to improve coverage');
  }

  if (trends.performance && trends.performance.direction === 'declining') {
    recommendations.push('⚡ Test performance is declining - consider test optimization');
  }

  if (trends.coverage && trends.coverage.current < 80) {
    recommendations.push('📊 Coverage is below 80% - aim for higher test coverage');
  }

  if (trends.performance && trends.performance.current > 60000) {
    recommendations.push('🐌 Tests are taking over 1 minute - consider parallelization or test optimization');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Test suite is performing well - keep up the good work!');
  }

  return recommendations;
}

function saveTrendAnalysis(trendsDir, analysis) {
  const analysisPath = path.join(trendsDir, 'trend-analysis.json');
  fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
}

function generateTrendHTMLReport(trendsDir, analysis) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Performance Trends</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .trends { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .trend-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .trend-card.improving { border-left-color: #28a745; }
        .trend-card.declining { border-left-color: #dc3545; }
        .trend-card.stable { border-left-color: #ffc107; }
        .chart-container { position: relative; height: 400px; margin-bottom: 30px; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .recommendations h3 { margin-top: 0; color: #007bff; }
        .timestamp { text-align: center; color: #666; margin-top: 30px; font-size: 0.9em; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .metric-value { font-weight: bold; font-size: 1.2em; }
        .trend-indicator { font-size: 0.9em; padding: 2px 8px; border-radius: 12px; }
        .trend-up { background: #d4edda; color: #155724; }
        .trend-down { background: #f8d7da; color: #721c24; }
        .trend-stable { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📈 Test Performance Trends</h1>
            <p>Historical analysis of test suite performance and coverage</p>
        </div>

        <div class="summary">
            <h2>📊 Summary</h2>
            <p>${analysis.summary}</p>
            <p><strong>Data Points:</strong> ${analysis.dataPoints} test runs analyzed</p>
        </div>

        <div class="trends">
            ${Object.entries(analysis.trends).map(([key, trend]) => `
                <div class="trend-card ${trend.direction}">
                    <h3>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</h3>
                    <div class="metric">
                        <span>Current:</span>
                        <span class="metric-value">${formatMetricValue(key, trend.current)}</span>
                    </div>
                    <div class="metric">
                        <span>Previous:</span>
                        <span>${formatMetricValue(key, trend.previous)}</span>
                    </div>
                    <div class="metric">
                        <span>Trend:</span>
                        <span class="trend-indicator trend-${trend.direction}">${trend.direction}</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="chart-container">
            <canvas id="trendsChart"></canvas>
        </div>

        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="timestamp">
            Report generated on ${new Date().toLocaleString()}
        </div>
    </div>

    <script>
        // Sample chart data - would be populated with actual historical data
        const ctx = document.getElementById('trendsChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [], // Would be populated with actual timestamps
                datasets: [
                    {
                        label: 'Coverage (%)',
                        data: [], // Would be populated with actual coverage data
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.1
                    },
                    {
                        label: 'Duration (s)',
                        data: [], // Would be populated with actual performance data
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Coverage (%)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Duration (s)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  const reportPath = path.join(trendsDir, 'trend-report.html');
  fs.writeFileSync(reportPath, html);
  console.log('📄 HTML trend report generated');
}

function formatMetricValue(type, value) {
  switch (type) {
    case 'coverage':
      return `${value.toFixed(1)}%`;
    case 'performance':
      return `${(value / 1000).toFixed(1)}s`;
    case 'testCount':
      return value.toString();
    default:
      return value.toString();
  }
}

if (require.main === module) {
  analyzeTestTrends();
}

module.exports = { analyzeTestTrends, generateTrendAnalysis };
