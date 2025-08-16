#!/usr/bin/env node

import { Command } from "commander";
import { StoryService } from '../services/story-service';
import { StoryReportGenerator } from '../external/story-report-generator';
import { 
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

  StoryStatus, 
  RequirementType, 
  RequirementPriority,
  TeamRole,
  TestType,
  TestStatus
} from '../domain/story';
import * as inquirer from "inquirer";
import * as chalk from 'chalk';
import * as Table from 'cli-table3';
import * as ora from 'ora';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

const program = new Command();
const storyService = new StoryService();
const reportGenerator = new StoryReportGenerator();

// CLI configuration
interface CliConfig {
  theme: 'default' | 'dark' | 'light' | "colorblind";
  outputFormat: 'table' | 'json' | 'compact';
  colorEnabled: boolean;
  verbosity: 'quiet' | 'normal' | 'verbose';
}

let cliConfig: CliConfig = {
  theme: 'default',
  outputFormat: 'table',
  colorEnabled: true,
  verbosity: 'normal'
};

// Load CLI config
async function loadConfig() {
  try {
    const configPath = path.join(process.env.HOME || '.', '.story-reporter-cli.json');
    const configData = await fileAPI.readFile(configPath, 'utf-8');
    cliConfig = { ...cliConfig, ...JSON.parse(configData) };
  } catch {
    // Use defaults if config doesn't exist
  }
}

// Save CLI config
async function saveConfig() {
  try {
    const configPath = path.join(process.env.HOME || '.', '.story-reporter-cli.json');
    await fileAPI.createFile(configPath, JSON.stringify(cliConfig, { type: FileType.TEMPORARY }));
  } catch (error) {
    console.error(chalk.red('Failed to save config:'), error);
  }
}

// Initialize service on startup
async function initialize() {
  try {
    await loadConfig();
    await storyService.initialize();
    if (cliConfig.verbosity !== 'quiet') {
      console.log(chalk.green('✓ Story Reporter initialized'));
    }
  } catch (error) {
    console.error(chalk.red('Failed to initialize:'), error);
    process.exit(1);
  }
}

// Format helpers
async function formatPercentage(value: number): string {
  const color = value >= 80 ? 'green' : value >= 60 ? 'yellow' : 'red';
  return chalk[color](`${value}%`);
}

async function formatStatus(status: string): string {
  const statusColors: Record<string, string> = {
    'success': 'green',
    'passed': 'green',
    "completed": 'green',
    'in_progress': 'yellow',
    'testing': 'yellow',
    "implementation": 'yellow',
    'failed': 'red',
    'draft': 'gray',
    'pending': 'gray'
  };
  const color = statusColors[status] || 'white';
  return chalk[color](status);
}

async function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

program
  .name('story-reporter')
  .description('Agile BDD Story Management and Reporting Tool with Full Web GUI Feature Parity')
  .version('2.0.0')
  .option('-q, --quiet', 'Quiet mode - minimal output')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-color', 'Disable colored output')
  .hook("preAction", async (thisCommand) => {
    if (thisCommand.opts().quiet) cliConfig.verbosity = 'quiet';
    if (thisCommand.opts().verbose) cliConfig.verbosity = 'verbose';
    if (thisCommand.opts().noColor) {
      cliConfig.colorEnabled = false;
      chalk.level = 0;
    }
  });

