export class InMemoryStorage {
  private data = new Map<string, any>();
  
  async store(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }
  
  async retrieve(key: string): Promise<any> {
    return this.data.get(key);
  }
  
  forget(key: string): Promise<void> {
    this.data.delete(key);
  }
  
  async clear(): Promise<void> {
    this.data.clear();
  }
}