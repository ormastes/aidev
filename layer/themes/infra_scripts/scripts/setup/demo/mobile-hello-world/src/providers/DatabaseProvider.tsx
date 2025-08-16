import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Dexie, { Table } from 'dexie';

interface Message {
  id?: number;
  text: string;
  timestamp: string;
}

interface DatabaseContextType {
  messages: Message[];
  saveText: (text: string) => Promise<void>;
  getText: () => Promise<string[]>;
  clearAll: () => Promise<void>;
}

// Dexie database setup
class HelloWorldDB extends Dexie {
  messages!: Table<Message>;

  constructor() {
    super('HelloWorldDB');
    this.version(1).stores({
      messages: '++id, text, timestamp'
    });
  }
}

const db = new HelloWorldDB();

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const allMessages = await db.messages.orderBy('timestamp').toArray();
      setMessages(allMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const saveText = async (text: string): Promise<void> => {
    try {
      const message: Message = {
        text,
        timestamp: new Date().toISOString(),
      };
      
      await db.messages.add(message);
      await loadMessages(); // Refresh the messages list
      
      // Also send to server if available
      try {
        await fetch('http://localhost:3456/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
      } catch (serverError) {
        console.log('Server not available, saved locally only');
      }
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error;
    }
  };

  const getText = async (): Promise<string[]> => {
    try {
      const allMessages = await db.messages.orderBy('timestamp').toArray();
      return allMessages.map(msg => msg.text);
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  };

  const clearAll = async (): Promise<void> => {
    try {
      await db.messages.clear();
      await loadMessages();
    } catch (error) {
      console.error('Failed to clear messages:', error);
      throw error;
    }
  };

  return (
    <DatabaseContext.Provider value={{ messages, saveText, getText, clearAll }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};