// Dashboard command - NEW
program
  .command("dashboard")
  .description('Display dashboard with statistics and overview')
  .option('-r, --refresh <seconds>', 'Auto-refresh interval in seconds')
  .action(async (options) => {
    await initialize();
    
    const displayDashboard = async () => {
      try {
        const stories = await storyService.getAllStories();
        const failing = await storyService.getFailingStories();
        
        // Calculate statistics
        const stats = {
          total: stories.length,
          passed: stories.filter(s => s.status === 'passed' || s.status === 'success').length,
          inProgress: stories.filter(s => ["implementation", 'testing', "verification"].includes(s.status)).length,
          draft: stories.filter(s => s.status === 'draft').length,
          failing: failing.length,
          avgCoverage: stories.length > 0
            ? Math.round(stories.reduce((sum, s) => sum + (s.coverage?.overall || 0), 0) / stories.length)
            : 0,
          avgFraudScore: stories.length > 0
            ? Math.round(stories.reduce((sum, s) => sum + (s.fraudCheck?.score || 0), 0) / stories.length)
            : 0
        };
        
        console.clear();
        console.log(chalk.bold.cyan('\n📊 Story Reporter Dashboard\n'));
        
        // Statistics cards
        const statsTable = new Table({
          head: ['Metric', 'Value', 'Status'],
          colWidths: [20, 15, 15],
          style: { head: ['cyan'] }
        });
        
        statsTable.push(
          ['Total Stories', stats.total.toString(), stats.total > 0 ? '✓' : '⚠'],
          ['Passed', stats.passed.toString(), formatStatus('success')],
          ['In Progress', stats.inProgress.toString(), formatStatus('in_progress')],
          ['Draft', stats.draft.toString(), formatStatus('draft')],
          ['Failing QG', stats.failing.toString(), stats.failing === 0 ? '✓' : '⚠'],
          ['Avg Coverage', formatPercentage(stats.avgCoverage), stats.avgCoverage >= 80 ? '✓' : '⚠'],
          ['Avg Fraud Score', stats.avgFraudScore.toString(), stats.avgFraudScore >= 70 ? '✓' : '⚠']
        );
        
        console.log(statsTable.toString());
        
        // Recent stories
        if (stories.length > 0) {
          console.log(chalk.bold.cyan('\n📝 Recent Stories:\n'));
          
          const recentTable = new Table({
            head: ['ID', 'Title', 'Status', "Coverage", 'Updated'],
            colWidths: [25, 35, 15, 12, 15],
            style: { head: ['cyan'] }
          });
          
          stories.slice(0, 5).forEach(story => {
            recentTable.push([
              story.id.substring(0, 20) + '...',
              story.title.substring(0, 30) + (story.title.length > 30 ? '...' : ''),
              formatStatus(story.status),
              formatPercentage(story.coverage?.overall || 0),
              formatDate(story.updatedAt)
            ]);
          });
          
          console.log(recentTable.toString());
        }
        
        // Failing stories alert
        if (failing.length > 0) {
          console.log(chalk.bold.red('\n⚠ Stories Failing Quality Gates:\n'));
          failing.slice(0, 3).forEach(({ story, issues }) => {
            console.log(chalk.red(`  • ${story.title}`));
            issues.slice(0, 2).forEach(issue => 
              console.log(chalk.gray(`    - ${issue}`))
            );
          });
        }
        
        if (options.refresh) {
          console.log(chalk.gray(`\n↻ Refreshing every ${options.refresh} seconds... (Ctrl+C to stop)`));
        }
      } catch (error) {
        console.error(chalk.red('Failed to load dashboard:'), error);
      }
    };
    
    await displayDashboard();
    
    // Auto-refresh if requested
    if (options.refresh) {
      const interval = parseInt(options.refresh) * 1000;
      setInterval(displayDashboard, interval);
    }
  });

// Browse command - NEW
program
  .command('browse')
  .description('Browse and filter stories with advanced search')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --project <project>', 'Filter by project')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('--min-coverage <percent>', 'Minimum coverage percentage')
  .option('--max-coverage <percent>', 'Maximum coverage percentage')
  .option('--search <text>', 'Search in title and description')
  .option('--sort <field>', 'Sort by field (title|status|coverage|updated)', 'updated')
  .option('--reverse', 'Reverse sort order')
  .option('--limit <number>', 'Limit results', '20')
  .option('--export <format>', 'Export results (json|csv|html)')
  .action(async (options) => {
    await initialize();
    
    const spinner = ora('Loading stories...').start();
    
    try {
      let stories = await storyService.getAllStories();
      
      // Apply filters
      if (options.status) {
        stories = stories.filter(s => s.status === options.status);
      }
      
      if (options.project) {
        stories = stories.filter(s => s.metadata?.project === options.project);
      }
      
      if (options.tags) {
        const tags = options.tags.split(',').map((t: string) => t.trim());
        stories = stories.filter(s => 
          tags.some(tag => s.metadata?.tags?.includes(tag))
        );
      }
      
      if (options.minCoverage) {
        const min = parseFloat(options.minCoverage);
        stories = stories.filter(s => (s.coverage?.overall || 0) >= min);
      }
      
      if (options.maxCoverage) {
        const max = parseFloat(options.maxCoverage);
        stories = stories.filter(s => (s.coverage?.overall || 0) <= max);
      }
      
      if (options.search) {
        const search = options.search.toLowerCase();
        stories = stories.filter(s => 
          s.title.toLowerCase().includes(search) ||
          s.description?.toLowerCase().includes(search) ||
          s.id.toLowerCase().includes(search)
        );
      }
      
      // Sort results
      const sortField = options.sort;
      stories.sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case "coverage":
            comparison = (a.coverage?.overall || 0) - (b.coverage?.overall || 0);
            break;
          case 'updated':
          default:
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        }
        return options.reverse ? -comparison : comparison;
      });
      
      // Limit results
      const limit = parseInt(options.limit);
      if (limit > 0) {
        stories = stories.slice(0, limit);
      }
      
      spinner.stop();
      
      // Export if requested
      if (options.export) {
        await exportStories(stories, options.export);
        console.log(chalk.green(`✓ Exported ${stories.length} stories to ${options.export} format`));
        return;
      }
      
      // Display results
      console.log(chalk.cyan(`\n📚 Stories (${stories.length} results):\n`));
      
      if (stories.length === 0) {
        console.log(chalk.yellow('No stories match your filters'));
        return;
      }
      
      const table = new Table({
        head: ['ID', 'Title', 'Status', "Coverage", 'Fraud', 'Updated'],
        colWidths: [20, 30, 15, 10, 10, 15],
        style: { head: ['cyan'] }
      });
      
      stories.forEach(story => {
        table.push([
          story.id.substring(0, 18),
          story.title.substring(0, 28),
          formatStatus(story.status),
          formatPercentage(story.coverage?.overall || 0),
          story.fraudCheck?.success ? '✓' : '✗',
          formatDate(story.updatedAt)
        ]);
      });
      
      console.log(table.toString());
      
      // Summary statistics
      if (stories.length > 0) {
        const avgCoverage = Math.round(
          stories.reduce((sum, s) => sum + (s.coverage?.overall || 0), 0) / stories.length
        );
        const passedCount = stories.filter(s => s.status === 'success' || s.status === 'passed').length;
        
        console.log(chalk.cyan('\n📊 Summary:'));
        console.log(`  Average Coverage: ${formatPercentage(avgCoverage)}`);
        console.log(`  Success Rate: ${Math.round(passedCount / stories.length * 100)}%`);
        console.log(`  Total Stories: ${stories.length}`);
      }
      
      // Show filter summary
      const activeFilters = [];
      if (options.status) activeFilters.push(`status=${options.status}`);
      if (options.project) activeFilters.push(`project=${options.project}`);
      if (options.tags) activeFilters.push(`tags=${options.tags}`);
      if (options.search) activeFilters.push(`search="${options.search}"`);
      
      if (activeFilters.length > 0) {
        console.log(chalk.gray(`\nActive filters: ${activeFilters.join(', ')}`));
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Failed to browse stories:'), error);
    }
  });

