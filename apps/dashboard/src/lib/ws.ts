import { useAuthStore } from '../features/auth/store/auth.store';
import { type Socket, io } from 'socket.io-client';
import { create } from 'zustand';

interface WsState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useWsStore = create<WsState>((set, get) => ({
  socket: null,
  isConnected: false,
  connect: () => {
    const { socket } = get();
    if (socket?.connected) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const newSocket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      set({ isConnected: true });
    });

    newSocket.on('disconnect', () => {
      set({ isConnected: false });
    });

    newSocket.on('connect_error', (err) => {
      console.error('WS Connection error:', err);
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
