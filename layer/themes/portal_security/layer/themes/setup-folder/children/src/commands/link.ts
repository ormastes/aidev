import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import { path } from '../../../../../../../infra_external-log-lib/src';

export const linkCommand = new Command('link')
  .description('Link themes together to show relationships')
  .argument('<theme1>', 'First theme ID')
  .argument('<theme2>', 'Second theme ID')
  .option('--relationship <type>', 'Relationship type (depends-on, related-to, blocks, extends)', 'related-to')
  .option('--bidirectional', 'Create bidirectional link')
  .action(async (theme1: string, theme2: string, options: any) => {
    try {
      const baseDir = process.cwd();
      const themesDir = path.join(baseDir, 'scripts', 'setup', 'agile', 'themes');
      
      // Check if both themes exist
      const theme1Path = path.join(themesDir, theme1);
      const theme2Path = path.join(themesDir, theme2);
      
      if (!await fs.pathExists(theme1Path)) {
        console.error(chalk.red(`Theme '${theme1}' not found`));
        process.exit(1);
      }
      
      if (!await fs.pathExists(theme2Path)) {
        console.error(chalk.red(`Theme '${theme2}' not found`));
        process.exit(1);
      }
      
      // Create the link
      await createThemeLink(theme1Path, theme2, options.relationship);
      console.log(chalk.green(`✅ Linked ${theme1} ${options.relationship} ${theme2}`));
      
      // Create reverse link if bidirectional
      if (options.bidirectional) {
        const reverseRelationship = getReverseRelationship(options.relationship);
        await createThemeLink(theme2Path, theme1, reverseRelationship);
        console.log(chalk.green(`✅ Linked ${theme2} ${reverseRelationship} ${theme1}`));
      }
      
      // Show current relationships
      await showThemeRelationships(theme1Path, theme1);
      if (options.bidirectional) {
        await showThemeRelationships(theme2Path, theme2);
      }
      
    } catch (error) {
      console.error(chalk.red('Error creating link:'), error);
      process.exit(1);
    }
  });

async function createThemeLink(themePath: string, relatedThemeId: string, relationship: string) {
  const relatedPath = path.join(themePath, 'related-themes.json');
  
  let relatedData: { relatedThemes: any[] } = { relatedThemes: [] };
  if (await fs.pathExists(relatedPath)) {
    relatedData = await fs.readJson(relatedPath);
  }
  
  // Check if link already exists
  const existingLink = relatedData.relatedThemes.find(
    (link: any) => link.themeId === relatedThemeId
  ) as any;
  
  if (existingLink) {
    // Update existing relationship
    existingLink.relationship = relationship;
    existingLink.updatedAt = new Date().toISOString();
  } else {
    // Add new link
    relatedData.relatedThemes.push({
      themeId: relatedThemeId,
      relationship: relationship,
      createdAt: new Date().toISOString()
    });
  }
  
  await fs.writeJson(relatedPath, relatedData, { spaces: 2 });
}

function getReverseRelationship(relationship: string): string {
  const reverseMap: { [key: string]: string } = {
    'depends-on': 'required-by',
    'required-by': 'depends-on',
    'blocks': 'blocked-by',
    'blocked-by': 'blocks',
    'extends': 'extended-by',
    'extended-by': 'extends',
    'related-to': 'related-to'
  };
  
  return reverseMap[relationship] || relationship;
}

async function showThemeRelationships(themePath: string, themeId: string) {
  const relatedPath = path.join(themePath, 'related-themes.json');
  
  if (await fs.pathExists(relatedPath)) {
    const relatedData = await fs.readJson(relatedPath);
    
    if (relatedData.relatedThemes.length > 0) {
      console.log(chalk.cyan(`\n🔗 Relationships for ${themeId}:`));
      for (const link of relatedData.relatedThemes) {
        console.log(`   - ${link.relationship} ${link.themeId}`);
      }
    }
  }
}