// Settings command - NEW
program
  .command("settings")
  .description('Manage CLI settings and preferences')
  .option('--set <key=value>', 'Set a configuration value')
  .option('--get <key>', 'Get a configuration value')
  .option('--list', 'List all settings')
  .option('--reset', 'Reset to default settings')
  .action(async (options) => {
    await loadConfig();
    
    if (options.reset) {
      cliConfig = {
        theme: 'default',
        outputFormat: 'table',
        colorEnabled: true,
        verbosity: 'normal'
      };
      await saveConfig();
      console.log(chalk.green('✓ Settings reset to defaults'));
      return;
    }
    
    if (options.set) {
      const [key, value] = options.set.split('=');
      if (key in cliConfig) {
        (cliConfig as any)[key] = value === 'true' ? true : value === 'false' ? false : value;
        await saveConfig();
        console.log(chalk.green(`✓ Set ${key} = ${value}`));
      } else {
        console.error(chalk.red(`Unknown setting: ${key}`));
        console.log('Valid settings:', Object.keys(cliConfig).join(', '));
      }
      return;
    }
    
    if (options.get) {
      if (options.get in cliConfig) {
        console.log(`${options.get} = ${(cliConfig as any)[options.get]}`);
      } else {
        console.error(chalk.red(`Unknown setting: ${options.get}`));
      }
      return;
    }
    
    // List all settings
    console.log(chalk.cyan('\n⚙️  Current Settings:\n'));
    
    const table = new Table({
      head: ['Setting', 'Value', "Description"],
      colWidths: [20, 20, 40],
      style: { head: ['cyan'] }
    });
    
    const descriptions: Record<string, string> = {
      theme: 'Color theme for output',
      outputFormat: 'Default output format',
      colorEnabled: 'Enable/disable colored output',
      verbosity: 'Output verbosity level'
    };
    
    Object.entries(cliConfig).forEach(([key, value]) => {
      table.push([key, String(value), descriptions[key] || '']);
    });
    
    console.log(table.toString());
    
    // Show server info
    console.log(chalk.cyan('\n🌐 Server Information:\n'));
    console.log(`  API Endpoint: http://localhost:3467/api`);
    console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`  Config Path: ${path.join(process.env.HOME || '.', '.story-reporter-cli.json')}`);
  });

