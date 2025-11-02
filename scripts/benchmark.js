const { performance } = require('perf_hooks');
const { DiffProcessor } = require('../dist/diff/DiffProcessor');

class Benchmark {
  constructor() {
    this.results = [];
  }

  async runBenchmark(name, fn, iterations = 1000) {
    console.log(`Running benchmark: ${name}`);

    // Warm up
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await fn();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    const result = {
      name,
      totalTime,
      avgTime,
      iterations
    };

    this.results.push(result);
    console.log(`Result: ${avgTime.toFixed(4)}ms per iteration (${iterations} iterations)`);

    return result;
  }

  generateLargeDiff() {
    const lines = [];
    for (let i = 0; i < 1000; i++) {
      lines.push(`+const variable${i} = 'value${i}';`);
      if (i % 3 === 0) {
        lines.push(`-const oldVariable${i} = 'oldValue${i}';`);
      }
      if (i % 5 === 0) {
        lines.push(` console.log('Debug info ${i}');`);
      }
    }
    return lines.join('\n');
  }

  async runAllBenchmarks() {
    console.log('Starting performance benchmarks...\n');

    const processor = new DiffProcessor();
    const largeDiff = this.generateLargeDiff();

    // Benchmark 1: Small diff processing
    await this.runBenchmark('Small Diff Processing', async () => {
      const smallDiff = '+const x = 1;\n-const y = 2;\n console.log("test");';
      processor.chunkDiff(smallDiff);
    }, 500);

    // Benchmark 2: Large diff processing
    await this.runBenchmark('Large Diff Processing', async () => {
      processor.chunkDiff(largeDiff);
    }, 100);

    // Benchmark 3: Multiple files processing
    await this.runBenchmark('Multiple Files Processing', async () => {
      const files = [
        { patch: '+const a = 1;', filename: 'file1.js' },
        { patch: '+const b = 2;', filename: 'file2.js' },
        { patch: '+const c = 3;', filename: 'file3.js' }
      ];

      files.forEach(file => {
        processor.chunkDiff(file.patch);
      });
    }, 200);

    
    this.printSummary();
  }

  printSummary() {
    console.log('\n=== Benchmark Summary ===');
    this.results.forEach(result => {
      console.log(`${result.name}:`);
      console.log(`  Average time: ${result.avgTime.toFixed(4)}ms`);
      console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log('');
    });

    // Performance recommendations
    const slowestBenchmark = this.results.reduce((prev, current) =>
      prev.avgTime > current.avgTime ? prev : current
    );

    console.log(`Slowest operation: ${slowestBenchmark.name} (${slowestBenchmark.avgTime.toFixed(4)}ms)`);

    if (slowestBenchmark.avgTime > 10) {
      console.log('⚠️  Performance optimization recommended for slowest operation');
    } else {
      console.log('✅ All operations perform within acceptable limits');
    }
  }
}

// Run benchmarks if this script is executed directly
if (require.main === module) {
  const benchmark = new Benchmark();
  benchmark.runAllBenchmarks().catch(console.error);
}

module.exports = { Benchmark };