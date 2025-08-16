import { EventEmitter } from 'node:events';
import { CLIInterface } from './external/cli-interface';
import { MessageBroker } from './external/message-broker';
import { FileStorage } from './external/file-storage';
import { ContextProvider } from './external/context-provider';
import { ChatRoomPlatform } from './application/chat-room-platform';
import { PocketFlowConnector } from './external/pocketflow-connector';

// Main entry point for Chat Room CLI
export async function startChatRoomCLI(): Promise<void> {
  // Initialize event bus
  const eventBus = new EventEmitter();

  // Initialize external components
  const storage = new FileStorage('./chat-data');
  const broker = new MessageBroker(eventBus);
  const contextProvider = new ContextProvider();
  const pocketFlowConnector = new PocketFlowConnector(eventBus);

  // Initialize platform
  const platform = new ChatRoomPlatform(
    eventBus,
    storage,
    broker,
    pocketFlowConnector,
    contextProvider
  );

  // Initialize CLI interface
  const cli = new CLIInterface(eventBus);

  // Initialize platform
  await platform.initialize();

  // Start CLI
  cli.start();

  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nShutting down Chat Room CLI...');
    await broker.shutdown();
    process.exit(0);
  });
}

// Export all components for testing and external use
export { CLIInterface } from './external/cli-interface';
export { MessageBroker } from './external/message-broker';
export { FileStorage } from './external/file-storage';
export { ContextProvider } from './external/context-provider';
export { ChatRoomPlatform } from './application/chat-room-platform';
export { PocketFlowConnector } from './external/pocketflow-connector';

// Run if executed directly
if (require.main === module) {
  startChatRoomCLI().catch(console.error);
}