// Export helper function
async function exportStories(stories: any[], format: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `stories-export-${timestamp}.${format}`;
  
  let content = '';
  
  switch (format) {
    case 'json':
      content = JSON.stringify(stories, null, 2);
      break;
      
    case 'csv':
      const headers = ['ID', 'Title', 'Status', "Coverage", 'Created', 'Updated'];
      const rows = stories.map(s => [
        s.id,
        `"${s.title.replace(/"/g, '""')}"`,
        s.status,
        s.coverage?.overall || 0,
        s.createdAt.toISOString(),
        s.updatedAt.toISOString()
      ]);
      content = [headers.join(',')]
        .concat(rows.map(r => r.join(',')))
        .join('\n');
      break;
      
    case 'html':
      content = `<!DOCTYPE html>
<html>
<head>
  <title>Stories Export</title>
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Stories Export - ${new Date().toLocaleDateString()}</h1>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Status</th>
        <th>Coverage</th>
        <th>Updated</th>
      </tr>
    </thead>
    <tbody>
      ${stories.map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${s.title}</td>
        <td>${s.status}</td>
        <td>${s.coverage?.overall || 0}%</td>
        <td>${formatDate(s.updatedAt)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;
      break;
      
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
  
  await fileAPI.createFile(filename, content);
  return filename;
}

// Create story command
program
  .command('create <title>')
  .description('Create a new story')
  .option('-d, { type: FileType.TEMPORARY })
  .option('-p, --project <project>', 'Project name')
  .option('-t, --tags <tags>', 'Comma-separated tags')
  .action(async (title, options) => {
    await initialize();
    
    try {
      const story = await storyService.createStory(title, options.description || '');
      
      if (options.project) {
        story.metadata.project = options.project;
      }
      
      if (options.tags) {
        story.metadata.tags = options.tags.split(',').map((t: string) => t.trim());
      }
      
      await storyService.updateStory(story.id, story);
      
      console.log(chalk.green(`🔄 Story created: ${story.id}`));
      console.log(chalk.gray(`  Title: ${story.title}`));
      console.log(chalk.gray(`  Status: ${story.status}`));
    } catch (error) {
      console.error(chalk.red('Failed to create story:'), error);
    }
  });

// List stories command
program
  .command('list')
  .description('List all stories')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --project <project>', 'Filter by project')
  .option('--failed', 'Show only stories failing quality gates')
  .action(async (options) => {
    await initialize();
    
    try {
      let stories;
      
      if (options.failed) {
        const failing = await storyService.getFailingStories();
        console.log(chalk.yellow(`\nStories Failing Quality Gates (${failing.length}):\n`));
        
        failing.forEach(({ story, issues }) => {
          console.log(chalk.red(`● ${story.id} - ${story.title}`));
          console.log(chalk.gray(`  Status: ${story.status}`));
          console.log(chalk.red(`  Issues:`));
          issues.forEach(issue => console.log(chalk.red(`    - ${issue}`)));
          console.log();
        });
        return;
      }
      
      if (options.status || options.project) {
        stories = await storyService.searchStories({
          status: options.status,
          project: options.project
        });
      } else {
        stories = await storyService.getAllStories();
      }
      
      console.log(chalk.cyan(`\nStories (${stories.length}):\n`));
      
      stories.forEach(story => {
        const statusColor = story.status === StoryStatus.success ? 'green' : 
                           story.status === StoryStatus.VERIFICATION ? 'yellow' : 'gray';
        
        console.log(`● ${story.id} - ${story.title}`);
        console.log(chalk[statusColor](`  Status: ${story.status}`));
        console.log(chalk.gray(`  Created: ${story.createdAt.toLocaleDateString()}`));
        if (story.metadata.project) {
          console.log(chalk.gray(`  Project: ${story.metadata.project}`));
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('Failed to list stories:'), error);
    }
  });

// View story command - ENHANCED with detailed terminal display
program
  .command('view <storyId>')
  .description('View detailed story information in terminal')
  .option('--json', 'Output as JSON')
  .option('--full', 'Show all details including metadata')
  .action(async (storyId, options) => {
    await initialize();
    
    try {
      const story = await storyService.getStory(storyId);
      if (!story) {
        console.error(chalk.red(`Story not found: ${storyId}`));
        return;
      }
      
      // JSON output mode
      if (options.json) {
        console.log(JSON.stringify(story, null, 2));
        return;
      }
      
      // Enhanced terminal display
      console.clear();
      console.log(chalk.bold.cyan('\n📄 Story Details\n'));
      
      // Header table
      const headerTable = new Table({
        colWidths: [20, 60],
        style: { head: [], border: [] }
      });
      
      headerTable.push(
        [chalk.gray('ID:'), story.id],
        [chalk.gray('Title:'), chalk.bold(story.title)],
        [chalk.gray('Status:'), formatStatus(story.status)],
        [chalk.gray('Description:'), story.description || chalk.gray('No description')],
        [chalk.gray('Created:'), formatDate(story.createdAt) + ' ' + story.createdAt.toLocaleTimeString()],
        [chalk.gray('Updated:'), formatDate(story.updatedAt) + ' ' + story.updatedAt.toLocaleTimeString()]
      );
      
      if (story.metadata?.project) {
        headerTable.push([chalk.gray('Project:'), story.metadata.project]);
      }
      
      if (story.metadata?.tags?.length > 0) {
        headerTable.push([chalk.gray('Tags:'), story.metadata.tags.join(', ')]);
      }
      
      console.log(headerTable.toString());
      
      // Statistics
      console.log(chalk.bold.cyan('\n📊 Statistics\n'));
      
      const statsTable = new Table({
        head: ['Metric', 'Count', 'Details'],
        colWidths: [20, 10, 40],
        style: { head: ['cyan'] }
      });
      
      statsTable.push(
        ["Requirements", story.requirements?.length || 0, 
         story.requirements?.length > 0 ? 
         `${story.requirements.filter((r: any) => r.priority === 'HIGH').length} high priority` : '-'],
        ['User Stories', story.userStories?.length || 0, '-'],
        ['Tests', story.tests?.length || 0,
         story.tests?.length > 0 ?
         `${story.tests.filter((t: any) => t.status === 'passed').length} passed` : '-'],
        ["Comments", story.comments?.length || 0,
         story.comments?.length > 0 ?
         `Latest: ${formatDate(story.comments[story.comments.length - 1].timestamp)}` : '-']
      );
      
      console.log(statsTable.toString());
      
      // Coverage details
      console.log(chalk.bold.cyan('\n🎯 Coverage\n'));
      
      const coverageTable = new Table({
        head: ['Type', "Coverage", 'Status'],
        colWidths: [20, 15, 30],
        style: { head: ['cyan'] }
      });
      
      const coverage = story.coverage || {};
      coverageTable.push(
        ['Overall', formatPercentage(coverage.overall || 0), 
         coverage.overall >= 80 ? '✓ Excellent' : coverage.overall >= 60 ? '⚠ Good' : '✗ Needs improvement'],
        ['Unit Tests', formatPercentage(coverage.unit || 0), '-'],
        ["Integration", formatPercentage(coverage.integration || 0), '-'],
        ['E2E Tests', formatPercentage(coverage.e2e || 0), '-']
      );
      
      console.log(coverageTable.toString());
      
      // Fraud check
      if (story.fraudCheck) {
        console.log(chalk.bold.cyan('\n🔍 Fraud Check\n'));
        
        const fraudTable = new Table({
          colWidths: [20, 60],
          style: { head: [], border: [] }
        });
        
        fraudTable.push(
          [chalk.gray('Status:'), story.fraudCheck.success ? chalk.green('✓ Passed') : chalk.red('✗ Failed')],
          [chalk.gray('Risk Level:'), story.fraudCheck.riskLevel || 'Unknown'],
          [chalk.gray('Score:'), story.fraudCheck.score ? `${story.fraudCheck.score}/100` : 'N/A']
        );
        
        if (story.fraudCheck.issues?.length > 0) {
          fraudTable.push([chalk.gray('Issues:'), story.fraudCheck.issues.join('\n')]);
        }
        
        console.log(fraudTable.toString());
      }
      
      const verification = await storyService.verifyStory(storyId);
      if (verification) {
        console.log(chalk.cyan('\n=== Quality Gates ===\n'));
        const gates = verification.verification.gates;
        
        const gatesTable = new Table({
          head: ['Quality Gate', 'Status', 'Details'],
          colWidths: [25, 10, 35],
          style: { head: ['cyan'] }
        });
        
        gatesTable.push(
          ['Requirements Defined', gates.requirementsDefined ? '✓' : '✗',
           gates.requirementsDefined ? 'All requirements documented' : 'Missing requirements'],
          ['Tests Written', gates.testsWritten ? '✓' : '✗',
           gates.testsWritten ? 'Test suite complete' : 'Tests incomplete'],
          ['Coverage Achieved', gates.coverageAchieved ? '✓' : '✗',
           gates.coverageAchieved ? 'Meets threshold' : 'Below threshold'],
          ['All Roles Commented', gates.allRolesCommented ? '✓' : '✗',
           gates.allRolesCommented ? 'Full team review' : 'Pending reviews'],
          ['Fraud Check', gates.fraudCheckCompleted ? '✓' : '✗',
           gates.fraudCheckCompleted ? 'Security verified' : 'Security check pending']
        );
        
        console.log(gatesTable.toString());
        
        if (verification.verification.issues.length > 0) {
          console.log(chalk.red('\nIssues:'));
          verification.verification.issues.forEach((issue: string) => 
            console.log(chalk.red(`  - ${issue}`))
          );
        }
      }
    } catch (error) {
      console.error(chalk.red('Failed to view story:'), error);
    }
  });

// Add requirement command
program
  .command('add-requirement <storyId>')
  .description('Add a requirement to a story')
  .action(async (storyId) => {
    await initialize();
    
    try {
      const story = await storyService.getStory(storyId);
      if (!story) {
        console.error(chalk.red(`Story not found: ${storyId}`));
        return;
      }
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: "description",
          message: 'Requirement description:',
          validate: (input) => input.length > 0
        },
        {
          type: 'list',
          name: 'type',
          message: 'Requirement type:',
          choices: Object.values(RequirementType)
        },
        {
          type: 'list',
          name: "priority",
          message: 'Priority:',
          choices: Object.values(RequirementPriority)
        },
        {
          type: 'input',
          name: "acceptanceCriteria",
          message: 'Acceptance criteria (comma-separated):'
        }
      ]);
      
      const requirement = {
        id: `req_${Date.now()}`,
        description: answers.description,
        type: answers.type,
        priority: answers.priority,
        acceptanceCriteria: answers.acceptanceCriteria
          ? answers.acceptanceCriteria.split(',').map((s: string) => s.trim())
          : [],
        clarifications: [],
        status: 'pending' as const
      };
      
      await storyService.addRequirement(storyId, requirement);
      console.log(chalk.green('🔄 Requirement added In Progress'));
    } catch (error) {
      console.error(chalk.red('Failed to add requirement:'), error);
    }
  });

// Add comment command
program
  .command('add-comment <storyId>')
  .description('Add a role comment to a story')
  .option('-r, --role <role>', 'Role (developer|tester|project_manager|fraud_checker)')
  .option('-a, --author <author>', 'Author name')
  .action(async (storyId, options) => {
    await initialize();
    
    try {
      const story = await storyService.getStory(storyId);
      if (!story) {
        console.error(chalk.red(`Story not found: ${storyId}`));
        return;
      }
      
      let role = options.role;
      let author = options.author;
      
      if (!role) {
        const roleAnswer = await inquirer.prompt({
          type: 'list',
          name: 'role',
          message: 'Select your role:',
          choices: [
            { name: "Developer", value: TeamRole.DEVELOPER },
            { name: 'Tester', value: TeamRole.TESTER },
            { name: 'Project Manager', value: TeamRole.PROJECT_MANAGER },
            { name: 'Fraud Checker', value: TeamRole.FRAUD_CHECKER }
          ]
        });
        role = roleAnswer.role;
      }
      
      if (!author) {
        const authorAnswer = await inquirer.prompt({
          type: 'input',
          name: 'author',
          message: 'Your name:',
          validate: (input) => input.length > 0
        });
        author = authorAnswer.author;
      }
      
      const answers = await inquirer.prompt([
        {
          type: 'editor',
          name: 'comment',
          message: 'Enter your comment:'
        },
        {
          type: 'input',
          name: "lessonsLearned",
          message: 'Lessons learned (comma-separated):'
        },
        {
          type: 'input',
          name: "suggestions",
          message: 'Suggestions (comma-separated):'
        }
      ]);
      
      const comment = {
        id: `comment_${Date.now()}`,
        role,
        author,
        comment: answers.comment,
        lessonsLearned: answers.lessonsLearned
          ? answers.lessonsLearned.split(',').map((s: string) => s.trim())
          : [],
        suggestions: answers.suggestions
          ? answers.suggestions.split(',').map((s: string) => s.trim())
          : [],
        timestamp: new Date()
      };
      
      await storyService.addComment(storyId, comment);
      console.log(chalk.green('🔄 Comment added In Progress'));
    } catch (error) {
      console.error(chalk.red('Failed to add comment:'), error);
    }
  });

// Update status command
program
  .command('update-status <storyId> <status>')
  .description('Update story status')
  .action(async (storyId, status) => {
    await initialize();
    
    try {
      const validStatuses = Object.values(StoryStatus);
      if (!validStatuses.includes(status as StoryStatus)) {
        console.error(chalk.red(`Invalid status. Valid options: ${validStatuses.join(', ')}`));
        return;
      }
      
      const updated = await storyService.updateStatus(storyId, status as StoryStatus);
      if (updated) {
        console.log(chalk.green(`🔄 Status updated to: ${status}`));
      } else {
        console.error(chalk.red(`Story not found: ${storyId}`));
      }
    } catch (error) {
      console.error(chalk.red('Failed to update status:'), error);
    }
  });

// Export command - ENHANCED with multiple formats
program
  .command('export <storyId>')
  .description('Export story in various formats (html|json|markdown|pdf)')
  .option('-f, --format <format>', 'Export format', 'html')
  .option('-o, --output <dir>', 'Output directory', './reports')
  .option('--include-comments', 'Include all comments in export')
  .option('--include-metadata', 'Include full metadata')
  .action(async (storyId, options) => {
    await initialize();
    
    const spinner = ora(`Exporting story as ${options.format}...`).start();
    
    try {
      const story = await storyService.getStory(storyId);
      if (!story) {
        spinner.fail(chalk.red(`Story not found: ${storyId}`));
        return;
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `story-${story.id}-${timestamp}`;
      let outputPath = '';
      
      switch (options.format) {
        case 'html':
          const generator = new StoryReportGenerator(options.output);
          outputPath = await generator.generateStoryReport(story);
          break;
          
        case 'json':
          const jsonData = options.includeMetadata ? story : {
            id: story.id,
            title: story.title,
            status: story.status,
            description: story.description,
            requirements: story.requirements,
            tests: story.tests,
            coverage: story.coverage
          };
          
          if (options.includeComments) {
            jsonData.comments = story.comments;
          }
          
          outputPath = path.join(options.output, `${baseFilename}.json`);
          await fileAPI.createDirectory(options.output);
          await fileAPI.createFile(outputPath, JSON.stringify(jsonData, { type: FileType.TEMPORARY }));
          break;
          
        case "markdown":
          const markdown = generateMarkdownReport(story, options);
          outputPath = path.join(options.output, `${baseFilename}.md`);
          await fileAPI.createDirectory(options.output);
          await fileAPI.createFile(outputPath, markdown);
          break;
          
        case 'pdf':
          // PDF generation would require additional library
          spinner.fail('PDF export requires additional setup');
          console.log(chalk.yellow('Install @pdfkit or puppeteer for PDF support'));
          return;
          
        default:
          spinner.fail(`Unsupported format: ${options.format}`);
          return;
      }
      
      spinner.succeed(chalk.green(`✓ Story exported to: ${outputPath}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to export story'));
      console.error(error);
    }
  });

