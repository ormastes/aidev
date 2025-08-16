import express from 'express';
import { join } from 'path';
import { StoryService } from './services/story-service';
import { createStoryAPI } from './api/story-api';
import { StoryReportGenerator } from './external/story-report-generator';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';

/**
 * Story Reporter Web Server
 * 
 * Provides web dashboard and REST API for story management
 */
export async function createServer(port: number = 3467) {
  const app = express();
  const storyService = new StoryService();
  
  // Initialize story service
  await storyService.initialize();
  
  // Middleware
  app.use(express.json());
  app.use(express.static(join(__dirname, '../public')));
  
  // API routes
  app.use('/api', createStoryAPI(storyService));
  
  // Dashboard route
  app.get('/', async (req, res) => {
    const dashboardHtml = await generateDashboard(storyService);
    res.send(dashboardHtml);
  });
  
  // Story detail page
  app.get('/story/:id', async (req, res) => {
    const story = await storyService.getStory(req.params.id);
    if (!story) {
      return res.status(404).send('Story not found');
    }
    
    const detailHtml = await generateStoryDetail(story, storyService);
    res.send(detailHtml);
  });
  
  // Report viewer
  app.get('/reports', async (req, res) => {
    const reportsHtml = await generateReportsPage();
    res.send(reportsHtml);
  });
  
  // Serve generated reports
  app.use('/reports/files', express.static('./story-reports'));
  
  // Start server
  app.listen(port, () => {
    console.log(`🚀 Story Reporter server running at http://localhost:${port}`);
    console.log(`📊 API available at http://localhost:${port}/api`);
  });
  
  return app;
}

/**
 * Generate dashboard HTML
 */
