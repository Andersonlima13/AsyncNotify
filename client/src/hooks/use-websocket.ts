import { useState, useEffect, useCallback } from 'react';

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: string | null;
  sendMessage: (message: string) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    newSocket.onmessage = (event) => {
      setLastMessage(event.data);
    };

    newSocket.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        connect();
      }, 3000);
    };

    newSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setSocket(newSocket);
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback((message: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }, [socket]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}
