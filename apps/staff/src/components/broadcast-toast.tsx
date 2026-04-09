'use client';

import { useWsStore } from '@/lib/ws';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface BroadcastPayload {
  id: string;
  message: string;
  targetRoom: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
  sentAt: string;
}

export function BroadcastToast() {
  const socket = useWsStore((s) => s.socket);

  useEffect(() => {
    if (!socket) return;

    const handleBroadcast = (payload: BroadcastPayload) => {
      toast.info(payload.message, {
        description: `From ${payload.sender.fullName} · ${payload.sender.role.replace('_', ' ')}`,
        duration: 8000,
        icon: '📢',
      });
    };

    socket.on('broadcast', handleBroadcast);
    return () => {
      socket.off('broadcast', handleBroadcast);
    };
  }, [socket]);

  return null; // Renders nothing — just subscribes to socket events
}
