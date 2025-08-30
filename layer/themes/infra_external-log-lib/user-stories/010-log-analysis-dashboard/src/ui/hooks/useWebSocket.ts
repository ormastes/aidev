import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  heartbeatInterval?: number;
}

export const useWebSocket = (
  url: string, 
  options: WebSocketOptions = {}
) => {
  const {
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 10,
    heartbeatInterval = 30000
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start heartbeat
        if (heartbeatInterval > 0) {
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, heartbeatInterval);
        }
      };
      
      ws.onmessage = (event) => {
        setLastMessage(event.data);
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
        setConnectionStatus('error');
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        
        // Attempt reconnection
        if (reconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}/${reconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError(err as Error);
      setConnectionStatus('error');
    }
  }, [url, reconnect, reconnectInterval, reconnectAttempts, heartbeatInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect on URL change
  useEffect(() => {
    disconnect();
    connect();
  }, [url, disconnect, connect]);

  return {
    connectionStatus,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect
  };
};