/**
 * Jest setup file for enhanced test reporting and performance tracking
 */

interface TestMetrics {
  start: number;
  end?: number;
  duration?: number;
  memory: NodeJS.MemoryUsage;
  endMemory?: NodeJS.MemoryUsage;
  memoryDelta?: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface TestReport {
  name: string;
  duration?: number;
  memoryUsage?: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface TestSummary {
  totalTests: number;
  averageDuration: number;
  slowestTest: TestReport | null;
  fastestTest: TestReport | null;
}

interface PerformanceReport {
  totalDuration: number;
  tests: TestReport[];
  summary: TestSummary;
}

// Performance tracking setup
const testPerformance = {
  startTime: Date.now(),
  testTimes: new Map<string, TestMetrics>(),

  startTest(testName: string) {
    this.testTimes.set(testName, {
      start: Date.now(),
      memory: process.memoryUsage()
    });
  },

  endTest(testName: string) {
    const test = this.testTimes.get(testName);
    if (test) {
      test.end = Date.now();
      test.duration = test.end - test.start;
      test.endMemory = process.memoryUsage();
      test.memoryDelta = {
        rss: test.endMemory.rss - test.memory.rss,
        heapUsed: test.endMemory.heapUsed - test.memory.heapUsed,
        heapTotal: test.endMemory.heapTotal - test.memory.heapTotal,
        external: test.endMemory.external - test.memory.external,
      };
    }
  },

  getReport(): PerformanceReport {
    const report: PerformanceReport = {
      totalDuration: Date.now() - this.startTime,
      tests: Array.from(this.testTimes.entries()).map(([name, data]) => ({
        name,
        duration: data.duration,
        memoryUsage: data.memoryDelta
      })),
      summary: {
        totalTests: this.testTimes.size,
        averageDuration: 0,
        slowestTest: null,
        fastestTest: null
      }
    };

    if (report.tests.length > 0) {
      const durations = report.tests.map(t => t.duration || 0);
      report.summary.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      report.summary.slowestTest = report.tests.reduce((a, b) => (a.duration || 0) > (b.duration || 0) ? a : b);
      report.summary.fastestTest = report.tests.reduce((a, b) => (a.duration || 0) < (b.duration || 0) ? a : b);
    }

    return report;
  }
};

// Global test performance tracking
(global as any).testPerformance = testPerformance;

// Enhanced console reporting
const originalConsoleLog = console.log;
console.log = (...args) => {
  // Add timestamp to all test logs
  const timestamp = new Date().toISOString();
  originalConsoleLog(`[${timestamp}]`, ...args);
};

// Test environment info
console.log('🧪 Test Environment Information:');
console.log(`- Node.js: ${process.version}`);
console.log(`- Platform: ${process.platform}`);
console.log(`- Architecture: ${process.arch}`);
console.log(`- PID: ${process.pid}`);
console.log(`- Memory (initial): ${JSON.stringify(process.memoryUsage())}`);

// Coverage reporting enhancement
const originalCoverageReporters = (global as any).coverageReporters || [];
(global as any).coverageReporters = [
  ...originalCoverageReporters,
  'text-summary',
  'lcov',
  'html',
  'json'
];

// Setup global test utilities
(global as any).testUtils = {
  /**
   * Measure test execution time
   */
  measureTime: async (testName: string, testFn: () => Promise<any>) => {
    testPerformance.startTest(testName);
    try {
      const result = await testFn();
      testPerformance.endTest(testName);
      return result;
    } catch (error) {
      testPerformance.endTest(testName);
      throw error;
    }
  },

  /**
   * Create performance markers
   */
  mark: (name: string) => {
    if ((global as any).performance && (global as any).performance.mark) {
      (global as any).performance.mark(name);
    }
  },

  /**
   * Measure memory usage
   */
  getMemoryUsage: () => {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
    };
  }
};

// Save performance report at the end of testing
process.on('exit', () => {
  const report = testPerformance.getReport();

  // Save performance report to file
  const fs = require('fs');
  const path = require('path');

  try {
    const reportDir = path.join(process.cwd(), 'test-results');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportDir, 'test-performance.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('📊 Performance report saved to test-results/test-performance.json');
  } catch (error: any) {
    console.warn('⚠️ Could not save performance report:', error.message);
  }
});

// Jest environment teardown
afterAll(() => {
  const finalMemory = (global as any).testUtils.getMemoryUsage();
  console.log('🧹 Final memory usage:', finalMemory);
});