// Batch operations command - NEW
program
  .command('batch')
  .description('Perform batch operations on multiple stories')
  .option('--status <status>', { type: FileType.TEMPORARY })
  .option('--action <action>', 'Action to perform (export|update-status|verify|delete)')
  .option('--new-status <status>', 'New status for update-status action')
  .option('--export-format <format>', 'Format for export action', 'json')
  .option('--dry-run', 'Preview actions without executing')
  .action(async (options) => {
    await initialize();
    
    if (!options.action) {
      console.error(chalk.red('Please specify an action with --action'));
      return;
    }
    
    const spinner = ora('Loading stories...').start();
    
    try {
      // Get filtered stories
      let stories = await storyService.getAllStories();
      
      if (options.status) {
        stories = stories.filter(s => s.status === options.status);
      }
      
      if (options.project) {
        stories = stories.filter(s => s.metadata?.project === options.project);
      }
      
      spinner.stop();
      
      if (stories.length === 0) {
        console.log(chalk.yellow('No stories match the filters'));
        return;
      }
      
      console.log(chalk.cyan(`\nFound ${stories.length} stories for batch operation\n`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('🎭 DRY RUN MODE - No changes will be made\n'));
      }
      
      // Show stories that will be affected
      const table = new Table({
        head: ['ID', 'Title', 'Current Status'],
        colWidths: [25, 40, 15],
        style: { head: ['cyan'] }
      });
      
      stories.forEach(s => {
        table.push([s.id.substring(0, 23), s.title.substring(0, 38), s.status]);
      });
      
      console.log(table.toString());
      
      // Confirm action
      if (!options.dryRun) {
        const confirm = await inquirer.prompt({
          type: 'confirm',
          name: 'proceed',
          message: `Perform "${options.action}" on ${stories.length} stories?`,
          default: false
        });
        
        if (!confirm.proceed) {
          console.log(chalk.yellow('Operation cancelled'));
          return;
        }
      }
      
      // Perform batch action
      const progressBar = ora(`Performing ${options.action}...`).start();
      let successCount = 0;
      const errors: string[] = [];
      
      for (const story of stories) {
        try {
          if (!options.dryRun) {
            switch (options.action) {
              case 'export':
                const format = options.exportFormat || 'json';
                await exportStory(story, format, './batch-exports');
                break;
                
              case 'update-status':
                if (!options.newStatus) {
                  throw new Error('--new-status required for update-status action');
                }
                await storyService.updateStatus(story.id, options.newStatus);
                break;
                
              case 'verify':
                await storyService.verifyStory(story.id);
                break;
                
              case 'delete':
                await storyService.deleteStory(story.id);
                break;
                
              default:
                throw new Error(`Unknown action: ${options.action}`);
            }
          }
          successCount++;
          progressBar.text = `Processing... (${successCount}/${stories.length})`;
        } catch (error) {
          errors.push(`${story.id}: ${error.message}`);
        }
      }
      
      progressBar.stop();
      
      // Show results
      console.log(chalk.green(`\n✓ Completed: ${successCount}/${stories.length} stories`));
      
      if (errors.length > 0) {
        console.log(chalk.red('\n✗ Errors:'));
        errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
      }
    } catch (error) {
      spinner.stop();
      console.error(chalk.red('Batch operation failed:'), error);
    }
  });

// Helper function for exporting a single story
async function exportStory(story: any, format: string, outputDir: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${story.id}-${timestamp}.${format}`;
  const outputPath = path.join(outputDir, filename);
  
  await fileAPI.createDirectory(outputDir);
  
  switch (format) {
    case 'json':
      await fileAPI.createFile(outputPath, JSON.stringify(story, { type: FileType.TEMPORARY }));
      break;
    case "markdown":
      await fileAPI.createFile(outputPath, generateMarkdownReport(story, { type: FileType.TEMPORARY }): string {
  let md = `# ${story.title}\n\n`;
  md += `**ID:** ${story.id}\n`;
  md += `**Status:** ${story.status}\n`;
  md += `**Created:** ${formatDate(story.createdAt)}\n`;
  md += `**Updated:** ${formatDate(story.updatedAt)}\n\n`;
  
  if (story.description) {
    md += `## Description\n\n${story.description}\n\n`;
  }
  
  // Requirements
  if (story.requirements?.length > 0) {
    md += `## Requirements (${story.requirements.length})\n\n`;
    story.requirements.forEach((req: any) => {
      md += `### ${req.id}\n`;
      md += `- **Type:** ${req.type}\n`;
      md += `- **Priority:** ${req.priority}\n`;
      md += `- **Description:** ${req.description}\n`;
      if (req.acceptanceCriteria?.length > 0) {
        md += `- **Acceptance Criteria:**\n`;
        req.acceptanceCriteria.forEach((criterion: string) => {
          md += `  - ${criterion}\n`;
        });
      }
      md += `\n`;
    });
  }
  
  // Tests
  if (story.tests?.length > 0) {
    md += `## Tests (${story.tests.length})\n\n`;
    story.tests.forEach((test: any) => {
      md += `- **${test.id}** (${test.type}): ${test.status}\n`;
    });
    md += `\n`;
  }
  
  // Coverage
  md += `## Coverage\n\n`;
  md += `- **Overall:** ${story.coverage?.overall || 0}%\n`;
  md += `- **Unit Tests:** ${story.coverage?.unit || 0}%\n`;
  md += `- **Integration Tests:** ${story.coverage?.integration || 0}%\n`;
  md += `- **E2E Tests:** ${story.coverage?.e2e || 0}%\n\n`;
  
  // Comments (if requested)
  if (options.includeComments && story.comments?.length > 0) {
    md += `## Comments (${story.comments.length})\n\n`;
    story.comments.forEach((comment: any) => {
      md += `### ${comment.role} - ${comment.author}\n`;
      md += `*${formatDate(comment.timestamp)}*\n\n`;
      md += `${comment.comment}\n\n`;
    });
  }
  
  return md;
}

