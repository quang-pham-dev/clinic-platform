import { useWsStore } from '../../../lib/ws';
import { apiHooks } from '@/lib/api';
import type { BroadcastMessage } from '@clinic-platform/api-client';
import { Badge } from '@clinic-platform/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@clinic-platform/ui';
import { cn } from '@clinic-platform/ui';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Radio } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export function BroadcastFeed() {
  const { socket, isConnected } = useWsStore();
  const [liveMessages, setLiveMessages] = useState<BroadcastMessage[]>([]);

  // Fetch initial history
  const { data: historyData, isLoading } =
    apiHooks.broadcasts.useBroadcastHistory({ limit: 10 });

  // Listen to new WS events
  useEffect(() => {
    if (!socket) return;

    const handleBroadcast = (payload: BroadcastMessage) => {
      setLiveMessages((prev) => [payload, ...prev]);
    };

    socket.on('broadcast', handleBroadcast);

    return () => {
      socket.off('broadcast', handleBroadcast);
    };
  }, [socket]);

  // Combine live messages + history
  const allMessages = [...liveMessages, ...(historyData?.data || [])];
  // Remove duplicates just in case (e.g., reconnect)
  const uniqueMessages = Array.from(
    new Map(allMessages.map((m) => [m.id, m])).values(),
  ).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return (
    <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-teal-400" />
            Live Broadcast Feed
          </CardTitle>
          <CardDescription>
            Recent announcements from clinic staff
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20',
            )}
          >
            <Activity className="w-3 h-3 mr-1" />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full pr-4 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex flex-col gap-2">
                  <div className="h-4 bg-gray-800 rounded w-1/4" />
                  <div className="h-16 bg-gray-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : uniqueMessages.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-gray-500">
              No recent broadcasts
            </div>
          ) : (
            <div className="space-y-4">
              {uniqueMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 rounded-lg bg-gray-950/50 border border-gray-800/50 transition-colors hover:border-gray-700/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">
                        {msg.sender.fullName}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] uppercase bg-gray-800/50 text-gray-400 border-0"
                      >
                        {msg.sender.role.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(msg.sentAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>
                  <div className="mt-3 text-xs text-teal-500/70 font-mono">
                    target: {msg.targetRoom}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
