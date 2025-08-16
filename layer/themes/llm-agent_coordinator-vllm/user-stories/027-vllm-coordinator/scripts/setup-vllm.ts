import { fileAPI } from '../utils/file-api';
#!/usr/bin/env ts-node
/**
 * Setup script for vLLM Coordinator
 * Installs dependencies and prepares the environment
 */

import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';

const execAsync = promisify(exec);
const fsPromises = fs.promises;

async function setup() {
  console.log(chalk.blue.bold('\n🚀 vLLM Coordinator Setup'));
  console.log(chalk.gray('=' .repeat(50)));
  
  try {
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(chalk.green(`✅ Node.js ${nodeVersion} detected`));
    
    // Install npm dependencies
    console.log(chalk.gray('\n📦 Installing npm dependencies...'));
    await execAsync('npm install');
    console.log(chalk.green('✅ npm dependencies installed'));
    
    // Build TypeScript
    console.log(chalk.gray('\n🔨 Building TypeScript...'));
    await execAsync('npm run build');
    console.log(chalk.green('✅ TypeScript built successfully'));
    
    // Create .env file if it doesn't exist
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      console.log(chalk.gray('\n📝 Creating .env file...'));
      const envContent = `# vLLM Coordinator Configuration
VLLM_SERVER_URL=http://localhost:8000
VLLM_API_KEY=
VLLM_MODEL=deepseek-r1:32b
CHAT_SERVER_URL=http://localhost:3200
`;
      await fsPromises.writeFile(envPath, envContent);
      console.log(chalk.green('✅ .env file created'));
    }
    
    // Make CLI executable
    const cliPath = path.join(process.cwd(), 'dist/cli/vllm-coordinator-cli.js');
    if (fs.existsSync(cliPath)) {
      await execAsync(`chmod +x ${cliPath}`);
      console.log(chalk.green('✅ CLI made executable'));
    }
    
    // Check Python and suggest vLLM installation
    console.log(chalk.gray('\n🐍 Checking Python...'));
    try {
      const { stdout } = await execAsync('python3 --version');
      console.log(chalk.green(`✅ ${stdout.trim()} detected`));
      
      console.log(chalk.yellow('\n📌 To install vLLM server, run:'));
      console.log(chalk.cyan('   npm run vllm:install'));
      console.log(chalk.gray('   or'));
      console.log(chalk.cyan('   node dist/cli/vllm-coordinator-cli.js install'));
    } catch {
      console.log(chalk.yellow('⚠️  Python not found - required for vLLM server'));
    }
    
    console.log(chalk.green('\n✨ Setup completed successfully!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.cyan('1. Edit .env file with your configuration'));
    console.log(chalk.cyan('2. Run: npm start -- start -r <room-id>'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Setup failed:'), error);
    process.exit(1);
  }
}

// Run setup
setup();