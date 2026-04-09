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
      process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:3000',
      {
        auth: { token },
        transports: ['websocket'],
      },
    );

    newSocket.on('connect', () => set({ isConnected: true }));
    newSocket.on('disconnect', () => set({ isConnected: false }));
    newSocket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
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
