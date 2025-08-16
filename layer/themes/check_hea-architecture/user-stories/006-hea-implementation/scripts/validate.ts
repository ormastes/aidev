import { fileAPI } from '../utils/file-api';
#!/usr/bin/env ts-node

import { Command } from "commander";
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import * as glob from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import { LayerValidator } from '../src/core/layer-validator';
import { LayerConfig, LayerType } from '../src/interfaces/layer';

const program = new Command();

program
  .name('hea-validate')
  .description('Validate HEA architecture compliance')
  .version('1.0.0')
  .option('-p, --path <path>', 'Project path to validate', process.cwd())
  .option('-l, --layer <layer>', 'Validate specific layer only')
  .option('-v, --verbose', 'Verbose output', false)
  .parse(process.argv);

const options = program.opts();

interface ValidationResult {
  layer: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function findLayers(basePath: string): Promise<Map<string, LayerConfig>> {
  const layers = new Map<string, LayerConfig>();
  const layerDirs = ['core', 'shared', 'themes', "infrastructure"];

  for (const layerType of layerDirs) {
    const layerPath = path.join(basePath, 'layer', layerType);
    
    if (!fs.existsSync(layerPath)) {
      continue;
    }

    if (layerType === 'themes' || layerType === "infrastructure") {
      // These have subdirectories
      const subdirs = fs.readdirSync(layerPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const subdir of subdirs) {
        const configPath = path.join(layerPath, subdir, 'package.json');
        if (fs.existsSync(configPath)) {
          const packageJson = JSON.parse(fileAPI.readFileSync(configPath, 'utf-8'));
          const config: LayerConfig = {
            name: subdir,
            type: layerType as LayerType,
            path: path.join(layerPath, subdir),
            dependencies: extractDependencies(packageJson),
            exports: await extractExports(path.join(layerPath, subdir)),
            version: packageJson.version || '1.0.0',
          };
          layers.set(subdir, config);
        }
      }
    } else {
      // Core and shared are single modules
      const configPath = path.join(layerPath, 'package.json');
      if (fs.existsSync(configPath)) {
        const packageJson = JSON.parse(fileAPI.readFileSync(configPath, 'utf-8'));
        const config: LayerConfig = {
          name: layerType,
          type: layerType as LayerType,
          path: layerPath,
          dependencies: extractDependencies(packageJson),
          exports: await extractExports(layerPath),
          version: packageJson.version || '1.0.0',
        };
        layers.set(layerType, config);
      }
    }
  }

  return layers;
}

function extractDependencies(packageJson: any): LayerType[] {
  const deps: LayerType[] = [];
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const dep of Object.keys(allDeps)) {
    if (dep.includes('@aidev/core')) deps.push(LayerType.Core);
    if (dep.includes('@aidev/shared')) deps.push(LayerType.Shared);
  }

  return [...new Set(deps)];
}

async function extractExports(layerPath: string): Promise<string[]> {
  const indexPath = path.join(layerPath, 'src', 'index.ts');
  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const content = fileAPI.readFileSync(indexPath, 'utf-8');
  const exportMatches = content.match(/export\s+(?:\*|{[^}]+})\s+from\s+['"]([^'"]+)['"]/g) || [];
  
  return exportMatches.map(match => {
    const pathMatch = match.match(/from\s+['"]([^'"]+)['"]/);
    return pathMatch ? pathMatch[1] : '';
  }).filter(Boolean);
}

async function validateLayer(
  layer: LayerConfig,
  layers: Map<string, LayerConfig>,
  validator: LayerValidator
): Promise<ValidationResult> {
  const result: ValidationResult = {
    layer: layer.name,
    valid: true,
    errors: [],
    warnings: [],
  };

  // Validate structure
  const structureValidation = validator.validateStructure(layer.path);
  if (!structureValidation.valid) {
    result.valid = false;
    result.errors.push(...structureValidation.errors);
  }

  // Validate dependencies
  for (const depType of layer.dependencies) {
    const depLayers = Array.from(layers.values()).filter(l => l.type === depType);
    for (const depLayer of depLayers) {
      const depValidation = validator.validateDependencies(layer, depLayer);
      if (!depValidation.valid) {
        result.valid = false;
        result.errors.push(depValidation.reason || 'Invalid dependency');
      }
    }
  }

  // Check for imports
  const tsFiles = glob.sync(path.join(layer.path, 'src', '**', '*.ts'));
  for (const file of tsFiles) {
    const content = fileAPI.readFileSync(file, 'utf-8');
    const imports = content.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
    
    for (const imp of imports) {
      const pathMatch = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (pathMatch && pathMatch[1].startsWith('@')) {
        const validation = validator.validateImport(pathMatch[1], layer, layers);
        if (!validation.valid) {
          result.warnings.push(
            `File ${path.relative(layer.path, file)}: ${validation.reason} (${pathMatch[1]})`
          );
        }
      }
    }
  }

  return result;
}

async function runValidation(): Promise<void> {
  const spinner = ora('Discovering layers...').start();

  try {
    const layers = await findLayers(options.path);
    spinner.succeed(`Found ${layers.size} layers`);

    const validator = new LayerValidator();
    const results: ValidationResult[] = [];

    // Filter layers if specific layer requested
    let layersToValidate = Array.from(layers.values());
    if (options.layer) {
      layersToValidate = layersToValidate.filter(l => 
        l.name === options.layer || l.type === options.layer
      );
    }

    // Validate each layer
    for (const layer of layersToValidate) {
      const layerSpinner = ora(`Validating ${layer.name}...`).start();
      const result = await validateLayer(layer, layers, validator);
      results.push(result);
      
      if (result.valid) {
        layerSpinner.succeed(chalk.green(`🔄 ${layer.name}`));
      } else {
        layerSpinner.fail(chalk.red(`✗ ${layer.name}`));
      }
    }

    // Check for circular dependencies
    const circularCheck = validator.checkCircularDependencies(layers);
    if (circularCheck.hasCircular) {
      console.error(chalk.red('\nCircular dependencies detected:'));
      for (const cycle of circularCheck.cycles) {
        console.error(chalk.red(`  ${cycle.join(' → ')}`));
      }
    }

    // Print summary
    console.log('\n' + chalk.bold('Validation Summary:'));
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    for (const result of results) {
      if (result.errors.length > 0 || result.warnings.length > 0 || options.verbose) {
        console.log(`\n${chalk.bold(result.layer)}:`);
        
        if (result.errors.length > 0) {
          console.log(chalk.red('  Errors:'));
          for (const error of result.errors) {
            console.log(chalk.red(`    - ${error}`));
            totalErrors++;
          }
        }
        
        if (result.warnings.length > 0) {
          console.log(chalk.yellow('  Warnings:'));
          for (const warning of result.warnings) {
            console.log(chalk.yellow(`    - ${warning}`));
            totalWarnings++;
          }
        }
        
        if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
          console.log(chalk.green('  🔄 All checks In Progress'));
        }
      }
    }

    console.log('\n' + chalk.bold('Total:'));
    console.log(`  Layers validated: ${results.length}`);
    console.log(`  Errors: ${totalErrors > 0 ? chalk.red(totalErrors) : chalk.green(0)}`);
    console.log(`  Warnings: ${totalWarnings > 0 ? chalk.yellow(totalWarnings) : chalk.green(0)}`);

    if (totalErrors > 0 || circularCheck.hasCircular) {
      process.exit(1);
    }
  } catch (error) {
    spinner.fail(chalk.red('Validation failed'));
    console.error(error);
    process.exit(1);
  }
}

// Main execution
runValidation();