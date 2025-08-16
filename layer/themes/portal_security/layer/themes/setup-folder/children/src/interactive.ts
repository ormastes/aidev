import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { DemoSetup } from './setup/demo-setup';
import { EpicSetup } from './setup/epic-setup';
import { ThemeSetup } from './setup/theme-setup';
import { StorySetup } from './setup/story-setup';
import { ReleaseSetup } from './setup/release-setup';
import { TestSetup } from './setup/test-setup';
import { 
  DeploymentType, 
  Language, 
  ReleaseType,
  Mode,
  DemoSetupOptions,
  EpicSetupOptions,
  ThemeSetupOptions,
  StorySetupOptions,
  ReleaseSetupOptions,
  TestSetupOptions
} from './types';

export async function runInteractive(): Promise<void> {
  console.log(chalk.cyan('\n🚀 Welcome to AI Dev Portal Setup CLI'));
  console.log(chalk.gray('This tool helps you set up different environments for your AI Dev Portal projects\n'));

  try {
    // First, ask for deployment type
    const { deploymentType } = await inquirer.prompt<{ deploymentType: DeploymentType }>([
      {
        type: 'list',
        name: 'deploymentType',
        message: 'What type of environment do you want to set up?',
        choices: [
          { name: '🧪 Demo - General demo environment (ports 3300-3399)', value: 'demo' },
          { name: '📚 Epic - Agile epic (large feature group)', value: 'epic' },
          { name: '🎯 Theme - Agile theme (feature collection)', value: 'theme' },
          { name: '📝 Story - Agile user story (single feature)', value: 'story' },
          { name: '📦 Release - Production release (ports 3400-3499)', value: 'release' },
          { name: '🔬 Test - Test environment (ports 3100-3199)', value: 'test' }
        ]
      }
    ]);

    // Common questions
    const commonAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'appName',
        message: 'What is your application name?',
        default: 'ai_dev_portal',
        validate: (input: string) => {
          if (!input.match(/^[a-zA-Z0-9-_]+$/)) {
            return 'Application name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'mode',
        message: 'Which mode do you want to use?',
        choices: [
          { name: '🔌 VF Mode - Virtual Filesystem with MCP integration (recommended)', value: 'vf' },
          { name: '📝 MD Mode - Traditional Markdown files', value: 'md' }
        ],
        default: 'vf'
      }
    ]);

    const mode = commonAnswers.mode as Mode;
    const appName = commonAnswers.appName;

    // Type-specific setup
    switch (deploymentType) {
      case 'demo':
        await setupDemo(appName, mode);
        break;
      case 'epic':
        await setupEpic(appName, mode);
        break;
      case 'theme':
        await setupTheme(appName, mode);
        break;
      case 'story':
        await setupStory(appName, mode);
        break;
      case 'release':
        await setupRelease(appName, mode);
        break;
      case 'test':
        await setupTest(appName, mode);
        break;
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log(chalk.yellow('\n👋 Setup cancelled by user'));
    } else {
      console.error(chalk.red('\n❌ Setup failed:'), error);
    }
    process.exit(1);
  }
}

async function setupDemo(appName: string, mode: Mode): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Which programming language do you want to use?',
      choices: [
        { name: 'TypeScript (recommended)', value: 'typescript' },
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Python', value: 'python' }
      ],
      default: 'typescript'
    },
    {
      type: 'confirm',
      name: 'skipDb',
      message: 'Skip database setup?',
      default: false
    },
    {
      type: 'input',
      name: 'configFile',
      message: 'Path to setup.json configuration file (optional):',
      when: () => {
        console.log(chalk.gray('Press Enter to skip'));
        return true;
      }
    }
  ]);

  const options: DemoSetupOptions = {
    appName,
    mode,
    language: answers.language as Language,
    skipDb: answers.skipDb,
    configFile: answers.configFile || undefined
  };

  const spinner = ora('Setting up demo environment...').start();
  
  try {
    const setup = new DemoSetup(options);
    const success = await setup.run();
    
    if (success) {
      spinner.succeed('Demo setup completed successfully!');
    } else {
      spinner.fail('Demo setup failed!');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Demo setup error: ${error}`);
    throw error;
  }
}

async function setupEpic(appName: string, mode: Mode): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'What is the epic title?',
      default: 'New Epic'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe the epic:',
      default: 'Epic description'
    },
    {
      type: 'input',
      name: 'themes',
      message: 'Enter themes for this epic (comma-separated, optional):'
    },
    {
      type: 'input',
      name: 'targetRelease',
      message: 'Target release version (optional):'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority level:',
      choices: ['high', 'medium', 'low'],
      default: 'medium'
    },
    {
      type: 'number',
      name: 'storyPoints',
      message: 'Estimated story points:',
      default: 0
    }
  ]);

  const options: EpicSetupOptions = {
    appName,
    mode,
    title: answers.title,
    description: answers.description,
    themes: answers.themes ? answers.themes.split(',').map((t: string) => t.trim()) : [],
    targetRelease: answers.targetRelease || undefined,
    priority: answers.priority,
    storyPoints: answers.storyPoints
  };

  const spinner = ora('Setting up epic environment...').start();
  
  try {
    const setup = new EpicSetup(options);
    const success = await setup.run();
    
    if (success) {
      spinner.succeed('Epic setup completed successfully!');
    } else {
      spinner.fail('Epic setup failed!');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Epic setup error: ${error}`);
    throw error;
  }
}

