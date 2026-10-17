import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  connectionError: null,
  emit: () => {},
  on: () => () => {},
  off: () => {},
  reconnect: () => {},
});

/**
 * Resolves the backend server URL dynamically:
 * - Honors import.meta.env.VITE_SERVER_URL or window.__SERVER_URL__ if specified
 * - If running on Vite dev port 5173, targets port 3000 on the same host/IP (handles LAN IP testing!)
 * - Otherwise falls back to window.location.origin (e.g. in unified production server)
 */
export const resolveServerUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3000';

  if (import.meta.env?.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (window.__SERVER_URL__) {
    return window.__SERVER_URL__;
  }

  const { protocol, hostname, port } = window.location;

  // If in Vite dev server (typically 5173), point to backend server at port 3000
  if (port === '5173') {
    return `${protocol}//${hostname}:3000`;
  }

  return window.location.origin;
};

export function SocketProvider({ children, serverUrl: propServerUrl }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const targetUrl = propServerUrl || resolveServerUrl();

    // Initialize socket connection with reconnection options
    const socketInstance = io(targetUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socketInstance;

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, reconnect manually
        socketInstance.connect();
      }
    };

    const handleConnectError = (error) => {
      setIsConnected(false);
      setConnectionError(error?.message || 'Connection error');
    };

    const handleReconnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);
    socketInstance.on('connect_error', handleConnectError);
    socketInstance.on('reconnect', handleReconnect);

    // Initial check in case it connected synchronously
    if (socketInstance.connected) {
      setIsConnected(true);
    }

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.off('connect_error', handleConnectError);
      socketInstance.off('reconnect', handleReconnect);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [propServerUrl]);

  const emit = useCallback((event, ...args) => {
    if (socketRef.current) {
      socketRef.current.emit(event, ...args);
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (!socketRef.current) return () => {};
    socketRef.current.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const contextValue = {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    off,
    reconnect,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Custom hook to access Socket.IO connection and helpers
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

/**
 * Convenient helper hook for subscribing to a specific socket event
 * with automatic cleanup on unmount or when handler changes.
 */
export function useSocketListener(event, handler) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !event || !handler) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler, isConnected]);
}

export default SocketContext;
