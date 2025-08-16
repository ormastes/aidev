import { Command } from "commander";
import chalk from 'chalk';
import { StorySetupOptions } from '../types';
import { StorySetup } from '../setup/story-setup';
import { getMode } from '../utils/mode';

export const storyCommand = new Command('story')
  .description('Setup an Agile user story environment (ports 3200-3299)')
  .argument('[app-name]', 'Story identifier/name', 'ai_dev_portal_story')
  .option('--title <title>', 'Story title', 'New User Story')
  .option('--description <desc>', 'Story description in "As a... I want... So that..." format')
  .option('--epic <epic>', 'Parent epic ID')
  .option('--theme <theme>', 'Parent theme ID')
  .option('--criteria <criteria>', 'Comma-separated acceptance criteria')
  .option('--tasks <tasks>', 'Comma-separated task list')
  .option('--priority <priority>', 'Priority level (high, medium, low)', 'medium')
  .option('--points <points>', 'Story points (1, 2, 3, 5, 8, 13)', '3')
  .option('--skip-db', 'Skip database setup')
  .option('--md-mode', 'Use MD mode instead of VF mode')
  .action(async (appName: string, options: any) => {
    try {
      const mode = getMode(options);
      
      const setupOptions: StorySetupOptions = {
        appName,
        mode,
        skipDb: options.skipDb,
        title: options.title || 'New User Story',
        description: options.description || `As a user\nI want to use ${appName}\nSo that I can achieve my goals`,
        epicId: options.epic,
        themeId: options.theme,
        acceptanceCriteria: options.criteria ? options.criteria.split(',').map((c: string) => c.trim()) : [],
        tasks: options.tasks ? options.tasks.split(',').map((t: string) => t.trim()) : [],
        priority: options.priority,
        storyPoints: parseInt(options.points) || 3
      };

      console.log(chalk.blue(`📝 Setting up user story '${setupOptions.title}' in ${mode.toUpperCase()} mode...`));
      
      const setup = new StorySetup(setupOptions);
      const success = await setup.run();
      
      if (success) {
        console.log(chalk.green('✅ User story setup completed successfully!'));
      } else {
        console.log(chalk.red('❌ User story setup failed!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });