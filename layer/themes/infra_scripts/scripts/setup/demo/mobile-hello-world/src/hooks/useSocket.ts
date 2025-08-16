import { useState, useEffect } from 'react';

interface UseSocketReturn {
  connected: boolean;
  sendMessage: (type: string, data: any) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Simulate connection check
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:3456/api/health');
        if (response.ok) {
          setConnected(true);
        }
      } catch (error) {
        setConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const sendMessage = (type: string, data: any) => {
    // In a real implementation, this would send via WebSocket
    console.log('Sending message:', { type, data });
    
    // For demo purposes, just log and potentially send HTTP request
    if (connected) {
      fetch('http://localhost:3456/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data }),
      }).catch(error => {
        console.log('Failed to send message to server:', error);
      });
    }
  };

  return { connected, sendMessage };
};