import {
  InMemoryStorage,
  ConversationMemory,
  SummaryMemory,
  CompositeMemory
} from '../../src/memory';

describe("InMemoryStorage", () => {
  let memory: InMemoryStorage;

  beforeEach(() => {
    memory = new InMemoryStorage();
  });

  it('should store and retrieve values', async () => {
    await memory.store('key1', 'value1');
    await memory.store('key2', { data: 'value2' });
    
    expect(await memory.retrieve('key1')).toBe('value1');
    expect(await memory.retrieve('key2')).toEqual({ data: 'value2' });
    expect(await memory.retrieve("nonexistent")).toBeUndefined();
  });

  it('should forget specific keys', async () => {
    await memory.store('key1', 'value1');
    await memory.store('key2', 'value2');
    
    await memory.forget('key1');
    
    expect(await memory.retrieve('key1')).toBeUndefined();
    expect(await memory.retrieve('key2')).toBe('value2');
  });

  it('should clear all storage', async () => {
    await memory.store('key1', 'value1');
    await memory.store('key2', 'value2');
    
    await memory.clear();
    
    expect(await memory.retrieve('key1')).toBeUndefined();
    expect(await memory.retrieve('key2')).toBeUndefined();
  });
});

describe("ConversationMemory", () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory(5); // Max 5 messages
  });

  it('should store and retrieve messages', async () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: "assistant", content: 'Hi there!' }
    ];
    
    await memory.store("messages", messages);
    
    expect(await memory.retrieve("messages")).toEqual(messages);
  });

  it('should add individual messages', () => {
    memory.addMessage({ role: 'user', content: 'Message 1' });
    memory.addMessage({ role: "assistant", content: 'Reply 1' });
    
    expect(memory.getMessages()).toHaveLength(2);
    expect(memory.getMessages()[0].content).toBe('Message 1');
  });

  it('should trim to max messages', async () => {
    // Add more than max messages
    for (let i = 0; i < 8; i++) {
      memory.addMessage({ role: 'user', content: `Message ${i}` });
    }
    
    const messages = memory.getMessages();
    expect(messages).toHaveLength(5);
    expect(messages[0].content).toBe('Message 3'); // First 3 trimmed
  });

  it('should get recent messages', () => {
    for (let i = 0; i < 5; i++) {
      memory.addMessage({ role: 'user', content: `Message ${i}` });
    }
    
    const recent = memory.getRecentMessages(2);
    expect(recent).toHaveLength(2);
    expect(recent[0].content).toBe('Message 3');
    expect(recent[1].content).toBe('Message 4');
  });

  it('should clear messages', async () => {
    memory.addMessage({ role: 'user', content: 'Test' });
    
    await memory.clear();
    
    expect(memory.getMessages()).toHaveLength(0);
  });
});

describe("SummaryMemory", () => {
  let memory: SummaryMemory;

  beforeEach(() => {
    memory = new SummaryMemory();
  });

  it('should store and retrieve facts', async () => {
    await memory.store('fact:weather', 'It is sunny today');
    await memory.store('fact:location', 'New York');
    
    expect(await memory.retrieve('fact:weather')).toBe('It is sunny today');
    expect(await memory.retrieve('fact:location')).toBe('New York');
  });

  it('should store and retrieve summaries', async () => {
    await memory.store('summary:meeting', 'Discussed project timeline');
    
    expect(await memory.retrieve('summary:meeting')).toBe('Discussed project timeline');
  });

  it('should retrieve all facts and summaries', async () => {
    memory.addFact('weather', 'Sunny');
    memory.addFact("temperature", '72F');
    memory.addSummary("conversation", 'Talked about weather');
    
    const allFacts = await memory.retrieve('all_facts');
    expect(allFacts).toEqual({
      weather: 'Sunny',
      temperature: '72F'
    });
    
    const allSummaries = await memory.retrieve('all_summaries');
    expect(allSummaries).toEqual({
      conversation: 'Talked about weather'
    });
  });

  it('should forget specific items', async () => {
    memory.addFact('test', 'value');
    memory.addSummary('test', 'summary');
    
    await memory.forget('fact:test');
    
    expect(await memory.retrieve('fact:test')).toBeUndefined();
    expect(await memory.retrieve('summary:test')).toBe('summary');
  });

  it('should clear all data', async () => {
    memory.addFact('fact1', 'value1');
    memory.addSummary("summary1", 'value2');
    
    await memory.clear();
    
    expect(memory.getFacts().size).toBe(0);
    expect(memory.getSummaries().size).toBe(0);
  });
});

describe("CompositeMemory", () => {
  let memory: CompositeMemory;
  let conversationStore: ConversationMemory;
  let summaryStore: SummaryMemory;

  beforeEach(() => {
    memory = new CompositeMemory();
    conversationStore = new ConversationMemory();
    summaryStore = new SummaryMemory();
    
    memory.addStore("conversation", conversationStore);
    memory.addStore('summary', summaryStore);
    memory.addStore('default', new InMemoryStorage());
  });

  it('should route to appropriate stores', async () => {
    // Store in different stores
    await memory.store('conversation:messages', [
      { role: 'user', content: 'Hello' }
    ]);
    
    await memory.store('summary:fact:weather', 'Sunny');
    
    await memory.store('general_key', 'general_value');
    
    // Verify routing
    expect(await conversationStore.retrieve("messages")).toHaveLength(1);
    expect(await summaryStore.retrieve('fact:weather')).toBe('Sunny');
    expect(await memory.retrieve('general_key')).toBe('general_value');
  });

  it('should handle store prefixes correctly', async () => {
    await memory.store('summary:fact:user:name', 'John');
    
    // Should be stored as 'fact:user:name' in summary store
    expect(await summaryStore.retrieve('fact:user:name')).toBe('John');
  });

  it('should clear all stores', async () => {
    await memory.store('conversation:messages', [{ role: 'user', content: 'Test' }]);
    await memory.store('summary:fact:test', 'value');
    await memory.store('default_value', 'test');
    
    await memory.clear();
    
    expect(await memory.retrieve('conversation:messages')).toBeUndefined();
    expect(await memory.retrieve('summary:fact:test')).toBeUndefined();
    expect(await memory.retrieve('default_value')).toBeUndefined();
  });

  it('should forget from specific stores', async () => {
    await memory.store('summary:fact:test', 'value');
    
    await memory.forget('summary:fact:test');
    
    expect(await memory.retrieve('summary:fact:test')).toBeUndefined();
  });
});