// Test scenarios for integration testing
// These scenarios define different PR contexts and expected outcomes

export interface TestScenario {
  name: string;
  description: string;
  mockPRContext: {
    owner: string;
    repo: string;
    prNumber: number;
    title: string;
    baseSha: string;
    headSha: string;
    files: string[];
  };
  diffContent: string;
  actionInputs: {
    'github-token': string;
    providers?: string;
    'review-focus'?: string;
    'chunk-size'?: string;
    'custom-prompt'?: string;
    'skip-patterns'?: string;
    'openai-api-keys'?: string[];
    'claude-api-keys'?: string[];
    'gemini-api-keys'?: string[];
  };
  expectedOutcome: {
    shouldSucceed: boolean;
    expectedSuggestionsCount?: number;
    expectedHighSeverityCount?: number;
    expectedCommentsCreated?: number;
    expectedOutputContains?: string[];
    shouldCreateReviewComment?: boolean;
    errorMessage?: string;
  };
  mockScenario?: string; // Which mock response scenario to use
}

export const INTEGRATION_TEST_SCENARIOS: TestScenario[] = [
  // Basic Review Scenario
  {
    name: 'basic-review',
    description: 'Standard PR with minor code issues',
    mockPRContext: {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 123,
      title: 'Feature: Add user authentication',
      baseSha: 'abc123def456',
      headSha: 'def456abc789',
      files: ['src/index.ts', 'src/auth/UserService.ts']
    },
    diffContent: `File: src/index.ts
@@ -44,7 +44,8 @@
   }

-  processReview() {
+  async processReview() {
+    // TODO: Add error handling
     const diff = await this.getDiff();
     const results = await this.analyzeCode(diff);
     return results;
@@ -52,6 +53,12 @@
 }

File: src/auth/UserService.ts
@@ -20,7 +20,8 @@
 export class UserService {
   private users: Map<string, User> = new Map();

-  addUser(user: User) {
+  addUser(user: User) {
+    // TODO: Validate user input
     this.users.set(user.id, user);
+
+    // Magic number for retry logic
+    const MAX_RETRIES = 3;`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'openai,claude,gemini',
      'review-focus': 'security,performance,style',
      'chunk-size': '2000',
      'openai-api-keys': ['sk-test-key-1'],
      'claude-api-keys': ['sk-ant-test-key-1'],
      'gemini-api-keys': ['AIza-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 2,
      expectedHighSeverityCount: 0,
      expectedCommentsCreated: 1,
      expectedOutputContains: ['🤖 AI Code Review Summary', '**Focus Areas:** security,performance,style', '**Suggestions Found:** 2'],
      shouldCreateReviewComment: true
    },
    mockScenario: 'basic-review'
  },

  // Security Issues Scenario
  {
    name: 'security-issues',
    description: 'PR with critical security vulnerabilities',
    mockPRContext: {
      owner: 'security-team',
      repo: 'banking-app',
      prNumber: 456,
      title: 'Fix: Update database connection handling',
      baseSha: 'xyz789uvw012',
      headSha: 'uvw012xyz345',
      files: ['src/database/DatabaseService.ts', 'src/api/UserController.ts']
    },
    diffContent: `File: src/database/DatabaseService.ts
@@ -64,7 +64,8 @@
   async getUserData(userId: string): Promise<User> {
     try {
       const query = \`SELECT * FROM users WHERE user_id = \${userId}\`;
-      const result = await db.query(query);
+      const result = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
       return result;
     } catch (error) {
       throw new Error(\`Failed to get user: \${error}\`);
     }

File: src/api/UserController.ts
@@ -86,7 +87,8 @@
   async handleError(error: Error) {
     console.error('Processing error:', error);
-    console.log('API Key:', process.env.API_KEY);
+    // TODO: Remove sensitive logging
+    console.log('API Key:', process.env.API_KEY?.substring(0, 4) + '***');
     return error.message;
   }`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'claude',
      'review-focus': 'security',
      'chunk-size': '1500',
      'claude-api-keys': ['sk-ant-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 3,
      expectedHighSeverityCount: 2,
      expectedCommentsCreated: 3, // Summary + 2 high severity individual comments
      expectedOutputContains: ['🤖 AI Code Review Summary', '**Focus Areas:** security', '**Suggestions Found:** 3'],
      shouldCreateReviewComment: true
    },
    mockScenario: 'security-review'
  },

  // Performance Issues Scenario
  {
    name: 'performance-issues',
    description: 'PR with performance bottlenecks',
    mockPRContext: {
      owner: 'performance-team',
      repo: 'web-app',
      prNumber: 789,
      title: 'Optimize: Improve data processing performance',
      baseSha: 'mno345pqr678',
      headSha: 'pqr678mno901',
      files: ['src/processors/DataProcessor.ts', 'src/utils/StringBuilder.ts']
    },
    diffContent: `File: src/processors/DataProcessor.ts
@@ -110,15 +110,18 @@
 export class DataProcessor {
   async processLargeDataset(items: any[]): Promise<ProcessedData> {
     let result = '';
+
     for (let i = 0; i < items.length; i++) {
-      result += items[i].data;
-      result += ',';
+      // Inefficient string concatenation
+      result = result + items[i].data + ',';
+
+      // Synchronous file operations
+      const data = fs.readFileSync(\`temp_\${i}.txt\`);
     }

     return {
       processed: result,
       count: items.length
     };
   }
 }

File: src/utils/StringBuilder.ts
@@ -20,7 +20,10 @@
 export class StringBuilder {
   private parts: string[] = [];

-  append(text: string) {
+  append(text: string) {
+    // Unnecessary API call in loop
+    const config = this.loadConfig();
+
     this.parts.push(text);
     return this;
   }
 }`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'gemini',
      'review-focus': 'performance',
      'chunk-size': '3000',
      'gemini-api-keys': ['AIza-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 3,
      expectedHighSeverityCount: 0,
      expectedCommentsCreated: 1,
      expectedOutputContains: ['🤖 AI Code Review Summary', '**Focus Areas:** performance', '**Suggestions Found:** 3'],
      shouldCreateReviewComment: true
    },
    mockScenario: 'performance-review'
  },

  // No Issues Scenario
  {
    name: 'no-issues',
    description: 'Clean PR with no issues found',
    mockPRContext: {
      owner: 'documentation-team',
      repo: 'docs-site',
      prNumber: 101112,
      title: 'Docs: Update API documentation',
      baseSha: 'doc111doc222',
      headSha: 'doc222doc333',
      files: ['docs/api.md', 'README.md']
    },
    diffContent: `File: docs/api.md
@@ -1,5 +1,8 @@
 # API Documentation

 ## Getting Started

-This is the old documentation.
+This is the updated documentation with better examples.
+
+## Examples
+Here are some code examples...
+
+## Authentication
+Details about authentication...`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'openai',
      'review-focus': 'style',
      'openai-api-keys': ['sk-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 0,
      expectedHighSeverityCount: 0,
      expectedCommentsCreated: 1,
      expectedOutputContains: ['🤖 AI Code Review Summary', '🎉 No issues found! Your code looks great.'],
      shouldCreateReviewComment: true
    },
    mockScenario: 'no-issues'
  },

  // Error Handling Scenario
  {
    name: 'error-handling',
    description: 'PR with poor error handling',
    mockPRContext: {
      owner: 'backend-team',
      repo: 'microservice',
      prNumber: 131415,
      title: 'Refactor: Improve error handling',
      baseSha: 'err111err222',
      headSha: 'err222err333',
      files: ['src/services/ProviderManager.ts', 'src/index.ts']
    },
    diffContent: `File: src/services/ProviderManager.ts
@@ -50,10 +50,15 @@
 export class ProviderManager {
   async analyzeWithProviders(data: any): Promise<AnalysisResult> {
     const promises = [];

     for (const provider of this.providers) {
-      promises.push(provider.analyze(data));
+      // Unhandled promise rejection
+      promises.push(provider.analyze(data).catch(err => {
+        console.log('Analysis failed:', err.message);
+        // Not re-throwing or handling properly
+      }));
     }

     return Promise.all(promises);
   }
 }

File: src/index.ts
@@ -120,7 +125,10 @@
   async generateReport(results: AnalysisResult[]): Promise<string> {
     try {
       return this.formatResults(results);
-    } catch (error) {
+    } catch (error) {
+      // Generic error message
+      console.error('An error occurred:', error);
+      return 'Error generating report';
     }
   }`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'claude',
      'review-focus': 'reliability',
      'claude-api-keys': ['sk-ant-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 2,
      expectedHighSeverityCount: 1,
      expectedCommentsCreated: 2,
      expectedOutputContains: ['🤖 AI Code Review Summary', '**Suggestions Found:** 2'],
      shouldCreateReviewComment: true
    },
    mockScenario: 'error-handling'
  },

  // Empty PR Scenario
  {
    name: 'empty-pr',
    description: 'PR with no actual changes',
    mockPRContext: {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 999,
      title: 'Docs: Typo fix',
      baseSha: 'empty111empty222',
      headSha: 'empty222empty333',
      files: []
    },
    diffContent: '',
    actionInputs: {
      'github-token': 'test-token',
      providers: 'openai',
      'openai-api-keys': ['sk-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 0,
      expectedHighSeverityCount: 0,
      expectedCommentsCreated: 0,
      expectedOutputContains: [],
      shouldCreateReviewComment: false
    }
  },

  // Configuration Error Scenario
  {
    name: 'no-api-keys',
    description: 'Action configured without any API keys',
    mockPRContext: {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 888,
      title: 'Feature: Add new endpoints',
      baseSha: 'conf111conf222',
      headSha: 'conf222conf333',
      files: ['src/api/new-endpoints.ts']
    },
    diffContent: `File: src/api/new-endpoints.ts
@@ -1,5 +1,10 @@
 // New API endpoints
 export class NewEndpoints {
+  createEndpoint() {
+    // Implementation here
+    return true;
+  }
+
   // More code...
 }`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'openai,claude,gemini',
      'openai-api-keys': [], // Empty
      'claude-api-keys': [], // Empty
      'gemini-api-keys': []  // Empty
    },
    expectedOutcome: {
      shouldSucceed: false,
      errorMessage: 'No valid providers configured. Please provide at least one API key.',
      expectedCommentsCreated: 0,
      shouldCreateReviewComment: false
    }
  },

  // Provider Failure Scenario
  {
    name: 'provider-failure',
    description: 'Provider API failures during analysis',
    mockPRContext: {
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 777,
      title: 'Fix: Update user service',
      baseSha: 'fail111fail222',
      headSha: 'fail222fail333',
      files: ['src/services/UserService.ts']
    },
    diffContent: `File: src/services/UserService.ts
@@ -10,7 +10,10 @@
 export class UserService {
   async updateUser(userId: string, data: any): Promise<User> {
-    return this.db.update(userId, data);
+    // Added validation
+    this.validateInput(data);
+    return this.db.update(userId, data);
+  }
+
+  private validateInput(data: any) {
+    // Validation logic
+  }
 }`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'openai,claude',
      'openai-api-keys': ['sk-test-key-1'],
      'claude-api-keys': ['sk-ant-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true, // Should succeed despite provider failures
      expectedSuggestionsCount: 0, // No suggestions due to failures
      expectedCommentsCreated: 1,
      shouldCreateReviewComment: true
    },
    mockScenario: 'error-handling'
  },

  // Skip Patterns Scenario
  {
    name: 'skip-patterns',
    description: 'PR with files that should be skipped',
    mockPRContext: {
      owner: 'frontend-team',
      repo: 'web-app',
      prNumber: 666,
      title: 'Build: Update dependencies and bundle',
      baseSha: 'skip111skip222',
      headSha: 'skip222skip333',
      files: ['src/app.js', 'dist/bundle.min.js', 'package-lock.json', 'src/utils.js']
    },
    diffContent: `File: src/app.js
@@ -5,7 +5,10 @@
 function initializeApp() {
-  console.log('App starting...');
+  console.log('App starting with new features...');
+
+  // Bug fix: Initialize proper error handling
+  window.onerror = (msg, url, line) => {
+    console.error('Error:', msg);
+  };
 }

File: dist/bundle.min.js
@@ -1,1 +1,1 @@
-!function(){var e,t,n={...}}();
+!function(){var e,t,n={...more code...}}();

File: package-lock.json
@@ -1234,7 +1234,7 @@
     "webpack": {
       "version": "5.88.0",
-      "resolved": "https://registry.npmjs.org/webpack/-/webpack-5.88.0.tgz"
+      "resolved": "https://registry.npmjs.org/webpack/-/webpack-5.89.0.tgz"

File: src/utils.js
@@ -10,7 +10,10 @@
 export function formatDate(date) {
-  return date.toLocaleDateString();
+  // Enhanced formatting
+  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
+  return date.toLocaleDateString(undefined, options);
+}`,
    actionInputs: {
      'github-token': 'test-token',
      providers: 'openai',
      'review-focus': 'style',
      'skip-patterns': '*.min.js,package-lock.json',
      'openai-api-keys': ['sk-test-key-1']
    },
    expectedOutcome: {
      shouldSucceed: true,
      expectedSuggestionsCount: 1, // Only suggestions for non-skipped files
      expectedHighSeverityCount: 0,
      expectedCommentsCreated: 1,
      shouldCreateReviewComment: true
    },
    mockScenario: 'basic-review'
  }
];

// Helper function to get a specific scenario
export const getScenario = (name: string): TestScenario | undefined => {
  return INTEGRATION_TEST_SCENARIOS.find(scenario => scenario.name === name);
};

// Helper function to get scenarios by category
export const getScenariosByCategory = (category: string): TestScenario[] => {
  switch (category) {
    case 'success':
      return INTEGRATION_TEST_SCENARIOS.filter(s => s.expectedOutcome.shouldSucceed);
    case 'failure':
      return INTEGRATION_TEST_SCENARIOS.filter(s => !s.expectedOutcome.shouldSucceed);
    case 'security':
      return INTEGRATION_TEST_SCENARIOS.filter(s => s.mockScenario === 'security-review');
    case 'performance':
      return INTEGRATION_TEST_SCENARIOS.filter(s => s.mockScenario === 'performance-review');
    default:
      return INTEGRATION_TEST_SCENARIOS;
  }
};