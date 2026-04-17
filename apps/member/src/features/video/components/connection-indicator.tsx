import type { ConnectionQuality } from '@clinic-platform/api-client/webrtc';
import { Wifi, WifiOff } from 'lucide-react';
import React from 'react';

export function ConnectionIndicator({
  quality,
}: {
  quality: ConnectionQuality;
}) {
  if (quality === 'unknown') return null;

  const config = {
    good: { color: 'text-green-400', label: 'Good' },
    fair: { color: 'text-yellow-400', label: 'Fair' },
    poor: { color: 'text-red-400', label: 'Poor' },
  }[quality];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-gray-800/50"
      title={`Connection Quality: ${config.label}`}
    >
      {quality === 'poor' ? (
        <WifiOff className={`w-4 h-4 ${config.color}`} />
      ) : (
        <Wifi className={`w-4 h-4 ${config.color}`} />
      )}
      <span className={`text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}
