#!/usr/bin/env tsx
/**
 * Comprehensive AI Dev Portal Demo
 * Tests both GUI Selector and Story Reports functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3256';
let accessToken = '';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function addResult(name: string, success: boolean, message: string, data?: any) {
  results.push({ name, success, message, data });
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (data && Object.keys(data).length > 0) {
    console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
  }
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const health = await response.json();
    
    if (health.status === 'healthy') {
      addResult('Health Check', true, 'Server is running and healthy', { uptime: health.uptime });
    } else {
      addResult('Health Check', false, 'Server health check failed', health);
    }
  } catch (error) {
    addResult('Health Check', false, `Connection failed: ${error}`);
  }
}

async function testWebInterface() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    
    if (html.includes('GUI Template Selector - AI Dev Portal')) {
      addResult('Web Interface', true, 'Portal HTML loads correctly');
      
      // Check for key components
      const hasReports = html.includes('Story Reports');
      const hasTemplates = html.includes("Templates");
      const hasAuth = html.includes('Login');
      
      addResult('UI Components', hasReports && hasTemplates && hasAuth, 
        `Components found: Reports(${hasReports}), Templates(${hasTemplates}), Auth(${hasAuth})`);
    } else {
      addResult('Web Interface', false, 'Portal HTML missing or corrupted');
    }
  } catch (error) {
    addResult('Web Interface', false, `Failed to load: ${error}`);
  }
}

async function testAuthentication() {
  try {
    // Test JWT login
    const loginResponse = await fetch(`${BASE_URL}/api/v2/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: "PLACEHOLDER" })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      accessToken = loginData.accessToken;
      
      addResult('JWT Authentication', true, `Login successful for user: ${loginData.user.username}`, 
        { tokenLength: loginData.accessToken.length });

      // Test token verification
      const verifyResponse = await fetch(`${BASE_URL}/api/v2/auth/verify`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        addResult('Token Verification', true, `Token verified for user: ${verifyData.user.username}`);
      } else {
        addResult('Token Verification', false, 'Token verification failed');
      }
    } else {
      addResult('JWT Authentication', false, 'Login failed with admin credentials');
    }

    // Test session-based auth fallback
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`);
    const sessionData = await sessionResponse.json();
    addResult('Session Auth', sessionData.authenticated || false, 
      `Session auth ${sessionData.authenticated ? 'active' : "inactive"}`);

  } catch (error) {
    addResult("Authentication", false, `Auth test failed: ${error}`);
  }
}

async function testTemplatesAPI() {
  try {
    const response = await fetch(`${BASE_URL}/api/templates`);
    const templates = await response.json();
    
    if (Array.isArray(templates) && templates.length > 0) {
      addResult('Templates API', true, `Found ${templates.length} templates`, 
        { templates: templates.map(t => t.name) });

      // Test template preview
      const previewResponse = await fetch(`${BASE_URL}/api/templates/${templates[0].id}/preview`);
      if (previewResponse.ok) {
        const preview = await previewResponse.json();
        addResult('Template Preview', true, `Preview loaded for ${templates[0].name}`, 
          { htmlLength: preview.html.length, cssLength: preview.css.length });
      } else {
        addResult('Template Preview', false, 'Preview loading failed');
      }
    } else {
      addResult('Templates API', false, 'No templates found or invalid response');
    }
  } catch (error) {
    addResult('Templates API', false, `Templates test failed: ${error}`);
  }
}

async function testStoryReportsAPI() {
  try {
    // Test basic reports endpoint (should work without auth for demo)
    const reportsResponse = await fetch(`${BASE_URL}/api/reports`);
    const reports = await reportsResponse.json();
    
    if (Array.isArray(reports)) {
      addResult('Story Reports API', true, `Found ${reports.length} reports`, 
        { reportTypes: reports.map(r => r.type) });

      // Test report details
      if (reports.length > 0) {
        const detailResponse = await fetch(`${BASE_URL}/api/reports/${reports[0].id}`);
        if (detailResponse.ok) {
          const details = await detailResponse.json();
          addResult('Report Details', true, `Details loaded for: ${details.title}`);
        } else {
          addResult('Report Details', false, 'Report details loading failed');
        }
      }

      // Test report statistics
      const statsResponse = await fetch(`${BASE_URL}/api/reports/stats`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        addResult('Report Statistics', true, `Stats loaded`, 
          { totalReports: stats.totalReports, byType: Object.keys(stats.byType) });
      } else {
        addResult('Report Statistics', false, 'Statistics loading failed');
      }

    } else {
      addResult('Story Reports API', false, `Invalid response: ${JSON.stringify(reports)}`);
    }
  } catch (error) {
    addResult('Story Reports API', false, `Reports test failed: ${error}`);
  }
}

async function testReportGeneration() {
  try {
    if (!accessToken) {
      addResult('Report Generation', false, 'No access token available for testing');
      return;
    }

    const generateResponse = await fetch(`${BASE_URL}/api/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        title: 'Demo Test Report',
        type: 'user-story',
        description: 'Automated test report generation',
        storyPath: 'layer/themes/test-as-manual/user-stories/'
      })
    });

    if (generateResponse.ok) {
      const newReport = await generateResponse.json();
      addResult('Report Generation', true, `Report created: ${newReport.title}`, 
        { id: newReport.id, status: newReport.status });
      
      // Wait a bit and check if status updates
      await delay(4000);
      
      const statusResponse = await fetch(`${BASE_URL}/api/reports/${newReport.id}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      
      if (statusResponse.ok) {
        const updatedReport = await statusResponse.json();
        addResult('Report Status Update', true, `Report status: ${updatedReport.status}`);
      }
    } else {
      const error = await generateResponse.json();
      addResult('Report Generation', false, `Generation failed: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    addResult('Report Generation', false, `Generation test failed: ${error}`);
  }
}

async function testGUISelector() {
  try {
    if (!accessToken) {
      addResult('GUI Selector', false, 'No access token available for template selection');
      return;
    }

    // Create an app first
    const appResponse = await fetch(`${BASE_URL}/api/apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        name: 'Demo App',
        description: 'Test application for demo',
        path: '/demo/test-app',
        port: 3333
      })
    });

    let appId = 1; // Default fallback
    if (appResponse.ok) {
      const app = await appResponse.json();
      appId = app.appId || app.id || 1;
      addResult('App Creation', true, `App created with ID: ${appId}`);
    } else {
      addResult('App Creation', false, 'App creation failed, using default ID');
    }

    // Test template selection
    const selectionResponse = await fetch(`${BASE_URL}/api/selections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        templateId: 'modern-01',
        projectName: 'Demo Project',
        comments: 'Automated demo selection',
        appId: appId
      })
    });

    if (selectionResponse.ok) {
      const selection = await selectionResponse.json();
      addResult('Template Selection', true, `Template selected successfully`);
      
      // Test requirements addition
      const reqResponse = await fetch(`${BASE_URL}/api/requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          type: "functional",
          description: 'Demo requirement for testing',
          priority: 'medium',
          selectionId: selection.id || 1
        })
      });

      if (reqResponse.ok) {
        addResult('Requirements Management', true, 'Requirement added successfully');
      } else {
        addResult('Requirements Management', false, 'Requirement addition failed');
      }

    } else {
      const error = await selectionResponse.json();
      addResult('Template Selection', false, `Selection failed: ${error.error || 'Unknown error'}`);
    }
  } catch (error) {
    addResult('GUI Selector', false, `GUI selector test failed: ${error}`);
  }
}

async function testDataExport() {
  try {
    // Test requirements export
    const exportResponse = await fetch(`${BASE_URL}/api/requirements/export?format=json`, {
      headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}
    });

    if (exportResponse.ok) {
      const exportData = await exportResponse.json();
      addResult('Data Export', true, `Export successful`, 
        { requirementsCount: exportData.requirements?.length || 0 });
    } else {
      addResult('Data Export', false, 'Requirements export failed');
    }

    // Test report download
    const reportsResponse = await fetch(`${BASE_URL}/api/reports`);
    if (reportsResponse.ok) {
      const reports = await reportsResponse.json();
      if (reports.length > 0) {
        const downloadResponse = await fetch(`${BASE_URL}/api/reports/${reports[0].id}/download`, {
          headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}
        });
        
        if (downloadResponse.ok) {
          addResult('Report Download', true, 'Report download successful');
        } else {
          addResult('Report Download', false, 'Report download failed');
        }
      }
    }
  } catch (error) {
    addResult('Data Export', false, `Export test failed: ${error}`);
  }
}

async function generateSummaryReport() {
  console.log('\n' + '='.repeat(60));
  console.log('                AI DEV PORTAL DEMO SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const successRateNum = (successful / total) * 100;
  const successRate = successRateNum.toFixed(1);
  
  console.log(`\n📊 Overall Results: ${successful}/${total} tests passed (${successRate}%)\n`);
  
  // Group results by category
  const categories = {
    "Infrastructure": ['Health Check', 'Web Interface', 'UI Components'],
    "Authentication": ['JWT Authentication', 'Token Verification', 'Session Auth'],
    "Templates": ['Templates API', 'Template Preview'],
    'Story Reports': ['Story Reports API', 'Report Details', 'Report Statistics', 'Report Generation', 'Report Status Update'],
    'GUI Selector': ['App Creation', 'Template Selection', 'Requirements Management'],
    'Data Management': ['Data Export', 'Report Download']
  };

  for (const [category, testNames] of Object.entries(categories)) {
    const categoryResults = results.filter(r => testNames.includes(r.name));
    const categorySuccess = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    
    if (categoryTotal > 0) {
      const categoryRate = ((categorySuccess / categoryTotal) * 100).toFixed(0);
      const status = categorySuccess === categoryTotal ? '✅' : 
                    categorySuccess > categoryTotal / 2 ? '⚠️' : '❌';
      
      console.log(`${status} ${category}: ${categorySuccess}/${categoryTotal} (${categoryRate}%)`);
      
      // Show failed tests
      const failed = categoryResults.filter(r => !r.success);
      if (failed.length > 0) {
        failed.forEach(f => console.log(`   ❌ ${f.name}: ${f.message}`));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🚀 PORTAL ACCESS: http://localhost:3256');
  console.log('🔑 LOGIN: admin / admin123');
  
  if (successRateNum >= 80) {
    console.log('🎉 Portal is working well! Most features are functional.');
  } else if (successRateNum >= 60) {
    console.log('⚠️  Portal has some issues but core features work.');
  } else {
    console.log('❌ Portal needs significant fixes before use.');
  }
  
  console.log('='.repeat(60));
}

async function runComprehensiveDemo() {
  console.log('🚀 Starting Comprehensive AI Dev Portal Demo...\n');

  await testHealthCheck();
  await delay(500);
  
  await testWebInterface();
  await delay(500);
  
  await testAuthentication();
  await delay(1000);
  
  await testTemplatesAPI();
  await delay(500);
  
  await testStoryReportsAPI();
  await delay(500);
  
  await testReportGeneration();
  await delay(1000);
  
  await testGUISelector();
  await delay(1000);
  
  await testDataExport();
  await delay(500);

  await generateSummaryReport();
}

// Run the demo
runComprehensiveDemo().catch(console.error);