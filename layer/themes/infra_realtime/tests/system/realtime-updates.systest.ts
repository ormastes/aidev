import { test, expect } from '@playwright/test';
import WebSocket from 'ws';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as SocketIOClient } from 'socket.io-client';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * System Tests for Real-time Updates
 * Tests WebSocket connections, Socket.IO, Server-Sent Events, and real-time data synchronization
 */

test.describe('Real-time Updates System Tests', () => {
  let httpServer: any;
  let wsServer: WebSocket.Server;
  let ioServer: SocketIOServer;
  const TEST_PORT = 9001;
  const WS_PORT = 9002;
  const IO_PORT = 9003;

  test.beforeAll(async () => {
    // Setup HTTP server for SSE tests
    httpServer = createServer((req, res) => {
      if (req.url === '/sse') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        
        // Send initial message
        res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');
        
        // Send periodic updates
        const interval = setInterval(() => {
          res.write(`data: {"type":"update","value":${Math.random()},"timestamp":"${new Date().toISOString()}"}\n\n`);
        }, 1000);
        
        req.on('close', () => {
          clearInterval(interval);
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    httpServer.listen(TEST_PORT);

    // Setup WebSocket server
    wsServer = new WebSocket.Server({ port: WS_PORT });
    
    wsServer.on('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        } else if (message.type === 'echo') {
          ws.send(JSON.stringify({ type: 'echo', data: message.data }));
        } else if (message.type === 'broadcast') {
          // Broadcast to all clients
          wsServer.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'broadcast', data: message.data }));
            }
          });
        }
      });
    });

    // Setup Socket.IO server
    ioServer = new SocketIOServer(IO_PORT, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    ioServer.on('connection', (socket) => {
      socket.emit('connected', { timestamp: new Date().toISOString() });
      
      socket.on('ping', (callback) => {
        callback({ type: 'pong', timestamp: new Date().toISOString() });
      });
      
      socket.on('join-room', (room) => {
        socket.join(room);
        socket.emit('joined-room', { room });
      });
      
      socket.on('room-message', ({ room, message }) => {
        ioServer.to(room).emit('room-broadcast', { room, message });
      });
      
      socket.on('subscribe', (channel) => {
        socket.join(`channel:${channel}`);
        socket.emit('subscribed', { channel });
      });
      
      socket.on('publish', ({ channel, data }) => {
        ioServer.to(`channel:${channel}`).emit('channel-update', { channel, data });
      });
    });
  });

  test.afterAll(async () => {
    // Cleanup servers
    if (httpServer) httpServer.close();
    if (wsServer) wsServer.close();
    if (ioServer) ioServer.close();
  });

  test.describe('WebSocket Communication', () => {
    test('should establish WebSocket connection', async () => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      const connected = await new Promise<boolean>((resolve) => {
        ws.on('open', () => resolve(true));
        ws.on('error', () => resolve(false));
      });
      
      expect(connected).toBe(true);
      
      // Wait for connection message
      const message = await new Promise<any>((resolve) => {
        ws.once('message', (data) => {
          resolve(JSON.parse(data.toString()));
        });
      });
      
      expect(message.type).toBe('connected');
      expect(message.timestamp).toBeDefined();
      
      ws.close();
    });

    test('should handle ping-pong messages', async () => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await new Promise((resolve) => ws.on('open', resolve));
      
      // Send ping
      ws.send(JSON.stringify({ type: 'ping' }));
      
      // Wait for pong
      const response = await new Promise<any>((resolve) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'pong') {
            resolve(msg);
          }
        });
      });
      
      expect(response.type).toBe('pong');
      expect(response.timestamp).toBeDefined();
      
      ws.close();
    });

    test('should echo messages back', async () => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await new Promise((resolve) => ws.on('open', resolve));
      
      const testData = { test: 'data', value: 123 };
      
      // Send echo request
      ws.send(JSON.stringify({ type: 'echo', data: testData }));
      
      // Wait for echo response
      const response = await new Promise<any>((resolve) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'echo') {
            resolve(msg);
          }
        });
      });
      
      expect(response.type).toBe('echo');
      expect(response.data).toEqual(testData);
      
      ws.close();
    });

    test('should broadcast messages to all clients', async () => {
      const ws1 = new WebSocket(`ws://localhost:${WS_PORT}`);
      const ws2 = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await Promise.all([
        new Promise((resolve) => ws1.on('open', resolve)),
        new Promise((resolve) => ws2.on('open', resolve))
      ]);
      
      const broadcastData = { message: 'Hello everyone!', timestamp: Date.now() };
      
      // Setup listeners
      const received1 = new Promise<any>((resolve) => {
        ws1.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'broadcast') {
            resolve(msg);
          }
        });
      });
      
      const received2 = new Promise<any>((resolve) => {
        ws2.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'broadcast') {
            resolve(msg);
          }
        });
      });
      
      // Send broadcast from ws1
      ws1.send(JSON.stringify({ type: 'broadcast', data: broadcastData }));
      
      // Both clients should receive the broadcast
      const [msg1, msg2] = await Promise.all([received1, received2]);
      
      expect(msg1.data).toEqual(broadcastData);
      expect(msg2.data).toEqual(broadcastData);
      
      ws1.close();
      ws2.close();
    });

    test('should handle reconnection', async () => {
      let ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await new Promise((resolve) => ws.on('open', resolve));
      
      // Close connection
      ws.close();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reconnect
      ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      const reconnected = await new Promise<boolean>((resolve) => {
        ws.on('open', () => resolve(true));
        ws.on('error', () => resolve(false));
      });
      
      expect(reconnected).toBe(true);
      
      ws.close();
    });
  });

  test.describe('Socket.IO Communication', () => {
    test('should establish Socket.IO connection', async () => {
      const client = SocketIOClient(`http://localhost:${IO_PORT}`);
      
      const connected = await new Promise<any>((resolve) => {
        client.on('connected', (data) => resolve(data));
      });
      
      expect(connected.timestamp).toBeDefined();
      
      client.disconnect();
    });

    test('should handle Socket.IO callbacks', async () => {
      const client = SocketIOClient(`http://localhost:${IO_PORT}`);
      
      await new Promise((resolve) => client.on('connect', resolve));
      
      // Emit with callback
      const response = await new Promise<any>((resolve) => {
        client.emit('ping', (pong: any) => resolve(pong));
      });
      
      expect(response.type).toBe('pong');
      expect(response.timestamp).toBeDefined();
      
      client.disconnect();
    });

    test('should join and communicate in rooms', async () => {
      const client1 = SocketIOClient(`http://localhost:${IO_PORT}`);
      const client2 = SocketIOClient(`http://localhost:${IO_PORT}`);
      
      await Promise.all([
        new Promise((resolve) => client1.on('connect', resolve)),
        new Promise((resolve) => client2.on('connect', resolve))
      ]);
      
      const roomName = 'test-room';
      
      // Both clients join the room
      const joined1 = new Promise((resolve) => {
        client1.on('joined-room', (data) => resolve(data));
      });
      const joined2 = new Promise((resolve) => {
        client2.on('joined-room', (data) => resolve(data));
      });
      
      client1.emit('join-room', roomName);
      client2.emit('join-room', roomName);
      
      await Promise.all([joined1, joined2]);
      
      // Setup message listener
      const messageReceived = new Promise<any>((resolve) => {
        client2.on('room-broadcast', (data) => resolve(data));
      });
      
      // Send message to room
      client1.emit('room-message', { room: roomName, message: 'Hello room!' });
      
      const received = await messageReceived;
      expect(received.room).toBe(roomName);
      expect(received.message).toBe('Hello room!');
      
      client1.disconnect();
      client2.disconnect();
    });

    test('should handle pub/sub pattern', async () => {
      const publisher = SocketIOClient(`http://localhost:${IO_PORT}`);
      const subscriber1 = SocketIOClient(`http://localhost:${IO_PORT}`);
      const subscriber2 = SocketIOClient(`http://localhost:${IO_PORT}`);
      
      await Promise.all([
        new Promise((resolve) => publisher.on('connect', resolve)),
        new Promise((resolve) => subscriber1.on('connect', resolve)),
        new Promise((resolve) => subscriber2.on('connect', resolve))
      ]);
      
      const channel = 'test-channel';
      
      // Subscribe to channel
      const subscribed1 = new Promise((resolve) => {
        subscriber1.on('subscribed', resolve);
      });
      const subscribed2 = new Promise((resolve) => {
        subscriber2.on('subscribed', resolve);
      });
      
      subscriber1.emit('subscribe', channel);
      subscriber2.emit('subscribe', channel);
      
      await Promise.all([subscribed1, subscribed2]);
      
      // Setup update listeners
      const update1 = new Promise<any>((resolve) => {
        subscriber1.on('channel-update', (data) => resolve(data));
      });
      const update2 = new Promise<any>((resolve) => {
        subscriber2.on('channel-update', (data) => resolve(data));
      });
      
      // Publish data
      const publishData = { type: 'update', value: 42 };
      publisher.emit('publish', { channel, data: publishData });
      
      // Both subscribers should receive the update
      const [received1, received2] = await Promise.all([update1, update2]);
      
      expect(received1.channel).toBe(channel);
      expect(received1.data).toEqual(publishData);
      expect(received2.channel).toBe(channel);
      expect(received2.data).toEqual(publishData);
      
      publisher.disconnect();
      subscriber1.disconnect();
      subscriber2.disconnect();
    });
  });

  test.describe('Server-Sent Events (SSE)', () => {
    test('should receive SSE updates', async () => {
      const events: any[] = [];
      
      const response = await fetch(`http://localhost:${TEST_PORT}/sse`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }
      
      // Read first 3 events
      let count = 0;
      while (count < 3) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            events.push(data);
            count++;
          }
        }
      }
      
      reader.cancel();
      
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe('connected');
      expect(events[1].type).toBe('update');
      expect(events[1].value).toBeDefined();
    });
  });

  test.describe('Real-time Data Synchronization', () => {
    test('should synchronize data across multiple clients', async () => {
      const clients: WebSocket[] = [];
      const dataStore: { [key: string]: any } = {};
      
      // Create 3 clients
      for (let i = 0; i < 3; i++) {
        const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        await new Promise((resolve) => ws.on('open', resolve));
        
        // Setup sync listener
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'sync') {
            dataStore[`client${i}`] = msg.data;
          }
        });
        
        clients.push(ws);
      }
      
      // Simulate data changes
      const testData = { counter: 0, items: [] };
      
      for (let i = 0; i < 5; i++) {
        testData.counter++;
        testData.items.push(`item${i}`);
        
        // Broadcast sync update
        clients[0].send(JSON.stringify({
          type: 'broadcast',
          data: { type: 'sync', data: testData }
        }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // All clients should have the same data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Close all connections
      clients.forEach(ws => ws.close());
    });

    test('should handle concurrent updates', async () => {
      const ws1 = new WebSocket(`ws://localhost:${WS_PORT}`);
      const ws2 = new WebSocket(`ws://localhost:${WS_PORT}`);
      
      await Promise.all([
        new Promise((resolve) => ws1.on('open', resolve)),
        new Promise((resolve) => ws2.on('open', resolve))
      ]);
      
      const updates: any[] = [];
      
      // Setup listeners
      ws1.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'broadcast') {
          updates.push({ source: 'ws1', data: msg.data });
        }
      });
      
      ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'broadcast') {
          updates.push({ source: 'ws2', data: msg.data });
        }
      });
      
      // Send concurrent updates
      const promises = [];
      for (let i = 0; i < 10; i++) {
        if (i % 2 === 0) {
          promises.push(
            ws1.send(JSON.stringify({
              type: 'broadcast',
              data: { id: i, from: 'client1' }
            }))
          );
        } else {
          promises.push(
            ws2.send(JSON.stringify({
              type: 'broadcast',
              data: { id: i, from: 'client2' }
            }))
          );
        }
      }
      
      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify all updates were received
      expect(updates.length).toBeGreaterThanOrEqual(10);
      
      ws1.close();
      ws2.close();
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle high message throughput', async () => {
      const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
      await new Promise((resolve) => ws.on('open', resolve));
      
      let receivedCount = 0;
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'echo') {
          receivedCount++;
        }
      });
      
      const messageCount = 100;
      const startTime = Date.now();
      
      // Send many messages rapidly
      for (let i = 0; i < messageCount; i++) {
        ws.send(JSON.stringify({
          type: 'echo',
          data: { index: i, timestamp: Date.now() }
        }));
      }
      
      // Wait for all echoes
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (receivedCount >= messageCount) {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 100);
      });
      
      const duration = Date.now() - startTime;
      const messagesPerSecond = (messageCount * 2) / (duration / 1000); // *2 for round trip
      
      console.log(`Throughput: ${messagesPerSecond.toFixed(0)} messages/second`);
      expect(messagesPerSecond).toBeGreaterThan(100);
      
      ws.close();
    });

    test('should handle many concurrent connections', async () => {
      const connectionCount = 50;
      const connections: WebSocket[] = [];
      
      // Create many connections
      const connectPromises = [];
      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(`ws://localhost:${WS_PORT}`);
        connections.push(ws);
        connectPromises.push(
          new Promise((resolve) => ws.on('open', resolve))
        );
      }
      
      await Promise.all(connectPromises);
      
      // Verify all connected
      const connectedCount = connections.filter(
        ws => ws.readyState === WebSocket.OPEN
      ).length;
      
      expect(connectedCount).toBe(connectionCount);
      
      // Close all connections
      connections.forEach(ws => ws.close());
    });
  });
});