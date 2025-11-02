#!/bin/bash
# Minimal reproduction case for SARIF resolution failure
# This simulates the CI workflow that tries to upload SARIF files when security scan fails

echo "=== Reproducing SARIF Resolution Failure ==="
echo

# First, let's simulate the security scan failure scenario
echo "1. Simulating security scan failure..."

# Create a fake security-scan-results.sarif file to test the upload
mkdir -p test-results
cat > test-results/security-scan-results.sarif << 'EOF'
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "security-scan",
          "version": "1.0.0"
        }
      },
      "results": [
        {
          "level": "error",
          "message": {
            "text": "Test security vulnerability found"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "src/index.ts"
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
EOF

echo "2. Created test SARIF file:"
ls -la test-results/security-scan-results.sarif

echo
echo "3. Simulating the GitHub Action upload step..."
echo "The CI workflow tries to run:"
echo "  uses: securecodewarrior/github-action-add-sarif@v1"
echo "  with:"
echo "    sarif-file: 'security-scan-results.sarif'"
echo

# Check if the file exists and is valid JSON
if [ -f "test-results/security-scan-results.sarif" ]; then
    echo "✅ SARIF file exists"
    if command -v jq >/dev/null 2>&1; then
        if jq empty test-results/security-scan-results.sarif 2>/dev/null; then
            echo "✅ SARIF file is valid JSON"
        else
            echo "❌ SARIF file is invalid JSON"
        fi
    else
        echo "⚠️ jq not available - cannot validate JSON"
    fi
else
    echo "❌ SARIF file does not exist"
fi

echo
echo "4. The actual issue in CI:"
echo "   - The security scan step likely fails to generate the SARIF file"
echo "   - Or the SARIF file is generated in a different location"
echo "   - The upload step then fails because it can't find 'security-scan-results.sarif'"

echo
echo "5. Testing file paths that CI might be looking for:"
for path in "security-scan-results.sarif" "test-results/security-scan-results.sarif" ".github/security-scan-results.sarif"; do
    if [ -f "$path" ]; then
        echo "✅ Found: $path"
    else
        echo "❌ Missing: $path"
    fi
done

echo
echo "=== SARIF Resolution Failure Reproduction Complete ==="