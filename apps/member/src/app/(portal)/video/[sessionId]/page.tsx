'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { CallControls } from '@/features/video/components/call-controls';
import { ChatPanel } from '@/features/video/components/chat-panel';
import { ConnectionIndicator } from '@/features/video/components/connection-indicator';
import { VideoPlayer } from '@/features/video/components/video-player';
import { useVideoCall } from '@/features/video/hooks/use-video-call';
import { apiHooks } from '@/lib/api';
import { VideoSessionStatus } from '@clinic-platform/types';
import { Button } from '@clinic-platform/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, PhoneOff } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function VideoRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL || 'http://localhost:3000';

  // Fetch session details + credentials
  const { data: sessionData, isLoading: isLoadingSession } =
    apiHooks.videoSessions.useVideoSession(sessionId);
  const { data: iceData } = useQuery({
    queryKey: ['video-sessions', 'ice-config', sessionId],
    queryFn: async () => {
      const res = await fetch(
        `\${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1'}/video-sessions/\${sessionId}/ice-config`,
        {
          headers: { Authorization: `Bearer \${token}` },
        },
      );
      return res.json();
    },
    enabled: !!sessionId && !!token,
  });

  const { data: chatHistory } =
    apiHooks.videoSessions.useChatHistory(sessionId);

  const { mutate: endApiCall } = apiHooks.videoSessions.useEndSession({
    onSuccess: () => router.push('/appointments'),
  });

  const session = sessionData?.data;
  // Patient is the answerer
  const isInitiator = false;

  const handleCallEnded = () => {};

  const handleCallMissed = () => {};

  const videoParams = useVideoCall({
    wsUrl,
    token: token || '',
    sessionId,
    isInitiator,
    iceConfig: iceData?.data,
    onCallEnded: handleCallEnded,
    onCallMissed: handleCallMissed,
  });

  useEffect(() => {
    if (chatHistory?.data && videoParams.messages.length === 0) {
      videoParams.setMessages(chatHistory.data);
    }
  }, [chatHistory?.data]);

  const handleEndCall = () => {
    videoParams.endCall();
    endApiCall(sessionId);
  };

  if (isLoadingSession || !session) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  // --- STATE OVERLAYS (WAITING, ENDED, MISSED, FAILED) ---

  if (
    session.status === VideoSessionStatus.ENDED ||
    session.status === VideoSessionStatus.MISSED ||
    session.status === VideoSessionStatus.FAILED
  ) {
    return (
      <div className="h-[calc(100vh-80px)] flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center shadow-lg">
          <PhoneOff className="w-10 h-10 text-gray-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {session.status === VideoSessionStatus.ENDED
              ? 'Call Ended'
              : session.status === VideoSessionStatus.MISSED
                ? 'Call Missed'
                : 'Connection Failed'}
          </h2>
          <p className="text-gray-400">
            {session.status === VideoSessionStatus.ENDED
              ? 'The video consultation has concluded.'
              : 'The call was not answered in time.'}
          </p>
        </div>
        <Button
          onClick={() => router.push(`/appointments`)}
          className="w-full bg-teal-500 hover:bg-teal-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] -mt-4 bg-black rounded-3xl flex overflow-hidden border border-gray-800 shadow-2xl relative">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-gray-900 to-black">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/appointments/\${session.appointmentId}`)
              }
              className="bg-black/50 border-gray-700 text-white hover:bg-black/70 backdrop-blur-md rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Details
            </Button>
          </div>

          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            {session.status === VideoSessionStatus.WAITING && (
              <div className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium backdrop-blur-md flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for
                doctor...
              </div>
            )}
            <ConnectionIndicator quality={videoParams.quality} />
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          {session.status === VideoSessionStatus.WAITING ? (
            <div className="w-full max-w-3xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
              <VideoPlayer
                stream={videoParams.localStream}
                isLocal
                isMuted
                name="You"
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col md:flex-row gap-4 p-4 pb-24">
              <div className="flex-1 min-h-0 relative rounded-3xl overflow-hidden border-2 border-gray-800/50 shadow-2xl">
                <VideoPlayer stream={videoParams.remoteStream} name="Doctor" />

                {/* Picture in Picture Local Video */}
                <div className="absolute bottom-6 left-6 w-32 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700 z-20 transition-all hover:scale-105">
                  <VideoPlayer
                    stream={videoParams.localStream}
                    isLocal
                    isMuted
                    name="You"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Call Controls Absolute Center Bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <CallControls
            isAudioEnabled={videoParams.isAudioEnabled}
            isVideoEnabled={videoParams.isVideoEnabled}
            isScreenSharing={videoParams.isScreenSharing}
            onToggleAudio={videoParams.toggleAudio}
            onToggleVideo={videoParams.toggleVideo}
            onToggleScreenShare={videoParams.toggleScreenShare}
            onEndCall={handleEndCall}
          />
        </div>
      </div>

      {/* Chat Sidebar */}
      <ChatPanel
        messages={videoParams.messages}
        currentUserId={user?.id || ''}
        onSendMessage={videoParams.sendChat}
      />
    </div>
  );
}
