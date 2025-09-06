import { useEffect, useRef, useCallback } from 'react';
import { wsClient } from '@/lib/websocket';

export function useWebSocket() {
  const isConnectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (!isConnectedRef.current) {
      try {
        await wsClient.connect();
        isConnectedRef.current = true;
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        throw error;
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    wsClient.disconnect();
    isConnectedRef.current = false;
  }, []);

  const send = useCallback((message: any) => {
    wsClient.send(message);
  }, []);

  const on = useCallback((event: string, callback: Function) => {
    wsClient.on(event, callback);
    return () => wsClient.off(event, callback);
  }, []);

  useEffect(() => {
    const handleDisconnected = () => {
      isConnectedRef.current = false;
    };

    const handleConnected = () => {
      isConnectedRef.current = true;
    };

    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);

    return () => {
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
    };
  }, []);

  return {
    connect,
    disconnect,
    send,
    on,
    isConnected: () => wsClient.isConnected(),
    getReadyState: () => wsClient.getReadyState()
  };
}
