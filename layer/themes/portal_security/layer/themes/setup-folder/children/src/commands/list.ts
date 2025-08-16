import { fileAPI } from '../utils/file-api';
import { Command } from "commander";
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../infra_external-log-lib/src';
// import { glob } from 'glob'; // Not needed for this implementation

export const listCommand = new Command('list')
  .description('List epics, themes, or stories')
  .argument('<type>', 'Type to list (epics, themes, stories, all)')
  .option('--epic <epic>', 'Filter by epic ID')
  .option('--theme <theme>', 'Filter by theme ID')
  .option('--status <status>', 'Filter by status (planning, in_progress, completed)')
  .option('--json', 'Output as JSON')
  .action(async (type: string, options: any) => {
    try {
      const baseDir = process.cwd();
      const agileDir = path.join(baseDir, 'scripts', 'setup', 'agile');

      switch (type) {
        case 'epics':
          await listEpics(agileDir, options);
          break;
        case 'themes':
          await listThemes(agileDir, options);
          break;
        case 'stories':
          await listStories(agileDir, options);
          break;
        case 'all':
          await listAll(agileDir, options);
          break;
        default:
          console.error(chalk.red(`Unknown type: ${type}. Use epics, themes, stories, or all.`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function listEpics(agileDir: string, options: any) {
  const epicsDir = path.join(agileDir, 'epics');
  if (!await fs.pathExists(epicsDir)) {
    console.log(chalk.yellow('No epics found.'));
    return;
  }

  const epicDirs = await fs.readdir(epicsDir);
  const epics = [];

  for (const epicId of epicDirs) {
    const epicPath = path.join(epicsDir, epicId, 'epic.json');
    if (await fs.pathExists(epicPath)) {
      const epicData = await fs.readJson(epicPath);
      if (!options.status || epicData.epic.status === options.status) {
        epics.push(epicData.epic);
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify(epics, null, 2));
  } else {
    console.log(chalk.blue('\n📚 Epics:\n'));
    for (const epic of epics) {
      console.log(chalk.green(`ID: ${epic.id}`));
      console.log(`  Title: ${epic.title}`);
      console.log(`  Status: ${epic.status}`);
      console.log(`  Priority: ${epic.priority}`);
      console.log(`  Story Points: ${epic.storyPoints}`);
      if (epic.themes && epic.themes.length > 0) {
        console.log(`  Themes: ${epic.themes.join(', ')}`);
      }
      console.log('');
    }
    console.log(chalk.gray(`Total: ${epics.length} epics`));
  }
}

async function listThemes(agileDir: string, options: any) {
  const themesDir = path.join(agileDir, 'themes');
  if (!await fs.pathExists(themesDir)) {
    console.log(chalk.yellow('No themes found.'));
    return;
  }

  const themeDirs = await fs.readdir(themesDir);
  const themes = [];
  const themeRelations = new Map();

  for (const themeId of themeDirs) {
    const themePath = path.join(themesDir, themeId, 'theme.json');
    if (await fs.pathExists(themePath)) {
      const themeData = await fs.readJson(themePath);
      const theme = themeData.theme;
      
      if ((!options.epic || theme.epicId === options.epic) &&
          (!options.status || theme.status === options.status)) {
        themes.push(theme);
        
        // Check for related themes
        const relatedPath = path.join(themesDir, themeId, 'related-themes.json');
        if (await fs.pathExists(relatedPath)) {
          const related = await fs.readJson(relatedPath);
          themeRelations.set(theme.id, related.relatedThemes || []);
        }
      }
    }
  }

  if (options.json) {
    const output = themes.map(theme => ({
      ...theme,
      relatedThemes: themeRelations.get(theme.id) || []
    }));
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(chalk.blue('\n🎯 Themes:\n'));
    for (const theme of themes) {
      console.log(chalk.green(`ID: ${theme.id}`));
      console.log(`  Name: ${theme.name}`);
      console.log(`  Status: ${theme.status}`);
      if (theme.epicId) {
        console.log(`  Epic: ${theme.epicId}`);
      }
      
      const related = themeRelations.get(theme.id);
      if (related && related.length > 0) {
        console.log(chalk.cyan(`  Related Themes:`));
        for (const rel of related) {
          console.log(`    - ${rel.themeId}: ${rel.relationship}`);
        }
      }
      console.log('');
    }
    console.log(chalk.gray(`Total: ${themes.length} themes`));
  }
}

async function listStories(agileDir: string, options: any) {
  const storiesDir = path.join(agileDir, 'stories');
  if (!await fs.pathExists(storiesDir)) {
    console.log(chalk.yellow('No stories found.'));
    return;
  }

  const storyDirs = await fs.readdir(storiesDir);
  const stories = [];

  for (const storyId of storyDirs) {
    const storyPath = path.join(storiesDir, storyId, 'story.json');
    if (await fs.pathExists(storyPath)) {
      const storyData = await fs.readJson(storyPath);
      const story = storyData.story;
      
      if ((!options.epic || story.epicId === options.epic) &&
          (!options.theme || story.themeId === options.theme) &&
          (!options.status || story.status === options.status)) {
        stories.push(story);
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify(stories, null, 2));
  } else {
    console.log(chalk.blue('\n📝 User Stories:\n'));
    for (const story of stories) {
      console.log(chalk.green(`ID: ${story.id}`));
      console.log(`  Title: ${story.title}`);
      console.log(`  Status: ${story.status}`);
      console.log(`  Priority: ${story.priority}`);
      console.log(`  Story Points: ${story.storyPoints}`);
      if (story.epicId) console.log(`  Epic: ${story.epicId}`);
      if (story.themeId) console.log(`  Theme: ${story.themeId}`);
      console.log('');
    }
    console.log(chalk.gray(`Total: ${stories.length} stories`));
  }
}

async function listAll(agileDir: string, options: any) {
  console.log(chalk.cyan('\n🏗️  Agile Project Structure\n'));
  
  // List epics with their themes and stories
  const epicsDir = path.join(agileDir, 'epics');
  if (await fs.pathExists(epicsDir)) {
    const epicDirs = await fs.readdir(epicsDir);
    
    for (const epicId of epicDirs) {
      const epicPath = path.join(epicsDir, epicId, 'epic.json');
      if (await fs.pathExists(epicPath)) {
        const epicData = await fs.readJson(epicPath);
        const epic = epicData.epic;
        
        console.log(chalk.blue(`📚 Epic: ${epic.title} (${epic.id})`));
        console.log(`   Status: ${epic.status}, Priority: ${epic.priority}, Points: ${epic.storyPoints}`);
        
        // Find themes for this epic
        const themesDir = path.join(agileDir, 'themes');
        if (await fs.pathExists(themesDir)) {
          const themeDirs = await fs.readdir(themesDir);
          
          for (const themeId of themeDirs) {
            const themePath = path.join(themesDir, themeId, 'theme.json');
            if (await fs.pathExists(themePath)) {
              const themeData = await fs.readJson(themePath);
              const theme = themeData.theme;
              
              if (theme.epicId === epic.id) {
                console.log(chalk.yellow(`   🎯 Theme: ${theme.name} (${theme.id})`));
                
                // Find stories for this theme
                const storiesDir = path.join(agileDir, 'stories');
                if (await fs.pathExists(storiesDir)) {
                  const storyDirs = await fs.readdir(storiesDir);
                  
                  for (const storyId of storyDirs) {
                    const storyPath = path.join(storiesDir, storyId, 'story.json');
                    if (await fs.pathExists(storyPath)) {
                      const storyData = await fs.readJson(storyPath);
                      const story = storyData.story;
                      
                      if (story.themeId === theme.id && story.epicId === epic.id) {
                        console.log(chalk.green(`      📝 ${story.title} (${story.id}) - ${story.status}`));
                      }
                    }
                  }
                }
              }
            }
          }
        }
        console.log('');
      }
    }
  }
  
  // List standalone themes and stories
  console.log(chalk.magenta('\n🔗 Standalone Items:\n'));
  
  // Standalone themes
  const themesDir = path.join(agileDir, 'themes');
  if (await fs.pathExists(themesDir)) {
    const themeDirs = await fs.readdir(themesDir);
    
    for (const themeId of themeDirs) {
      const themePath = path.join(themesDir, themeId, 'theme.json');
      if (await fs.pathExists(themePath)) {
        const themeData = await fs.readJson(themePath);
        const theme = themeData.theme;
        
        if (!theme.epicId) {
          console.log(chalk.yellow(`🎯 Theme: ${theme.name} (${theme.id}) - Standalone`));
        }
      }
    }
  }
  
  // Standalone stories
  const storiesDir = path.join(agileDir, 'stories');
  if (await fs.pathExists(storiesDir)) {
    const storyDirs = await fs.readdir(storiesDir);
    
    for (const storyId of storyDirs) {
      const storyPath = path.join(storiesDir, storyId, 'story.json');
      if (await fs.pathExists(storyPath)) {
        const storyData = await fs.readJson(storyPath);
        const story = storyData.story;
        
        if (!story.epicId && !story.themeId) {
          console.log(chalk.green(`📝 Story: ${story.title} (${story.id}) - Standalone`));
        }
      }
    }
  }
}