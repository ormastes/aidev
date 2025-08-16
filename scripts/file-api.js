#!/usr/bin/env node

/**
 * File API CLI - Main entry point for file API operations
 */

const path = require('path');
const fs = require('fs');

// Parse command
const [,, command, ...args] = process.argv;

// Available commands
const commands = {
  'create': 'Create a file with automatic type detection and routing',
  'validate': 'Validate a file path against FILE_STRUCTURE.vf.json',
  'scan': 'Scan for direct file operation violations',
  'fix': 'Auto-fix file operation violations',
  'report': 'Generate compliance report',
  'audit': 'Show or export audit log',
  'demo': 'Run the file API demo',
  'help': 'Show this help message'
};

function showHelp() {
  console.log(`
File API CLI - Centralized file operations management

Usage: file-api <command> [options]

Commands:
${Object.entries(commands).map(([cmd, desc]) => `  ${cmd.padEnd(12)} ${desc}`).join('\n')}

Examples:
  file-api create report.md --type report --content "# Report"
  file-api validate src/index.ts --type source
  file-api scan --directory ./src
  file-api fix --dry-run
  file-api report --output gen/doc/compliance.md
  file-api audit --export
  file-api demo

Options:
  --type        File type (document, report, temp, log, etc.)
  --content     File content (for create command)
  --directory   Directory to scan
  --dry-run     Preview changes without applying
  --output      Output file path
  --export      Export data to file
  --verbose     Show detailed output
  --help        Show help for specific command

Environment Variables:
  ENFORCE_FILE_API=true    Enable strict enforcement
  WARN_FILE_API=true       Enable warnings
  NODE_ENV=production      Set environment mode
`);
}

async function runCommand(command, args) {
  const libPath = path.join(__dirname, '..', 'layer', 'themes', 'infra_external-log-lib');
  
  switch (command) {
    case 'create':
      await handleCreate(args, libPath);
      break;
      
    case 'validate':
      await handleValidate(args, libPath);
      break;
      
    case 'scan':
      await handleScan(args);
      break;
      
    case 'fix':
      await handleFix(args);
      break;
      
    case 'report':
      await handleReport(args);
      break;
      
    case 'audit':
      await handleAudit(args, libPath);
      break;
      
    case 'demo':
      await handleDemo(libPath);
      break;
      
    case 'help':
    case undefined:
      showHelp();
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run "file-api help" for usage information');
      process.exit(1);
  }
}

async function handleCreate(args, libPath) {
  // Parse arguments
  const options = parseArgs(args);
  
  if (!options._ || options._.length === 0) {
    console.error('Error: File path required');
    console.log('Usage: file-api create <path> --type <type> --content <content>');
    process.exit(1);
  }
  
  const filePath = options._[0];
  const content = options.content || '';
  const type = options.type || 'temporary';
  
  try {
    // Use the FileCreationAPI
    const { FileCreationAPI, FileType } = require(path.join(libPath, 'src/file-manager/FileCreationAPI'));
    
    const fileAPI = new FileCreationAPI(process.cwd(), false);
    const fileType = FileType[type.toUpperCase()] || FileType.TEMPORARY;
    
    const result = await fileAPI.createFile(filePath, content, {
      type: fileType
    });
    
    if (result.success) {
      console.log(`✅ File created: ${result.path}`);
      console.log(`   Type: ${result.type}`);
      console.log(`   Size: ${result.size} bytes`);
    } else {
      console.error(`❌ Failed to create file: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleValidate(args, libPath) {
  const options = parseArgs(args);
  const filePath = options._?.[0] || options.path;
  const type = options.type || 'temporary';
  
  if (!filePath) {
    console.error('Error: File path required');
    process.exit(1);
  }
  
  try {
    const { MCPIntegratedFileManager, FileType } = require(path.join(libPath, 'src/file-manager/MCPIntegratedFileManager'));
    
    const manager = new MCPIntegratedFileManager(process.cwd());
    const fileType = FileType[type.toUpperCase()] || FileType.TEMPORARY;
    
    const validation = await manager.validateAgainstStructure(filePath, fileType);
    
    if (validation.valid) {
      console.log(`✅ Path is valid: ${filePath}`);
    } else {
      console.log(`❌ Path validation failed: ${filePath}`);
      console.log('\nViolations:');
      validation.violations.forEach(v => console.log(`  - ${v}`));
      
      if (validation.suggestions.length > 0) {
        console.log('\nSuggestions:');
        validation.suggestions.forEach(s => console.log(`  - ${s}`));
      }
      
      if (validation.allowedPaths && validation.allowedPaths.length > 0) {
        console.log('\nAllowed paths for this type:');
        validation.allowedPaths.forEach(p => console.log(`  - ${p}`));
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleScan(args) {
  const scriptPath = path.join(__dirname, 'enforce-file-api.ts');
  const tsNode = path.join(__dirname, '..', 'node_modules', '.bin', 'ts-node');
  
  // Build command
  const command = [tsNode, scriptPath, '--scan', ...args].join(' ');
  
  require('child_process').exec(command, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) process.exit(1);
  });
}

async function handleFix(args) {
  const scriptPath = path.join(__dirname, 'enforce-file-api.ts');
  const tsNode = path.join(__dirname, '..', 'node_modules', '.bin', 'ts-node');
  
  const command = [tsNode, scriptPath, '--fix', ...args].join(' ');
  
  require('child_process').exec(command, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) process.exit(1);
  });
}

async function handleReport(args) {
  const scriptPath = path.join(__dirname, 'enforce-file-api.ts');
  const tsNode = path.join(__dirname, '..', 'node_modules', '.bin', 'ts-node');
  
  const command = [tsNode, scriptPath, '--report', ...args].join(' ');
  
  require('child_process').exec(command, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) process.exit(1);
  });
}

async function handleAudit(args, libPath) {
  const options = parseArgs(args);
  
  try {
    const { FileCreationAPI } = require(path.join(libPath, 'src/file-manager/FileCreationAPI'));
    const fileAPI = new FileCreationAPI(process.cwd(), false);
    
    const auditLog = fileAPI.getAuditLog();
    
    if (options.export) {
      const exportPath = await fileAPI.exportAuditLog();
      console.log(`✅ Audit log exported to: ${exportPath}`);
    } else {
      console.log(`Audit Log (${auditLog.length} entries):\n`);
      
      const limit = options.limit || 10;
      const entries = auditLog.slice(-limit);
      
      entries.forEach(entry => {
        const icon = entry.success ? '✅' : '❌';
        const time = new Date(entry.timestamp).toLocaleTimeString();
        console.log(`${icon} [${time}] ${entry.operation}: ${entry.path}`);
        if (entry.metadata) {
          console.log(`   Metadata: ${JSON.stringify(entry.metadata)}`);
        }
      });
      
      if (auditLog.length > limit) {
        console.log(`\n... and ${auditLog.length - limit} more entries`);
        console.log('Use --export to save full log');
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

async function handleDemo(libPath) {
  const demoPath = path.join(libPath, 'examples', 'file-api-demo.ts');
  const tsNode = path.join(__dirname, '..', 'node_modules', '.bin', 'ts-node');
  
  console.log('Running File API demo...\n');
  
  require('child_process').exec(`${tsNode} ${demoPath}`, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    if (error) process.exit(1);
  });
}

function parseArgs(args) {
  const options = { _: [] };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else if (!arg.startsWith('-')) {
      options._.push(arg);
    }
  }
  
  return options;
}

// Main execution
runCommand(command, args).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});