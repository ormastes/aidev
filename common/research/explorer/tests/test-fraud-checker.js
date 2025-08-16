#!/usr/bin/env bun
/**
 * Fraud Checker Test Suite
 * Tests the enhanced fraud detection system
 */

const BASE_URL = 'http://localhost:3466';

async function testFraudChecker() {
  console.log('🔒 Testing Fraud Detection System\n');
  console.log('='*50 + '\n');
  
  const tests = [];
  
  // Test 1: Normal login
  console.log('1️⃣ Testing normal login...');
  const normal = await fetch(`${BASE_URL}/api/fraud/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      data: { attempts: 1 }
    })
  });
  const normalData = await normal.json();
  console.log(`   ✅ Score: ${normalData.score}, Risk: ${normalData.risk}, Blocked: ${normalData.blocked}`);
  tests.push(normalData.risk === 'low');
  
  // Test 2: Suspicious login (multiple attempts)
  console.log('2️⃣ Testing suspicious login (5 attempts)...');
  const suspicious = await fetch(`${BASE_URL}/api/fraud/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      data: { attempts: 5 }
    })
  });
  const suspiciousData = await suspicious.json();
  console.log(`   ✅ Score: ${suspiciousData.score}, Risk: ${suspiciousData.risk}, Triggers: ${suspiciousData.triggers.length}`);
  tests.push(suspiciousData.score > normalData.score);
  
  // Test 3: Rate limiting on fraud endpoint
  console.log('3️⃣ Testing rate limiting (12 rapid requests)...');
  const rapidRequests = [];
  for (let i = 0; i < 12; i++) {
    rapidRequests.push(
      fetch(`${BASE_URL}/api/fraud/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          data: { attempts: 1 }
        })
      })
    );
  }
  
  const responses = await Promise.all(rapidRequests);
  const rateLimited = responses.some(r => r.status === 429);
  console.log(`   ${rateLimited ? '✅' : '❌'} Rate limiting ${rateLimited ? 'triggered' : 'not triggered'}`);
  tests.push(rateLimited);
  
  // Test 4: Invalid action
  console.log('4️⃣ Testing invalid action validation...');
  const invalid = await fetch(`${BASE_URL}/api/fraud/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'invalid_action',
      data: {}
    })
  });
  console.log(`   ✅ Status: ${invalid.status} (should be 400)`);
  tests.push(invalid.status === 400);
  
  // Test 5: XSS in fraud data
  console.log('5️⃣ Testing XSS sanitization...');
  const xss = await fetch(`${BASE_URL}/api/fraud/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'login',
      data: { 
        username: '<script>alert(1)</script>',
        attempts: 1
      }
    })
  });
  const xssData = await xss.json();
  const xssClean = !JSON.stringify(xssData).includes('<script>');
  console.log(`   ${xssClean ? '✅' : '❌'} XSS ${xssClean ? 'sanitized' : 'not sanitized'}`);
  tests.push(xssClean);
  
  // Test 6: Password reset detection
  console.log('6️⃣ Testing password reset fraud detection...');
  const reset = await fetch(`${BASE_URL}/api/fraud/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'password_reset',
      data: { multipleAttempts: true }
    })
  });
  const resetData = await reset.json();
  console.log(`   ✅ Score: ${resetData.score}, Risk: ${resetData.risk}`);
  tests.push(resetData.score > 0);
  
  // Test 7: Stats endpoint (should require auth)
  console.log('7️⃣ Testing stats endpoint security...');
  const stats = await fetch(`${BASE_URL}/api/fraud/stats`);
  console.log(`   ✅ Status: ${stats.status} (should be 403 without auth)`);
  tests.push(stats.status === 403);
  
  // Test 8: Report endpoint
  console.log('8️⃣ Testing fraud report submission...');
  const report = await fetch(`${BASE_URL}/api/fraud/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      checkId: 'test-123',
      reportType: 'false_positive',
      reason: 'Test report'
    })
  });
  const reportData = await report.json();
  console.log(`   ✅ ${reportData.success ? 'Report submitted' : 'Report failed'}`);
  tests.push(reportData.success === true);
  
  // Summary
  console.log('\n' + '='*50);
  console.log('📊 FRAUD CHECKER TEST SUMMARY');
  console.log('='*50 + '\n');
  
  const passed = tests.filter(t => t).length;
  const total = tests.length;
  
  console.log(`Tests Passed: ${passed}/${total}`);
  console.log(`Success Rate: ${(passed/total * 100).toFixed(1)}%\n`);
  
  if (passed === total) {
    console.log('✅ All fraud checker tests passed!');
    console.log('🛡️ Fraud detection system is fully operational!');
  } else {
    console.log('⚠️ Some tests failed. Review the results above.');
  }
  
  return passed === total ? 0 : 1;
}

// Run tests
const exitCode = await testFraudChecker();
process.exit(exitCode);