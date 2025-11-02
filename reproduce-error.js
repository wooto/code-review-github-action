#!/usr/bin/env node

/**
 * Minimal reproduction script for "Input required and not supplied: github-token" error
 *
 * This script demonstrates the exact conditions that cause the error and shows how to fix it.
 *
 * Usage:
 *   node reproduce-error.js                    # Shows the error
 *   node reproduce-error.js fix                # Shows the fix
 */

const core = require('@actions/core');

console.log('🔍 Reproducing "Input required and not supplied: github-token" error\n');

// Simulate the exact code from src/index.ts that's failing
function reproduceError() {
  try {
    console.log('🚀 Running the exact code from src/index.ts line 15:');
    console.log('   const token = core.getInput("github-token", { required: true });');

    const token = core.getInput("github-token", { required: true });
    console.log('✅ SUCCESS: Got token:', !!token, 'Length:', token.length);

  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('   This is the exact error you see in GitHub Actions!\n');
  }
}

// Show how to fix it
function showFix() {
  console.log('🔧 FIX: Set the correct environment variable that GitHub Actions would set:\n');

  // This is what GitHub Actions does when you pass github-token: ${{ secrets.GITHUB_TOKEN }}
  process.env['INPUT_GITHUB-TOKEN'] = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  console.log('   export INPUT_GITHUB-TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"');
  console.log('   # Note: INPUT_ + GITHUB-TOKEN (uppercase, dash preserved)\n');

  console.log('🚀 Running the same code with the environment variable set:');

  try {
    const token = core.getInput("github-token", { required: true });
    console.log('✅ SUCCESS: Got token:', !!token, 'Length:', token.length);
    console.log('   The error is now fixed!\n');
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

function showAllRequiredInputs() {
  console.log('📋 All required inputs and their environment variable names:\n');

  const requiredInputs = [
    { name: 'github-token', envVar: 'INPUT_GITHUB-TOKEN' },
    { name: 'providers', envVar: 'INPUT_PROVIDERS' }
  ];

  requiredInputs.forEach(input => {
    const envValue = process.env[input.envVar] || '(not set)';
    console.log(`   Input: ${input.name}`);
    console.log(`   Env Var: ${input.envVar}`);
    console.log(`   Value: ${envValue}\n`);
  });
}

function showTransformation() {
  console.log('🔄 Input name to environment variable transformation:\n');
  console.log('   GitHub Actions converts input names using this rule:');
  console.log('   INPUT_ + name.replace(/ /g, "_").toUpperCase()');
  console.log('');
  console.log('   Examples:');
  console.log('   "github-token"  → "INPUT_GITHUB-TOKEN"');
  console.log('   "providers"     → "INPUT_PROVIDERS"');
  console.log('   "chunk-size"    → "INPUT_CHUNK-SIZE"');
  console.log('   "review focus"  → "INPUT_REVIEW_FOCUS"');
  console.log('');
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('fix')) {
  showFix();
  showAllRequiredInputs();
} else if (args.includes('transformation')) {
  showTransformation();
} else {
  reproduceError();
  showTransformation();
  console.log('💡 To see the fix, run: node reproduce-error.js fix');
}