#!/usr/bin/env node

import { DatabaseService } from '../services/DatabaseService';
import { ThemeStorageService } from '../services/ThemeStorageService';
import { JWTService } from '../services/JWTService';
import { ExternalLogService } from '../services/ExternalLogService';
import { path } from '../../../../../infra_external-log-lib/src';

async function migrateToThemeStorage() {
  console.log('Starting migration to Theme Storage System...');
  
  // Initialize services
  const db = new DatabaseService();
  const logger = new ExternalLogService();
  const jwtService = new JWTService();
  const themeStorage = new ThemeStorageService(
    jwtService,
    logger,
    path.join(process.cwd(), 'data', 'theme-storage')
  );
  
  try {
    // Initialize database
    await db.initialize();
    
    // Set admin security context for migration
    await themeStorage.initializeSecurityContext('session-migration-admin');
    
    // Create default theme if it doesn't exist
    let defaultTheme = await themeStorage.getTheme('default');
    if (!defaultTheme) {
      console.log('Creating default theme...');
      defaultTheme = await themeStorage.createTheme({
        name: 'Default Theme',
        description: 'The default GUI selector theme',
        permissions: {
          owner: 'system',
          readAccess: ['*'],
          writeAccess: ['admin'],
          adminAccess: ['admin']
        }
      });
    }
    
    // Create default epic
    console.log('Creating default epic...');
    const defaultEpic = await themeStorage.createEpic({
      themeId: defaultTheme.id,
      name: 'GUI Selector Migration',
      description: 'Migrated data from the original database',
      status: "completed"
    });
    
    // Create default app
    console.log('Creating default app...');
    const defaultApp = await themeStorage.createApp({
      themeId: defaultTheme.id,
      epicId: defaultEpic.id,
      name: 'GUI Selector Server',
      version: '1.0.0',
      environment: "production"
    });
    
    console.log('Migration structure created successfully!');
    console.log(`Theme ID: ${defaultTheme.id}`);
    console.log(`Epic ID: ${defaultEpic.id}`);
    console.log(`App ID: ${defaultApp.id}`);
    
    // Note: Actual data migration would happen here
    // This would involve querying the database and converting records
    // to the Theme Storage format
    
    console.log('\nTo complete migration, implement data transfer logic for:');
    console.log('- Templates -> Theme Storage Templates');
    console.log('- Selections -> GUI Selections');
    console.log('- Reports -> GUI Reports');
    console.log('- User preferences -> Theme permissions');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
  
  console.log('\nMigration completed successfully!');
  process.exit(0);
}

// Run migration
migrateToThemeStorage();