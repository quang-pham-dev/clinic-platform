import { User } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  isLocal?: boolean;
  name?: string;
}

export function VideoPlayer({
  stream,
  isMuted = false,
  isLocal = false,
  name,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream
    ?.getVideoTracks()
    .some((t) => t.enabled && t.readyState === 'live');

  return (
    <div
      className={`relative w-full h-full bg-gray-900 overflow-hidden rounded-2xl flex items-center justify-center border border-gray-800 ${isLocal ? 'shadow-lg border-gray-700/50' : ''}`}
    >
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted || isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <span className="text-sm font-medium">
            {hasVideo === false ? 'Camera is off' : 'Connecting...'}
          </span>
        </div>
      )}

      {name && (
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white text-sm font-medium">
          {name} {isLocal && '(You)'}
        </div>
      )}
    </div>
  );
}
