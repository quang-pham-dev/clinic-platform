import { Button } from '@clinic-platform/ui';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
} from 'lucide-react';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex items-center gap-4 bg-gray-900/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-gray-800 shadow-xl mx-auto w-fit">
      <Button
        variant={isAudioEnabled ? 'outline' : 'default'}
        size="icon"
        onClick={onToggleAudio}
        className={`w-12 h-12 rounded-full transition-all ${
          !isAudioEnabled
            ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
        title={isAudioEnabled ? 'Mute' : 'Unmute'}
      >
        {isAudioEnabled ? (
          <Mic className="w-5 h-5" />
        ) : (
          <MicOff className="w-5 h-5" />
        )}
      </Button>

      <Button
        variant={isVideoEnabled ? 'outline' : 'default'}
        size="icon"
        onClick={onToggleVideo}
        className={`w-12 h-12 rounded-full transition-all ${
          !isVideoEnabled
            ? 'bg-red-500 hover:bg-red-600 border-red-500 text-white'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? (
          <Camera className="w-5 h-5" />
        ) : (
          <CameraOff className="w-5 h-5" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleScreenShare}
        className={`w-12 h-12 rounded-full transition-all ${
          isScreenSharing
            ? 'bg-teal-500 hover:bg-teal-600 border-teal-500 text-white shadow-lg shadow-teal-500/20'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
        title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
      >
        <MonitorUp className="w-5 h-5" />
      </Button>

      <div className="w-px h-8 bg-gray-700 mx-2" />

      <Button
        size="icon"
        onClick={onEndCall}
        className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all"
        title="End call"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>
    </div>
  );
}
