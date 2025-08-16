import { path } from '../../../../../infra_external-log-lib/src';
import { TaskManager } from '../domain/task-manager';
import { TaskStorage } from '../external/task-storage';
import { Logger } from '../external/logger';
import { TaskManagerInterface } from '../interfaces';

export class PocketTaskPlatform {
  private taskManager: TaskManagerInterface;

  constructor(dataDir: string) {
    // Initialize storage
    const storageFile = path.join(dataDir, 'tasks.json');
    const taskStorage = new TaskStorage(storageFile);

    // Initialize logger
    const logFile = path.join(dataDir, 'pocketflow.log');
    const logger = new Logger(logFile);

    // Initialize task manager
    this.taskManager = new TaskManager(taskStorage, logger);
  }

  getTaskManager(): TaskManagerInterface {
    return this.taskManager;
  }
}