async function setupTheme(appName: string, mode: Mode): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'themeName',
      message: 'What is the theme name?',
      default: 'New Theme',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Theme name is required';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Describe the theme:',
      default: 'Theme description'
    },
    {
      type: 'input',
      name: 'epicId',
      message: 'Parent epic ID (optional):'
    },
    {
      type: 'confirm',
      name: 'skipDb',
      message: 'Skip database setup?',
      default: false
    }
  ]);

  const options: ThemeSetupOptions = {
    appName,
    mode,
    themeName: answers.themeName,
    description: answers.description || `Agile theme: ${answers.themeName}`,
    epicId: answers.epicId || undefined,
    skipDb: answers.skipDb
  };

  const spinner = ora('Setting up Agile theme environment...').start();
  
  try {
    const setup = new ThemeSetup(options);
    const success = await setup.run();
    
    if (success) {
      spinner.succeed('Agile theme setup completed successfully!');
    } else {
      spinner.fail('Agile theme setup failed!');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Theme setup error: ${error}`);
    throw error;
  }
}

async function setupStory(appName: string, mode: Mode): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'What is the story title?',
      default: 'New User Story'
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Enter the user story (As a... I want... So that...):'
    },
    {
      type: 'input',
      name: 'epicId',
      message: 'Parent epic ID (optional):'
    },
    {
      type: 'input',
      name: 'themeId',
      message: 'Parent theme ID (optional):'
    },
    {
      type: 'input',
      name: 'acceptanceCriteria',
      message: 'Enter acceptance criteria (comma-separated):'
    },
    {
      type: 'input',
      name: 'tasks',
      message: 'Enter tasks (comma-separated):'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority level:',
      choices: ['high', 'medium', 'low'],
      default: 'medium'
    },
    {
      type: 'list',
      name: 'storyPoints',
      message: 'Story points:',
      choices: ['1', '2', '3', '5', '8', '13'],
      default: '3'
    }
  ]);

  const options: StorySetupOptions = {
    appName,
    mode,
    title: answers.title,
    description: answers.description || `As a user\nI want to use ${appName}\nSo that I can achieve my goals`,
    epicId: answers.epicId || undefined,
    themeId: answers.themeId || undefined,
    acceptanceCriteria: answers.acceptanceCriteria ? answers.acceptanceCriteria.split(',').map((c: string) => c.trim()) : [],
    tasks: answers.tasks ? answers.tasks.split(',').map((t: string) => t.trim()) : [],
    priority: answers.priority,
    storyPoints: parseInt(answers.storyPoints)
  };

  const spinner = ora('Setting up user story environment...').start();
  
  try {
    const setup = new StorySetup(options);
    const success = await setup.run();
    
    if (success) {
      spinner.succeed('User story setup completed successfully!');
    } else {
      spinner.fail('User story setup failed!');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Story setup error: ${error}`);
    throw error;
  }
}

async function setupRelease(appName: string, mode: Mode): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'releaseType',
      message: 'What type of release do you want to create?',
      choices: [
        { name: '🌐 Web Server - Full-stack web application', value: 'web-server' },
        { name: '🔌 MCP - Model Context Protocol server', value: 'mcp' },
        { name: '💻 CLI - Command-line application', value: 'cli' },
        { name: '🔗 API - REST API service', value: 'api' },
        { name: '📚 Library - NPM package', value: 'library' }
      ]
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Production domain name (optional):',
      when: (currentAnswers) => ['web-server', 'api'].includes(currentAnswers.releaseType)
    },
    {
      type: 'input',
      name: 'dbHost',
      message: 'PostgreSQL host:',
      default: 'localhost',
      when: (currentAnswers) => ['web-server', 'api'].includes(currentAnswers.releaseType)
    },
    {
      type: 'input',
      name: 'dbPort',
      message: 'PostgreSQL port:',
      default: '5432',
      when: (currentAnswers) => ['web-server', 'api'].includes(currentAnswers.releaseType)
    },
    {
      type: 'input',
      name: 'port',
      message: 'Application port:',
      default: '3456',
      when: (currentAnswers) => ['web-server', 'api'].includes(currentAnswers.releaseType)
    }
  ]);

  const options: ReleaseSetupOptions = {
    appName,
    mode,
    releaseType: answers.releaseType as ReleaseType,
    domain: answers.domain,
    dbHost: answers.dbHost,
    dbPort: answers.dbPort,
    port: answers.port
  };

  const spinner = ora('Setting up production release...').start();
  
  try {
    const setup = new ReleaseSetup(options);
    const success = await setup.run();
    
    if (success) {
      spinner.succeed('Release setup completed successfully!');
    } else {
      spinner.fail('Release setup failed!');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Release setup error: ${error}`);
    throw error;
  }
}

async function setupTest(appName: string, mode: Mode): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'testFramework',
      message: 'Which test framework do you want to use?',
      choices: [
        { name: 'Jest - Popular and feature-rich (recommended)', value: 'jest' },
        { name: 'Vitest - Fast and modern', value: 'vitest' },
        { name: 'Mocha - Flexible and simple', value: 'mocha' }
      ],
      default: 'jest'
    },
    {
      type: 'confirm',
      name: 'skipDb',
      message: 'Skip database setup?',
      default: false
    }
  ]);

  const options: TestSetupOptions = {
    appName,
    mode,
    testFramework: answers.testFramework,
    skipDb: answers.skipDb
  };

  const spinner = ora('Setting up test environment...').start();
  
  try {
    const setup = new TestSetup(options);
    const success = await setup.run();
    
    if (success) {
      spinner.succeed('Test setup completed successfully!');
    } else {
      spinner.fail('Test setup failed!');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(`Test setup error: ${error}`);
    throw error;
  }
}