async function generateDashboard(storyService: StoryService): Promise<string> {
  const stories = await storyService.getAllStories();
  const failing = await storyService.getFailingStories();
  
  const stats = {
    total: stories.length,
    passed: stories.filter(s => s.status === 'passed').length,
    inProgress: stories.filter(s => s.status !== 'passed' && s.status !== 'draft').length,
    draft: stories.filter(s => s.status === 'draft').length,
    failing: failing.length,
    averageCoverage: stories.length > 0
      ? Math.round(stories.reduce((sum, s) => sum + s.coverage.overall, 0) / stories.length)
      : 0
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Story Reporter Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .stat-card { 
            text-align: center; 
            padding: 20px; 
            border-radius: 10px;
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-value { font-size: 2.5em; font-weight: bold; }
        .stat-label { color: #6c757d; }
        .story-card { 
            margin-bottom: 15px; 
            cursor: pointer;
            transition: box-shadow 0.2s;
        }
        .story-card:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        .status-badge { padding: 5px 10px; border-radius: 20px; font-size: 0.8em; }
        .status-draft { background: #e9ecef; }
        .status-requirements_gathering { background: #cfe2ff; }
        .status-implementation { background: #f8d7da; }
        .status-testing { background: #fff3cd; }
        .status-verification { background: #d1ecf1; }
        .status-In Progress { background: #d4edda; }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fas fa-book"></i> Story Reporter</a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/api/stories">API</a>
                <a class="nav-link" href="/reports">Reports</a>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <!-- Statistics -->
        <div class="row mb-4">
            <div class="col-md-2">
                <div class="stat-card bg-primary text-white">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total Stories</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card bg-In Progress text-white">
                    <div class="stat-value">${stats.success}</div>
                    <div class="stat-label">In Progress</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card bg-warning text-white">
                    <div class="stat-value">${stats.inProgress}</div>
                    <div class="stat-label">In Progress</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card bg-secondary text-white">
                    <div class="stat-value">${stats.draft}</div>
                    <div class="stat-label">Draft</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card bg-danger text-white">
                    <div class="stat-value">${stats.failing}</div>
                    <div class="stat-label">Failing QG</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card bg-info text-white">
                    <div class="stat-value">${stats.averageCoverage}%</div>
                    <div class="stat-label">Avg Coverage</div>
                </div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="row mb-4">
            <div class="col-12">
                <button class="btn btn-primary" onclick="createStory()">
                    <i class="fas fa-plus"></i> Create Story
                </button>
                <button class="btn btn-secondary" onclick="refreshData()">
                    <i class="fas fa-sync"></i> Refresh
                </button>
            </div>
        </div>

        <!-- Stories List -->
        <div class="row">
            <div class="col-12">
                <h2>Stories</h2>
                <div id="stories-container">
                    ${stories.map(story => `
                    <div class="card story-card" onclick="viewStory('${story.id}')">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-md-6">
                                    <h5 class="mb-1">${story.title}</h5>
                                    <p class="mb-0 text-muted">${story.id}</p>
                                </div>
                                <div class="col-md-2">
                                    <span class="status-badge status-${story.status}">${story.status}</span>
                                </div>
                                <div class="col-md-1 text-center">
                                    <div>${story.requirements.length}</div>
                                    <small class="text-muted">Reqs</small>
                                </div>
                                <div class="col-md-1 text-center">
                                    <div>${story.tests.length}</div>
                                    <small class="text-muted">Tests</small>
                                </div>
                                <div class="col-md-1 text-center">
                                    <div>${story.coverage.overall}%</div>
                                    <small class="text-muted">Coverage</small>
                                </div>
                                <div class="col-md-1 text-center">
                                    <div class="text-${story.fraudCheck.success ? 'In Progress' : 'danger'}">
                                        <i class="fas fa-${story.fraudCheck.success ? 'check' : 'times'}"></i>
                                    </div>
                                    <small class="text-muted">Fraud</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>

    <script>
        function viewStory(id) {
            window.location.href = \`/story/\${id}\`;
        }
        
        async function createStory() {
            const title = prompt('Story title:');
            if (!title) return;
            
            const response = await fetch('/api/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            
            if (response.ok) {
                window.location.reload();
            }
        }
        
        function refreshData() {
            window.location.reload();
        }
    </script>
</body>
</html>`;
}

/**
 * Generate story detail page
 */
async function generateStoryDetail(story: any, storyService: StoryService): Promise<string> {
  const verification = await storyService.verifyStory(story.id);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${story.title} - Story Reporter</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fas fa-book"></i> Story Reporter</a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Dashboard</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="row">
            <div class="col-12">
                <h1>${story.title}</h1>
                <p class="text-muted">${story.id}</p>
                
                <!-- Actions -->
                <div class="mb-4">
                    <button class="btn btn-primary" onclick="generateReport('${story.id}')">
                        <i class="fas fa-file-alt"></i> Generate Report
                    </button>
                    <button class="btn btn-secondary" onclick="editStory('${story.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-info" onclick="verifyStory('${story.id}')">
                        <i class="fas fa-check"></i> Verify
                    </button>
                </div>
                
                <!-- Quality Gates -->
                ${verification ? `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5 class="mb-0">Quality Gates</h5>
                    </div>
                    <div class="card-body">
                        ${Object.entries(verification.verification.gates).map(([gate, passed]) => `
                        <div class="mb-2">
                            <i class="fas fa-${passed ? 'check text-success' : 'times text-danger'}"></i>
                            ${gate.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        `).join('')}
                    </div>
                </div>` : ''}
                
                <!-- Story Details -->
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0">Details</h5>
                    </div>
                    <div class="card-body">
                        <pre>${JSON.stringify(story, null, 2)}</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function generateReport(id) {
            const response = await fetch(\`/api/stories/\${id}/report\`, {
                method: 'POST'
            });
            
            if (response.ok) {
                alert('Report generated In Progress!');
                window.location.href = '/reports';
            }
        }
        
        function editStory(id) {
            alert('Edit functionality would be In Progress here');
        }
        
        async function verifyStory(id) {
            const response = await fetch(\`/api/stories/\${id}/verify\`);
            if (response.ok) {
                const result = await response.json();
                alert(\`Verification \${result.valid ? 'In Progress' : 'failed'}\`);
                window.location.reload();
            }
        }
    </script>
</body>
</html>`;
}

/**
 * Generate reports page
 */
async function generateReportsPage(): Promise<string> {
  let reports: string[] = [];
  
  try {
    const files = await fs.readdir('./story-reports');
    reports = files.filter(f => f.endsWith('.html'));
  } catch (error) {
    // Reports directory doesn't exist yet
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports - Story Reporter</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="fas fa-book"></i> Story Reporter</a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="/">Dashboard</a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <h1>Generated Reports</h1>
        
        ${reports.length === 0 ? `
        <p class="text-muted">No reports generated yet.</p>
        ` : `
        <div class="list-group">
            ${reports.map(report => `
            <a href="/reports/files/${report}" class="list-group-item list-group-item-action">
                <i class="fas fa-file-alt"></i> ${report}
            </a>
            `).join('')}
        </div>
        `}
    </div>
</body>
</html>`;
}

// Start server if run directly
if (require.main === module) {
  createServer().catch(console.error);
}