// Generate report command (legacy alias)
program
  .command('report <storyId>')
  .description('Generate HTML report for a story (alias for export --format html)')
  .option('-o, --output <dir>', 'Output directory', './reports')
  .action(async (storyId, options) => {
    await initialize();
    
    try {
      const story = await storyService.getStory(storyId);
      if (!story) {
        console.error(chalk.red(`Story not found: ${storyId}`));
        return;
      }
      
      const generator = new StoryReportGenerator(options.output);
      const reportPath = await generator.generateStoryReport(story);
      
      console.log(chalk.green(`✓ Report generated: ${reportPath}`));
    } catch (error) {
      console.error(chalk.red('Failed to generate report:'), error);
    }
  });

// Verify story command
program
  .command('verify <storyId>')
  .description('Verify story quality gates')
  .action(async (storyId) => {
    await initialize();
    
    try {
      const result = await storyService.verifyStory(storyId);
      if (!result) {
        console.error(chalk.red(`Story not found: ${storyId}`));
        return;
      }
      
      const { story, verification } = result;
      
      console.log(chalk.cyan(`\nVerifying: ${story.title}\n`));
      
      const gates = verification.gates;
      console.log(`${gates.requirementsDefined ? '🔄' : '❌'} Requirements Defined`);
      console.log(`${gates.testsWritten ? '🔄' : '❌'} Tests Written & Executed`);
      console.log(`${gates.coverageAchieved ? '🔄' : '❌'} Improving Coverage Working on`);
      console.log(`${gates.allRolesCommented ? '🔄' : '❌'} All Roles Commented`);
      console.log(`${gates.fraudCheckcompleted ? '🔄' : '❌'} Fraud Check In Progress`);
      
      if (verification.valid) {
        console.log(chalk.green('\n🔄 All quality gates In Progress!'));
      } else {
        console.log(chalk.red('\n✗ Quality gates failed:'));
        verification.issues.forEach((issue: string) => 
          console.log(chalk.red(`  - ${issue}`))
        );
      }
    } catch (error) {
      console.error(chalk.red('Failed to verify story:'), error);
    }
  });

