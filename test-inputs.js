#!/usr/bin/env node

const core = require('@actions/core');

console.log('Testing @actions/core.getInput() behavior...\n');

// Test 1: Without any environment variables
console.log('=== Test 1: Without any environment variables ===');
try {
  const token1 = core.getInput('github-token', { required: true });
  console.log('✅ Got token:', !!token1);
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 2: With INPUT_ prefix but wrong casing
console.log('\n=== Test 2: With INPUT_github-token (wrong casing) ===');
process.env['INPUT_github-token'] = 'test-token-123';
try {
  const token2 = core.getInput('github-token', { required: true });
  console.log('✅ Got token:', !!token2, 'Length:', token2.length);
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 3: Clear and test with correct casing (uppercase + dash)
console.log('\n=== Test 3: With INPUT_GITHUB-TOKEN (correct casing) ===');
delete process.env['INPUT_github-token'];
process.env['INPUT_GITHUB-TOKEN'] = 'test-token-456';
try {
  const token3 = core.getInput('github-token', { required: true });
  console.log('✅ Got token:', !!token3, 'Length:', token3.length);
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 4: Test providers input with correct casing
console.log('\n=== Test 4: Test providers input ===');
process.env['INPUT_PROVIDERS'] = 'openai,claude';
try {
  const providers = core.getInput('providers', { required: true });
  console.log('✅ Got providers:', providers);
} catch (error) {
  console.log('❌ Error:', error.message);
}

// Test 5: Test optional inputs
console.log('\n=== Test 5: Test optional inputs ===');
process.env['INPUT_CHUNK-SIZE'] = '3000';
const chunkSize = core.getInput('chunk-size', { required: false }) || '2000';
console.log('✅ Got chunk size:', chunkSize);

process.env['INPUT_REVIEW-FOCUS'] = 'security,performance';
const reviewFocus = core.getInput('review-focus', { required: false }) || 'security,performance,style';
console.log('✅ Got review focus:', reviewFocus);

// Test 6: Show all environment variables that start with INPUT_
console.log('\n=== Test 6: All INPUT_ environment variables ===');
Object.keys(process.env)
  .filter(key => key.startsWith('INPUT_'))
  .forEach(key => {
    console.log(`${key} = ${process.env[key]}`);
  });

console.log('\n=== Summary ===');
console.log('GitHub Actions inputs are passed as environment variables with INPUT_ prefix.');
console.log('The input name "github-token" becomes "INPUT_GITHUB-TOKEN" (UPPERCASE + dash preserved).');
console.log('Key transformation: INPUT_ + name.replace(/ /g, "_").toUpperCase()');