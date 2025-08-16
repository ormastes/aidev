import WebSocket from 'ws';
import { WSEventType } from './src/types/chat';

console.log('🔍 Debugging Claude connection...');

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('🔄 TypeScript WebSocket connected');
  
  const joinMessage = {
    type: WSEventType.JOIN_ROOM,
    payload: {
      roomId: 'demo-room',
      username: 'Claude',
      isAgent: true
    },
    timestamp: new Date()
  };
  
  console.log('📤 Sending:', JSON.stringify(joinMessage, null, 2));
  ws.send(JSON.stringify(joinMessage));
});

ws.on('message', (data) => {
  console.log('📨 Received message');
  try {
    const message = JSON.parse(data.toString());
    console.log('🔄 Parsed:', message.type);
    
    if (message.type === 'room_state') {
      console.log('🎉 In Progress joined room!');
      ws.close();
    }
  } catch (error) {
    console.error('❌ Parse error:', error);
  }
});

ws.on('close', () => {
  console.log('🔚 Connection closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('💥 WebSocket error:', error);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('⏰ Timeout - closing connection');
  ws.close();
  process.exit(1);
}, 5000);