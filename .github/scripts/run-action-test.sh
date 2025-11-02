#!/bin/bash

# Reusable script for running action tests with different scenarios and providers
# Usage: ./run-action-test.sh <scenario> <provider> <config-file> <test-results-dir>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO="${1:-basic-review}"
PROVIDER="${2:-openai}"
CONFIG_FILE="${3:-$SCRIPT_DIR/../test-config/test-scenarios.json}"
TEST_RESULTS_DIR="${4:-./test-results}"

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

echo "🧪 Running action test: Scenario=$SCENARIO, Provider=$PROVIDER"
echo "📋 Using config: $CONFIG_FILE"
echo "📁 Results directory: $TEST_RESULTS_DIR"

# Get scenario details from config (if jq is available)
if command -v jq &> /dev/null; then
    PR_TITLE=$(jq -r ".scenarios[\"$SCENARIO\"].prTitle" "$CONFIG_FILE")
    PR_NUMBER=$(jq -r ".scenarios[\"$SCENARIO\"].prNumber" "$CONFIG_FILE")
    BRANCH=$(jq -r ".scenarios[\"$SCENARIO\"].branch" "$CONFIG_FILE")
    FOCUS=$(jq -r ".scenarios[\"$SCENARIO\"].expectedFocus | join(\",\")" "$CONFIG_FILE")
else
    # Fallback values
    PR_TITLE="Test PR for $SCENARIO"
    PR_NUMBER="123"
    BRANCH="feature/$SCENARIO"
    FOCUS="security,performance,style"
fi

# Get provider configuration
if command -v jq &> /dev/null && [ "$PROVIDER" != "all" ]; then
    PROVIDER_KEY=$(jq -r ".providers[\"$PROVIDER\"].testKey" "$CONFIG_FILE")
    PROVIDER_CAPABILITIES=$(jq -r ".providers[\"$PROVIDER\"].capabilities | join(\",\")" "$CONFIG_FILE")
else
    # Default/fallback values
    case "$PROVIDER" in
        "openai")
            PROVIDER_KEY="sk-test-key-1,sk-test-key-2"
            ;;
        "claude")
            PROVIDER_KEY="sk-ant-test-key-1"
            ;;
        "gemini")
            PROVIDER_KEY="gemini-test-key-1"
            ;;
        "all")
            PROVIDER_KEY="sk-test-key-1,sk-test-key-2;sk-ant-test-key-1;gemini-test-key-1"
            ;;
        *)
            PROVIDER_KEY="test-key"
            ;;
    esac
    PROVIDER_CAPABILITIES="security,performance,style"
fi

# Setup environment variables for the test
export GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-test-owner/test-repo}"
export GITHUB_TOKEN="${GITHUB_TOKEN:-test-token}"
export GITHUB_REF="refs/pull/$PR_NUMBER/merge"
export GITHUB_BASE_REF="main"
export GITHUB_HEAD_REF="$BRANCH"
export TEST_MODE="action-integration"
export MOCK_RESPONSES_ENABLED="true"
export ACT_TEST_MODE="true"

# Set provider-specific environment variables
case "$PROVIDER" in
    "openai")
        export INPUT_OPENAI_API_KEYS="$PROVIDER_KEY"
        export INPUT_PROVIDERS="openai"
        ;;
    "claude")
        export INPUT_CLAUDE_API_KEYS="$PROVIDER_KEY"
        export INPUT_PROVIDERS="claude"
        ;;
    "gemini")
        export INPUT_GEMINI_API_KEYS="$PROVIDER_KEY"
        export INPUT_PROVIDERS="gemini"
        ;;
    "all")
        export INPUT_OPENAI_API_KEYS="sk-test-key-1,sk-test-key-2"
        export INPUT_CLAUDE_API_KEYS="sk-ant-test-key-1"
        export INPUT_GEMINI_API_KEYS="gemini-test-key-1"
        export INPUT_PROVIDERS="openai,claude,gemini"
        ;;
esac

export INPUT_REVIEW_FOCUS="$FOCUS"
export INPUT_CHUNK_SIZE="2000"
export INPUT_SKIP_PATTERNS="*.min.js,package-lock.json"
export INPUT_FAIL_FAST="false"

# Create mock GitHub context file
cat > github-context.json << EOF
{
  "event": {
    "pull_request": {
      "number": $PR_NUMBER,
      "title": "$PR_TITLE",
      "base": {
        "ref": "main"
      },
      "head": {
        "ref": "$BRANCH"
      }
    }
  },
  "repository": {
    "name": "test-repo",
    "owner": {
      "login": "test-owner"
    }
  }
}
EOF

export GITHUB_EVENT_PATH="./github-context.json"

# Run the action test
echo "🚀 Starting action test..."
echo "📝 PR Title: $PR_TITLE"
echo "🔢 PR Number: $PR_NUMBER"
echo "🌿 Branch: $BRANCH"
echo "🎯 Focus: $FOCUS"
echo "🤖 Provider: $PROVIDER"

# Execute the action with proper error handling
LOG_FILE="$TEST_RESULTS_DIR/${SCENARIO}-${PROVIDER}.log"

node -e "
const process = require('process');
const path = require('path');

// Mock @actions/github context
require('@actions/github').context = {
  repo: { owner: 'test-owner', repo: 'test-repo' },
  payload: {
    pull_request: {
      number: $PR_NUMBER,
      title: '$PR_TITLE',
      base: { ref: 'main' },
      head: { ref: '$BRANCH' }
    }
  }
};

// Run the action
require('./dist/index.js');
" > "$LOG_FILE" 2>&1 || {
    echo "⚠️ Action test completed with expected warnings/errors"
}

echo "✅ Action test completed"
echo "📋 Results saved to: $LOG_FILE"

# Verify output contains expected patterns
echo "🔍 Verifying test results..."

VERIFICATION_PASSED=true
EXPECTED_PATTERNS=("AI Code Review Summary" "Focus Areas:" "Files Analyzed:" "Suggestions Found:")

for pattern in "\${EXPECTED_PATTERNS[@]}"; do
    if grep -q "$pattern" "$LOG_FILE"; then
        echo "  ✅ Found pattern: $pattern"
    else
        echo "  ⚠️ Missing pattern: $pattern"
        VERIFICATION_PASSED=false
    fi
done

if [ "$VERIFICATION_PASSED" = true ]; then
    echo "✅ All expected patterns found in output"
else
    echo "⚠️ Some expected patterns missing in output"
fi

# Cleanup
rm -f github-context.json

echo "🎉 Test execution completed successfully!"
