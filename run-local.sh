#!/bin/bash

# Local development script for Code Review GitHub Action
# This script simulates the GitHub Actions environment locally

set -e

echo "🚀 Setting up local GitHub Actions environment for Code Review Action"
echo "=================================================================="
echo ""

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ dist/index.js not found. Building the action first..."
    npm run build
    echo ""
fi

# Set up GitHub Actions environment variables
echo "🔧 Setting up GitHub Actions environment variables..."

# Required inputs
export INPUT_GITHUB-TOKEN="ghp_fake_token_for_local_testing"
export INPUT_PROVIDERS="openai,claude,gemini"

# Optional inputs (with defaults from action.yml)
export INPUT_CHUNK-SIZE="2000"
export INPUT_REVIEW-FOCUS="security,performance,style"
export INPUT_SKIP-PATTERNS=""

# Mock GitHub context environment variables
export GITHUB_REPOSITORY="test-owner/test-repo"
export GITHUB_SHA="fake-sha-1234567890abcdef"
export GITHUB_REF="refs/pull/123/head"
export GITHUB_HEAD_REF="feature-branch"
export GITHUB_BASE_REF="main"

# Create a minimal GitHub context payload
mkdir -p .github
cat > .github/context.json << EOF
{
  "event_name": "pull_request",
  "sha": "fake-sha-1234567890abcdef",
  "ref": "refs/pull/123/head",
  "repository": {
    "owner": {
      "login": "test-owner"
    },
    "name": "test-repo"
  },
  "payload": {
    "pull_request": {
      "number": 123,
      "title": "Test PR for local development",
      "head": {
        "ref": "feature-branch"
      },
      "base": {
        "ref": "main"
      }
    }
  }
}
EOF

export GITHUB_CONTEXT_PATH="$(pwd)/.github/context.json"

echo "✅ Environment variables set:"
echo "   INPUT_GITHUB-TOKEN=${INPUT_GITHUB-TOKEN}"
echo "   INPUT_PROVIDERS=${INPUT_PROVIDERS}"
echo "   INPUT_CHUNK-SIZE=${INPUT_CHUNK-SIZE}"
echo "   INPUT_REVIEW-FOCUS=${INPUT_REVIEW-FOCUS}"
echo "   GITHUB_REPOSITORY=${GITHUB_REPOSITORY}"
echo "   GITHUB_CONTEXT_PATH=${GITHUB_CONTEXT_PATH}"
echo ""

echo "🧪 Running the Code Review Action locally..."
echo "=========================================="
echo ""

# Run the action
node dist/index.js

echo ""
echo "✅ Action execution completed!"
echo ""
echo "💡 Tips:"
echo "   - To test with different inputs, modify the environment variables above"
echo "   - To debug specific issues, add console.log statements to src/index.ts"
echo "   - To simulate real API responses, you may need to mock external services"
echo "   - Check the dist/index.js file for the compiled JavaScript code"