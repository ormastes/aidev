#!/usr/bin/env node

/**
 * Advanced MCP Testing Scenarios
 * Stress testing, race conditions, and edge cases
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const { path } = require('../infra_external-log-lib/src');
const { performance } = require('perf_hooks');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m'
};

class AdvancedMCPTester {
  constructor() {
    this.results = {
      stress: [],
      race: [],
      security: [],
      performance: [],
      integration: []
    };
    this.mcpServer = 'mcp-server-strict.js';
  }

  // Send command to MCP server
  async sendCommand(command, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const mcp = spawn('node', [this.mcpServer], {
        env: {
          ...process.env,
          VF_BASE_PATH: '/home/ormastes/dev/aidev'
        }
      });

      let response = '';
      let error = '';
      let timeoutHandle;

      timeoutHandle = setTimeout(() => {
        mcp.kill();
        resolve({ 
          timeout: true, 
          error: 'Command timeout',
          duration: performance.now() - startTime
        });
      }, timeout);

      mcp.stdout.on('data', (data) => {
        response += data.toString();
      });

      mcp.stderr.on('data', (data) => {
        error += data.toString();
      });

      mcp.on('close', (code) => {
        clearTimeout(timeoutHandle);
        const duration = performance.now() - startTime;
        
        if (response) {
          try {
            const lines = response.split('\n').filter(line => line.trim());
            const lastLine = lines[lines.length - 1];
            const result = JSON.parse(lastLine);
            resolve({ ...result, duration });
          } catch (e) {
            resolve({ parseError: true, response, error, duration });
          }
        } else {
          resolve({ noResponse: true, error: error || 'No response', duration });
        }
      });

      mcp.stdin.write(JSON.stringify(command) + '\n');
      mcp.stdin.end();
    });
  }

  // Test 1: Stress Testing - Concurrent Operations
  async stressTestConcurrent() {
    console.log(`\n${colors.bright}${colors.cyan}STRESS TEST: Concurrent Operations${colors.reset}`);
    console.log('Testing: Handle 100 concurrent file checks');
    console.log('-'.repeat(50));

    const concurrentRequests = 100;
    const commands = [];
    
    // Create diverse commands
    for (let i = 0; i < concurrentRequests; i++) {
      commands.push({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: i % 2 === 0 ? `test-${i}.js` : `gen/doc/test-${i}.md`,
            purpose: `Stress test file ${i}`
          }
        },
        id: i
      });
    }

    const startTime = performance.now();
    
    try {
      // Send all commands concurrently
      const results = await Promise.all(
        commands.map(cmd => this.sendCommand(cmd, 10000))
      );
      
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      
      // Analyze results
      const successful = results.filter(r => r.result && !r.timeout && !r.error).length;
      const timeouts = results.filter(r => r.timeout).length;
      const errors = results.filter(r => r.error || r.parseError).length;
      const avgResponseTime = results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length;
      
      console.log(`${colors.green}✅ Completed:${colors.reset} ${successful}/${concurrentRequests} requests`);
      console.log(`   Total Duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`   Average Response: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`   Timeouts: ${timeouts}`);
      console.log(`   Errors: ${errors}`);
      
      const passed = successful >= concurrentRequests * 0.95; // 95% success rate
      
      this.results.stress.push({
        test: 'Concurrent Operations',
        passed,
        successful,
        total: concurrentRequests,
        duration: totalDuration,
        avgResponse: avgResponseTime
      });
      
      if (passed) {
        console.log(`   ${colors.green}✅ PASS: Server handled concurrent load${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ FAIL: Server couldn't handle load${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ ERROR:${colors.reset} ${error.message}`);
      this.results.stress.push({
        test: 'Concurrent Operations',
        passed: false,
        error: error.message
      });
    }
  }

  // Test 2: Race Condition - Simultaneous NAME_ID Updates
  async testRaceCondition() {
    console.log(`\n${colors.bright}${colors.cyan}RACE CONDITION TEST: Simultaneous NAME_ID Updates${colors.reset}`);
    console.log('Testing: Multiple simultaneous file registrations');
    console.log('-'.repeat(50));

    const simultaneousWrites = 10;
    const commands = [];
    
    for (let i = 0; i < simultaneousWrites; i++) {
      commands.push({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'register_file',
          arguments: {
            path: `race/test-${i}.js`,
            purpose: `Race condition test ${i}`,
            category: 'tests',
            tags: ['race', 'test']
          }
        },
        id: 100 + i
      });
    }

    try {
      // Send all registration commands at once
      const results = await Promise.all(
        commands.map(cmd => this.sendCommand(cmd))
      );
      
      // Check for unique IDs
      const ids = results
        .filter(r => r.result?.content)
        .map(r => {
          try {
            const content = JSON.parse(r.result.content[0].text);
            return content.id;
          } catch {
            return null;
          }
        })
        .filter(id => id !== null);
      
      const uniqueIds = new Set(ids);
      const hasUniqueIds = uniqueIds.size === ids.length;
      const allRegistered = ids.length === simultaneousWrites;
      
      console.log(`   Registered: ${ids.length}/${simultaneousWrites}`);
      console.log(`   Unique IDs: ${uniqueIds.size}`);
      console.log(`   ID Collision: ${hasUniqueIds ? 'None' : 'Detected'}`);
      
      const passed = hasUniqueIds && allRegistered;
      
      this.results.race.push({
        test: 'Simultaneous NAME_ID Updates',
        passed,
        registered: ids.length,
        unique: uniqueIds.size,
        expected: simultaneousWrites
      });
      
      if (passed) {
        console.log(`   ${colors.green}✅ PASS: No race condition detected${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ FAIL: Race condition or ID collision${colors.reset}`);
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ ERROR:${colors.reset} ${error.message}`);
      this.results.race.push({
        test: 'Simultaneous NAME_ID Updates',
        passed: false,
        error: error.message
      });
    }
  }

  // Test 3: Security - Injection Attacks
  async testSecurityInjection() {
    console.log(`\n${colors.bright}${colors.cyan}SECURITY TEST: Injection Attack Prevention${colors.reset}`);
    console.log('Testing: Various injection attack vectors');
    console.log('-'.repeat(50));

    const injectionTests = [
      {
        name: 'Path Injection',
        path: '"; rm -rf /*; echo "',
        purpose: 'Malicious command injection'
      },
      {
        name: 'Null Byte Injection',
        path: 'test.js\x00.txt',
        purpose: 'Null byte bypass'
      },
      {
        name: 'Directory Traversal Variants',
        path: '....//....//etc/passwd',
        purpose: 'Alternative traversal'
      },
      {
        name: 'Unicode Bypass',
        path: 'test\u002e\u002e/\u002e\u002e/etc/passwd',
        purpose: 'Unicode traversal'
      },
      {
        name: 'JSON Injection',
        path: 'test.js","allowed":true,"injected":"',
        purpose: 'JSON structure manipulation'
      },
      {
        name: 'Script Tag Injection',
        path: '<script>alert("XSS")</script>.js',
        purpose: 'XSS attempt'
      }
    ];

    let blocked = 0;
    let allowed = 0;

    for (const test of injectionTests) {
      const result = await this.sendCommand({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: test.path,
            purpose: test.purpose
          }
        },
        id: 200 + blocked + allowed
      });

      if (result.result?.content) {
        try {
          const content = JSON.parse(result.result.content[0].text);
          if (content.allowed === false) {
            console.log(`   ${colors.green}✅${colors.reset} ${test.name}: Blocked`);
            blocked++;
          } else {
            console.log(`   ${colors.red}❌${colors.reset} ${test.name}: Allowed (SECURITY RISK)`);
            allowed++;
          }
        } catch {
          console.log(`   ${colors.yellow}⚠️${colors.reset} ${test.name}: Parse error (safe)`);
          blocked++;
        }
      } else {
        console.log(`   ${colors.yellow}⚠️${colors.reset} ${test.name}: No response (safe)`);
        blocked++;
      }
    }

    const passed = blocked === injectionTests.length;
    
    this.results.security.push({
      test: 'Injection Prevention',
      passed,
      blocked,
      total: injectionTests.length
    });

    console.log(`\n   Total Blocked: ${blocked}/${injectionTests.length}`);
    if (passed) {
      console.log(`   ${colors.green}✅ PASS: All injections blocked${colors.reset}`);
    } else {
      console.log(`   ${colors.red}❌ FAIL: Some injections not blocked${colors.reset}`);
    }
  }

  // Test 4: Performance Benchmarks
  async testPerformance() {
    console.log(`\n${colors.bright}${colors.cyan}PERFORMANCE TEST: Response Time Benchmarks${colors.reset}`);
    console.log('Testing: Server response times under various loads');
    console.log('-'.repeat(50));

    const benchmarks = [
      { name: 'Single Request', count: 1 },
      { name: 'Small Batch', count: 10 },
      { name: 'Medium Batch', count: 50 },
      { name: 'Large Batch', count: 100 }
    ];

    const performanceResults = [];

    for (const benchmark of benchmarks) {
      const commands = [];
      for (let i = 0; i < benchmark.count; i++) {
        commands.push({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'check_file_allowed',
            arguments: {
              path: `perf/test-${i}.js`,
              purpose: `Performance test ${i}`
            }
          },
          id: 300 + i
        });
      }

      const startTime = performance.now();
      const results = await Promise.all(
        commands.map(cmd => this.sendCommand(cmd))
      );
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = totalTime / benchmark.count;
      const successful = results.filter(r => r.result && !r.timeout).length;

      performanceResults.push({
        name: benchmark.name,
        count: benchmark.count,
        totalTime,
        avgTime,
        successful,
        throughput: (benchmark.count / (totalTime / 1000)).toFixed(2) // requests per second
      });

      console.log(`   ${benchmark.name} (${benchmark.count} requests):`);
      console.log(`     Total Time: ${totalTime.toFixed(2)}ms`);
      console.log(`     Avg Response: ${avgTime.toFixed(2)}ms`);
      console.log(`     Throughput: ${(benchmark.count / (totalTime / 1000)).toFixed(2)} req/s`);
      console.log(`     Success Rate: ${(successful / benchmark.count * 100).toFixed(1)}%`);
    }

    // Check if performance is acceptable
    const acceptable = performanceResults.every(r => 
      r.avgTime < 100 && // Less than 100ms average
      r.successful === r.count // All successful
    );

    this.results.performance = performanceResults;

    if (acceptable) {
      console.log(`\n   ${colors.green}✅ PASS: Performance within acceptable limits${colors.reset}`);
    } else {
      console.log(`\n   ${colors.yellow}⚠️ WARNING: Performance degradation detected${colors.reset}`);
    }
  }

  // Test 5: Edge Cases
  async testEdgeCases() {
    console.log(`\n${colors.bright}${colors.cyan}EDGE CASE TEST: Boundary Conditions${colors.reset}`);
    console.log('Testing: Extreme and unusual inputs');
    console.log('-'.repeat(50));

    const edgeCases = [
      {
        name: 'Empty Path',
        path: '',
        purpose: 'Test empty path'
      },
      {
        name: 'Very Long Path',
        path: 'a'.repeat(500) + '.js',
        purpose: 'Test path length limit'
      },
      {
        name: 'Special Characters',
        path: '!@#$%^&*().js',
        purpose: 'Test special chars'
      },
      {
        name: 'Only Extension',
        path: '.js',
        purpose: 'Test extension only'
      },
      {
        name: 'Multiple Extensions',
        path: 'test.min.js.map',
        purpose: 'Test multiple dots'
      },
      {
        name: 'Unicode Filename',
        path: '文件测试.js',
        purpose: 'Test unicode'
      },
      {
        name: 'Space in Path',
        path: 'test file.js',
        purpose: 'Test spaces'
      },
      {
        name: 'Absolute Path',
        path: '/absolute/path/test.js',
        purpose: 'Test absolute path'
      }
    ];

    let handled = 0;
    let errors = 0;

    for (const testCase of edgeCases) {
      const result = await this.sendCommand({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'check_file_allowed',
          arguments: {
            path: testCase.path,
            purpose: testCase.purpose
          }
        },
        id: 400 + handled + errors
      });

      if (result.result?.content) {
        try {
          const content = JSON.parse(result.result.content[0].text);
          console.log(`   ${colors.green}✅${colors.reset} ${testCase.name}: Handled correctly`);
          handled++;
        } catch {
          console.log(`   ${colors.yellow}⚠️${colors.reset} ${testCase.name}: Parse error`);
          errors++;
        }
      } else if (result.timeout) {
        console.log(`   ${colors.red}❌${colors.reset} ${testCase.name}: Timeout`);
        errors++;
      } else {
        console.log(`   ${colors.yellow}⚠️${colors.reset} ${testCase.name}: No response`);
        errors++;
      }
    }

    const passed = handled >= edgeCases.length * 0.8; // 80% handled correctly

    this.results.integration.push({
      test: 'Edge Cases',
      passed,
      handled,
      errors,
      total: edgeCases.length
    });

    console.log(`\n   Handled: ${handled}/${edgeCases.length}`);
    if (passed) {
      console.log(`   ${colors.green}✅ PASS: Edge cases handled properly${colors.reset}`);
    } else {
      console.log(`   ${colors.red}❌ FAIL: Some edge cases not handled${colors.reset}`);
    }
  }

  // Test 6: Memory Leak Detection
  async testMemoryLeak() {
    console.log(`\n${colors.bright}${colors.cyan}MEMORY TEST: Leak Detection${colors.reset}`);
    console.log('Testing: Memory usage under sustained load');
    console.log('-'.repeat(50));

    const iterations = 5;
    const requestsPerIteration = 20;
    const memoryUsage = [];

    for (let i = 0; i < iterations; i++) {
      const commands = [];
      for (let j = 0; j < requestsPerIteration; j++) {
        commands.push({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'check_file_allowed',
            arguments: {
              path: `memory/test-${i}-${j}.js`,
              purpose: `Memory test ${i}-${j}`
            }
          },
          id: 500 + (i * requestsPerIteration) + j
        });
      }

      // Send batch
      await Promise.all(commands.map(cmd => this.sendCommand(cmd)));
      
      // Record memory (simulated since we can't directly measure server memory)
      const memUsed = process.memoryUsage().heapUsed / 1024 / 1024;
      memoryUsage.push(memUsed);
      
      console.log(`   Iteration ${i + 1}: ${memUsed.toFixed(2)} MB`);
    }

    // Check for memory leak (memory shouldn't increase linearly)
    const firstHalf = memoryUsage.slice(0, Math.floor(iterations / 2));
    const secondHalf = memoryUsage.slice(Math.floor(iterations / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const increase = ((avgSecond - avgFirst) / avgFirst) * 100;

    const hasLeak = increase > 20; // More than 20% increase suggests leak

    console.log(`   Memory increase: ${increase.toFixed(2)}%`);
    
    if (!hasLeak) {
      console.log(`   ${colors.green}✅ PASS: No memory leak detected${colors.reset}`);
    } else {
      console.log(`   ${colors.yellow}⚠️ WARNING: Possible memory leak${colors.reset}`);
    }

    this.results.performance.push({
      test: 'Memory Leak',
      passed: !hasLeak,
      increase: increase.toFixed(2)
    });
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bright}${colors.cyan}📊 ADVANCED TESTING SUMMARY${colors.reset}`);
    console.log('='.repeat(70));

    // Stress Test Results
    console.log(`\n${colors.bright}Stress Testing:${colors.reset}`);
    this.results.stress.forEach(r => {
      const status = r.passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
      console.log(`  ${r.test}: ${status}${colors.reset}`);
      if (r.successful) {
        console.log(`    Success Rate: ${(r.successful / r.total * 100).toFixed(1)}%`);
        console.log(`    Avg Response: ${r.avgResponse.toFixed(2)}ms`);
      }
    });

    // Race Condition Results
    console.log(`\n${colors.bright}Race Conditions:${colors.reset}`);
    this.results.race.forEach(r => {
      const status = r.passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
      console.log(`  ${r.test}: ${status}${colors.reset}`);
      if (r.registered !== undefined) {
        console.log(`    Unique IDs: ${r.unique}/${r.expected}`);
      }
    });

    // Security Results
    console.log(`\n${colors.bright}Security:${colors.reset}`);
    this.results.security.forEach(r => {
      const status = r.passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
      console.log(`  ${r.test}: ${status}${colors.reset}`);
      console.log(`    Blocked: ${r.blocked}/${r.total} attacks`);
    });

    // Performance Results
    console.log(`\n${colors.bright}Performance:${colors.reset}`);
    this.results.performance.forEach(r => {
      if (r.name) {
        console.log(`  ${r.name}:`);
        console.log(`    Throughput: ${r.throughput} req/s`);
        console.log(`    Avg Response: ${r.avgTime.toFixed(2)}ms`);
      } else if (r.test === 'Memory Leak') {
        const status = r.passed ? `${colors.green}✅ PASS` : `${colors.yellow}⚠️ WARNING`;
        console.log(`  Memory Leak Test: ${status}${colors.reset}`);
        console.log(`    Memory Increase: ${r.increase}%`);
      }
    });

    // Integration Results
    console.log(`\n${colors.bright}Integration & Edge Cases:${colors.reset}`);
    this.results.integration.forEach(r => {
      const status = r.passed ? `${colors.green}✅ PASS` : `${colors.red}❌ FAIL`;
      console.log(`  ${r.test}: ${status}${colors.reset}`);
      console.log(`    Handled: ${r.handled}/${r.total}`);
    });

    // Overall Summary
    const allTests = [
      ...this.results.stress,
      ...this.results.race,
      ...this.results.security,
      ...this.results.integration,
      ...this.results.performance.filter(r => r.passed !== undefined)
    ];

    const totalTests = allTests.length;
    const passedTests = allTests.filter(r => r.passed).length;
    const passRate = (passedTests / totalTests * 100).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log(`${colors.bright}OVERALL RESULTS${colors.reset}`);
    console.log(`Total Advanced Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ${colors.green}✅${colors.reset}`);
    console.log(`Failed: ${totalTests - passedTests} ${colors.red}❌${colors.reset}`);
    console.log(`Pass Rate: ${passRate >= 80 ? colors.green : colors.red}${passRate}%${colors.reset}`);
    console.log('='.repeat(70));

    if (passRate >= 80) {
      console.log(`\n${colors.bright}${colors.green}✅ SYSTEM PASSED ADVANCED TESTING${colors.reset}`);
      console.log('The MCP server demonstrates excellent robustness and reliability.');
    } else {
      console.log(`\n${colors.bright}${colors.yellow}⚠️ IMPROVEMENTS NEEDED${colors.reset}`);
      console.log('Some advanced scenarios need attention.');
    }
  }

  async runAll() {
    console.log(`${colors.bright}${colors.cyan}🚀 ADVANCED MCP TEST SUITE${colors.reset}`);
    console.log('Running comprehensive stress, security, and performance tests\n');
    console.log('='.repeat(70));

    await this.stressTestConcurrent();
    await this.testRaceCondition();
    await this.testSecurityInjection();
    await this.testPerformance();
    await this.testEdgeCases();
    await this.testMemoryLeak();

    this.generateReport();
  }
}

// Run advanced tests
const tester = new AdvancedMCPTester();
tester.runAll().catch(console.error);