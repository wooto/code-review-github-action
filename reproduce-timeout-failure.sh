#!/bin/bash
# Minimal reproduction case for test timeout issues
# This simulates the CI test timeout problems

echo "=== Reproducing Test Timeout Failures ==="
echo

echo "1. Testing with different Node.js versions..."
echo "Current local Node.js version:"
node --version
echo

echo "2. Running tests with CI-equivalent timeout (30 seconds)..."
echo "Command: npm run test:ci"
echo "Timeout: 30 seconds per test"
echo

# Run the test command that CI uses, but with explicit timeout handling
start_time=$(date +%s)
timeout 30s npm run test:ci 2>&1 | tee test-timeout-output.log
test_exit_code=$?
end_time=$(date +%s)
duration=$((end_time - start_time))

echo
echo "3. Test execution results:"
echo "   Exit code: $test_exit_code"
echo "   Duration: ${duration} seconds"
echo

if [ $test_exit_code -eq 124 ]; then
    echo "❌ TESTS TIMED OUT after 30 seconds (same as CI)"
elif [ $test_exit_code -ne 0 ]; then
    echo "❌ TESTS FAILED with exit code $test_exit_code"
else
    echo "✅ TESTS PASSED within timeout"
fi

echo
echo "4. Analyzing specific failing tests..."
echo

# Check for the specific integration test failures we saw
echo "   Testing integration tests individually:"
npm test -- __tests__/integration.test.ts -- --testTimeout=5000 --no-coverage 2>&1 | tee integration-test-results.log || true

echo
echo "5. Checking memory usage patterns..."
if command -v node >/dev/null 2>&1; then
    echo "   Node.js memory limits:"
    node -e "console.log('   Max old space size:', process.execArgv.find(arg => arg.includes('--max-old-space-size')) || 'default')"
    echo "   Current memory usage during tests:"
    node -e "console.log('   RSS:', Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB', 'Heap:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB')"
fi

echo
echo "6. Environment differences between local and CI:"
echo "   Local Node.js: $(node --version)"
echo "   CI Node.js: 20.x"
echo "   Local platform: $(uname -s)"
echo "   CI platform: ubuntu-latest"
echo "   Local timeout per test: 30000ms (from jest.config.js)"
echo "   CI timeout per test: 30000ms (same)"
echo "   CI overall job timeout: 20 minutes"
echo

echo "7. Specific timeout issues identified:"
echo "   - Integration tests are making actual network calls or doing heavy computation"
echo "   - Mock setup might not be working correctly, causing real API calls"
echo "   - Test setup/teardown might be slow"
echo "   - Memory leaks or inefficient test patterns"

echo
echo "8. Running a single integration test to isolate the issue:"
npm test -- __tests__/integration.test.ts -- --testNamePattern="should execute full workflow with all providers" --testTimeout=10000 --verbose 2>&1 | tee single-test-results.log || true

echo
echo "=== Test Timeout Failure Reproduction Complete ==="
echo
echo "Check these log files for detailed output:"
echo "  - test-timeout-output.log"
echo "  - integration-test-results.log"
echo "  - single-test-results.log"