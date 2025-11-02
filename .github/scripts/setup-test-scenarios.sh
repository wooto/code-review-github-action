#!/bin/bash

# Setup test scenarios based on configuration
# Usage: ./setup-test-scenarios.sh <scenario-config-file> <test-repos-dir>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO_CONFIG_FILE="${1:-$SCRIPT_DIR/../test-config/test-scenarios.json}"
TEST_REPOS_DIR="${2:-./test-repos}"

echo "🔧 Setting up test scenarios from: $SCENARIO_CONFIG_FILE"
echo "📁 Test repositories directory: $TEST_REPOS_DIR"

# Create test directories
mkdir -p "$TEST_REPOS_DIR"
mkdir -p "$TEST_REPOS_DIR/test-repo"

# Store original directory and config path
ORIGINAL_DIR="$(pwd)"
if [[ "$SCENARIO_CONFIG_FILE" == /* ]]; then
    CONFIG_ABS_PATH="$SCENARIO_CONFIG_FILE"
else
    CONFIG_ABS_PATH="$(pwd)/$SCENARIO_CONFIG_FILE"
fi

# Initialize test repository
cd "$TEST_REPOS_DIR/test-repo"
if [ ! -d ".git" ]; then
    git init
    git config user.name "Test Bot"
    git config user.email "test@example.com"
fi

# Create directory structure first
mkdir -p src/tests

# Create initial commit
cat > README.md << 'EOF'
# Test Repository

This is a test repository for AI code review action integration testing.
EOF

cat > src/app.js << 'EOF'
console.log('Hello World');
EOF

cat > src/tests/test.js << 'EOF'
// Test file
EOF

# Add initial files
git add .
git commit -m "Initial commit" || echo "Initial commit already exists"

# Process each scenario from configuration
echo "📝 Processing test scenarios..."

if command -v jq &> /dev/null; then
    # Use jq if available for JSON parsing
    scenarios=$(jq -r '.scenarios | keys[]' "$CONFIG_ABS_PATH")

    for scenario in $scenarios; do
        echo "  Creating scenario: $scenario"

        # Get scenario details
        branch=$(jq -r ".scenarios[\"$scenario\"].branch" "$CONFIG_ABS_PATH")
        pr_title=$(jq -r ".scenarios[\"$scenario\"].prTitle" "$CONFIG_ABS_PATH")
        pr_number=$(jq -r ".scenarios[\"$scenario\"].prNumber" "$CONFIG_ABS_PATH")

        # Create and checkout branch
        git checkout -b "$branch" 2>/dev/null || git checkout "$branch"

        # Apply changes from configuration
        changes=$(jq -c ".scenarios[\"$scenario\"].changes[]?" "$CONFIG_ABS_PATH")
        for change in $changes; do
            file=$(echo "$change" | jq -r '.file')
            content=$(echo "$change" | jq -r '.content')

            # Create directory if needed
            mkdir -p "$(dirname "$file")"

            # Write file content
            echo -e "$content" >> "$file"
        done

        # Commit changes
        git add .
        git commit -m "$pr_title" || echo "No changes to commit for $scenario"

    done

    # Return to main branch
    git checkout main 2>/dev/null || git checkout master

else
    # Fallback: manually create basic scenarios
    echo "⚠️ jq not available, using fallback scenario creation"

    # Create basic scenarios manually
    git checkout -b feature/basic-review 2>/dev/null || git checkout feature/basic-review
    cat >> src/app.js << 'EOF'

function processData(data) {
    return data.map(item => item.value);
}
EOF
    git add src/app.js
    git commit -m "Add basic data processing function" || echo "No changes to commit"

    git checkout main 2>/dev/null || git checkout master
    git checkout -b feature/security-issues 2>/dev/null || git checkout feature/security-issues
    cat >> src/app.js << 'EOF'

// Security issue: eval usage
function executeCode(code) {
    return eval(code);
}

// Security issue: hardcoded password
const password = "admin123";

// Security issue: SQL injection vulnerable
function getUser(id) {
    return `SELECT * FROM users WHERE id = ${id}`;
}
EOF
    git add src/app.js
    git commit -m "Add security-sensitive code" || echo "No changes to commit"

    # Return to main branch
    git checkout main 2>/dev/null || git checkout master
fi

echo "✅ Test scenarios setup completed"
echo "📋 Available branches:"
git branch -a