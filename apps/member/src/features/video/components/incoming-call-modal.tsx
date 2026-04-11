'use client';

import { useWsStore } from '@/lib/ws';
import { Phone, PhoneOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

interface NotificationPayload {
  eventType: string;
  data: { sessionId: string };
}

export function IncomingCallModal() {
  const router = useRouter();
  const socket = useWsStore((s) => s.socket);
  const [incomingSession, setIncomingSession] = useState<{ id: string } | null>(
    null,
  );

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (payload: NotificationPayload) => {
      if (payload.eventType === 'video.call.incoming') {
        setIncomingSession({ id: payload.data.sessionId });
      } else if (
        payload.eventType === 'video.call.missed' ||
        payload.eventType === 'video.call.ended'
      ) {
        if (incomingSession?.id === payload.data.sessionId) {
          setIncomingSession(null);
        }
      }
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, incomingSession]);

  if (!incomingSession) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center zoom-in-95 duration-300">
        {/* Ringing Avatar Animation */}
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-teal-500 rounded-full animate-ping opacity-20" />
          <div className="absolute inset-2 bg-teal-500 rounded-full animate-ping opacity-40 animation-delay-150" />
          <div className="absolute inset-4 bg-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <Phone className="w-8 h-8 text-white animate-pulse" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          Incoming Video Call
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Your doctor is ready for the consultation.
        </p>

        <div className="flex items-center gap-6 w-full justify-center">
          <button
            onClick={() => setIncomingSession(null)}
            className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              const sid = incomingSession.id;
              setIncomingSession(null);
              router.push(`/video/${sid}`);
            }}
            className="w-16 h-16 rounded-full bg-teal-500 text-white flex items-center justify-center hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/30 animate-bounce"
          >
            <Phone className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
