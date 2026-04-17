import { type Socket, io } from 'socket.io-client';
import { create } from 'zustand';

interface WsState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

export const useWsStore = create<WsState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string) => {
    const { socket } = get();
    if (socket?.connected) return;

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
        'http://localhost:8080',
      {
        auth: { token },
        transports: ['websocket'],
      },
    );

    newSocket.on('connect', () => {
      console.log('[WS Member] Connected');
      set({ isConnected: true });
    });

    newSocket.on('disconnect', () => {
      console.log('[WS Member] Disconnected');
      set({ isConnected: false });
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[WS Member] Connection error:', err.message);
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
