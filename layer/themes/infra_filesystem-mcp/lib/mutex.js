#!/usr/bin/env node

/**
 * Mutex implementation for preventing race conditions
 * Used for synchronizing access to NAME_ID.vf.json
 */

class Mutex {
  constructor() {
    this.locked = false;
    this.waitingQueue = [];
  }

  /**
   * Acquire the mutex lock
   * @returns {Promise} Resolves when lock is acquired
   */
  async acquire() {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waitingQueue.push(resolve);
      }
    });
  }

  /**
   * Release the mutex lock
   */
  release() {
    if (this.waitingQueue.length > 0) {
      const resolve = this.waitingQueue.shift();
      resolve();
    } else {
      this.locked = false;
    }
  }

  /**
   * Execute a function with mutex protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of the function
   */
  async withLock(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Check if mutex is currently locked
   * @returns {boolean}
   */
  isLocked() {
    return this.locked;
  }

  /**
   * Get number of waiting operations
   * @returns {number}
   */
  getQueueLength() {
    return this.waitingQueue.length;
  }
}

/**
 * Named mutex registry for managing multiple mutexes
 */
class MutexRegistry {
  constructor() {
    this.mutexes = new Map();
  }

  /**
   * Get or create a named mutex
   * @param {string} name - Mutex name
   * @returns {Mutex}
   */
  getMutex(name) {
    if (!this.mutexes.has(name)) {
      this.mutexes.set(name, new Mutex());
    }
    return this.mutexes.get(name);
  }

  /**
   * Execute a function with named mutex protection
   * @param {string} name - Mutex name
   * @param {Function} fn - Async function to execute
   * @returns {Promise}
   */
  async withLock(name, fn) {
    const mutex = this.getMutex(name);
    return mutex.withLock(fn);
  }

  /**
   * Clear all mutexes
   */
  clear() {
    this.mutexes.clear();
  }

  /**
   * Get status of all mutexes
   * @returns {Object}
   */
  getStatus() {
    const status = {};
    for (const [name, mutex] of this.mutexes) {
      status[name] = {
        locked: mutex.isLocked(),
        queueLength: mutex.getQueueLength()
      };
    }
    return status;
  }
}

// Singleton instance for global mutex registry
const globalRegistry = new MutexRegistry();

module.exports = {
  Mutex,
  MutexRegistry,
  globalRegistry
};

// Example usage and testing
if (require.main === module) {
  async function testMutex() {
    console.log('Testing Mutex implementation...\n');
    
    const mutex = new Mutex();
    const results = [];
    
    // Simulate concurrent operations
    const operations = [];
    for (let i = 0; i < 10; i++) {
      operations.push(
        mutex.withLock(async () => {
          console.log(`Operation ${i} started`);
          // Simulate work
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          results.push(i);
          console.log(`Operation ${i} completed`);
          return i;
        })
      );
    }
    
    await Promise.all(operations);
    
    console.log('\nResults order:', results);
    console.log('All operations completed in order:', 
      results.every((val, idx) => idx === 0 || val > results[idx - 1]));
    
    // Test registry
    console.log('\nTesting MutexRegistry...');
    const registry = new MutexRegistry();
    
    const concurrentOps = [];
    for (let i = 0; i < 5; i++) {
      concurrentOps.push(
        registry.withLock('test-resource', async () => {
          console.log(`Registry operation ${i} executing`);
          await new Promise(resolve => setTimeout(resolve, 50));
          return i;
        })
      );
    }
    
    await Promise.all(concurrentOps);
    console.log('Registry test completed');
    console.log('Final status:', registry.getStatus());
  }
  
  testMutex().catch(console.error);
}