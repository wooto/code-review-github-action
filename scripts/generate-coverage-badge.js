#!/usr/bin/env node

/**
 * Generate coverage badge SVG
 * Creates a visual badge showing current coverage percentage
 */

const fs = require('fs');
const path = require('path');

function generateCoverageBadge() {
  console.log('🏷️ Generating coverage badge...');

  try {
    // Read coverage data
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');

    if (!fs.existsSync(coveragePath)) {
      console.error('❌ Coverage data not found. Run tests with coverage first.');
      process.exit(1);
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const { calculateCoverageMetrics } = require('./generate-coverage-report');
    const metrics = calculateCoverageMetrics(coverageData);

    const coveragePercentage = Math.round(metrics.overall.coverage);
    const badge = createBadgeSVG(coveragePercentage);

    const reportsDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(reportsDir, 'coverage-badge.svg'), badge);

    // Also save to docs directory for README inclusion
    const docsDir = path.join(process.cwd(), 'docs', 'images');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, 'coverage-badge.svg'), badge);

    console.log(`✅ Coverage badge generated! ${coveragePercentage}% coverage`);
    console.log(`📁 Badge saved to: test-results/coverage-badge.svg`);

  } catch (error) {
    console.error('❌ Error generating coverage badge:', error.message);
    process.exit(1);
  }
}

function createBadgeSVG(coverage) {
  const width = 120 + coverage.toString().length * 8;
  const color = getCoverageColor(coverage);
  const label = 'coverage';
  const message = `${coverage}%`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img">
  <title>coverage: ${coverage}%</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${width}" height="20" fill="#555"/>
    <rect width="${width}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="35" y="150" fill="#010101" transform="scale(.1)" textLength="50" lengthAdjust="spacing">${label}</text>
    <text x="35" y="11" fill="#fff" transform="scale(.1)" textLength="50" lengthAdjust="spacing">${label}</text>
    <text aria-hidden="true" x="${width - 45}" y="150" fill="#010101" transform="scale(.1)" textLength="${message.length * 8}">${message}</text>
    <text x="${width - 45}" y="11" fill="#fff" transform="scale(.1)" textLength="${message.length * 8}">${message}</text>
  </g>
</svg>`;
}

function getCoverageColor(percentage) {
  if (percentage >= 90) return '#28a745';  // Green
  if (percentage >= 80) return '#ffc107';  // Yellow
  if (percentage >= 70) return '#fb8500';  // Orange
  return '#dc3545';  // Red
}

function generateCoverageTrend() {
  // This could be extended to show coverage trends over time
  console.log('📈 Coverage trend analysis not yet implemented');
}

if (require.main === module) {
  generateCoverageBadge();
}

module.exports = { generateCoverageBadge, createBadgeSVG };