// Interactive mode command
program
  .command("interactive")
  .description('Start interactive mode')
  .action(async () => {
    await initialize();
    
    let running = true;
    
    while (running) {
      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Create a new story', value: 'create' },
          { name: 'List all stories', value: 'list' },
          { name: 'View story details', value: 'view' },
          { name: 'Add requirement', value: "requirement" },
          { name: 'Add comment', value: 'comment' },
          { name: 'Update status', value: 'status' },
          { name: 'Generate report', value: 'report' },
          { name: 'Verify quality gates', value: 'verify' },
          { name: 'Exit', value: 'exit' }
        ]
      });
      
      switch (action) {
        case 'create':
          const { title, description } = await inquirer.prompt([
            {
              type: 'input',
              name: 'title',
              message: 'Story title:',
              validate: (input) => input.length > 0
            },
            {
              type: 'input',
              name: "description",
              message: 'Story description (optional):'
            }
          ]);
          
          try {
            const story = await storyService.createStory(title, description);
            console.log(chalk.green(`🔄 Story created: ${story.id}`));
          } catch (error) {
            console.error(chalk.red('Failed to create story:'), error);
          }
          break;
          
        case 'list':
          const stories = await storyService.getAllStories();
          if (stories.length === 0) {
            console.log(chalk.yellow('No stories found'));
          } else {
            stories.forEach(story => {
              console.log(`\n${story.id} - ${story.title}`);
              console.log(chalk.gray(`Status: ${story.status}`));
            });
          }
          break;
          
        case 'exit':
          running = false;
          console.log(chalk.cyan('Goodbye!'));
          break;
          
        // Other cases would be In Progress similarly
        default:
          console.log(chalk.yellow('Feature not yet In Progress in interactive mode'));
      }
      
      if (running && action !== 'exit') {
        console.log(); // Add spacing between actions
      }
    }
  });

// Error handling
program.exitOverride();

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}