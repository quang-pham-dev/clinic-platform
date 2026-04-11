import type {
  ChatMessagePayload,
  ConnectionQuality,
} from '@clinic-platform/api-client/webrtc';
import {
  PeerConnectionManager,
  SignalingClient,
} from '@clinic-platform/api-client/webrtc';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseVideoCallProps {
  wsUrl: string;
  token: string;
  sessionId: string;
  isInitiator: boolean;
  iceConfig?: RTCConfiguration;
  onCallEnded?: () => void;
  onCallMissed?: () => void;
  onError?: (err: Error) => void;
}

export function useVideoCall({
  wsUrl,
  token,
  sessionId,
  isInitiator,
  iceConfig,
  onCallEnded,
  onCallMissed,
  onError,
}: UseVideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>('new');
  const [quality, setQuality] = useState<ConnectionQuality>('unknown');
  const [messages, setMessages] = useState<ChatMessagePayload[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const signaling = useRef<SignalingClient | null>(null);
  const pcInfo = useRef<PeerConnectionManager | null>(null);

  const initMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (err: unknown) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  };

  useEffect(() => {
    if (!iceConfig) return; // Wait for ICE config

    const sig = new SignalingClient();
    signaling.current = sig;

    const pc = new PeerConnectionManager(iceConfig);
    pcInfo.current = pc;

    pc.onRemoteStream = (stream) => setRemoteStream(stream);
    pc.onConnectionStateChange = (state) => setConnectionState(state);
    pc.onQualityChange = (q) => setQuality(q);
    pc.onIceCandidate = (candidate) => sig.sendIceCandidate(candidate);

    sig.on('connected', () => {
      console.log('[Signaling] Connected to /video');
    });

    sig.on('error', (...args: unknown[]) => {
      const err = args[0] as Error | undefined;
      console.error('[Signaling] Error:', err);
      onError?.(new Error(err?.message || 'Signaling error'));
    });

    sig.on('session:ended', () => {
      pc.close();
      onCallEnded?.();
    });

    sig.on('session:missed', () => {
      pc.close();
      onCallMissed?.();
    });

    sig.on('peer:joined', async () => {
      console.log('[Signaling] Peer joined');
      if (isInitiator) {
        try {
          const offer = await pc.createOffer();
          sig.sendOffer(offer);
        } catch (err: unknown) {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

    sig.on('offer', async (...args: unknown[]) => {
      const data = args[0] as { sdp: RTCSessionDescriptionInit };
      try {
        await pc.setRemoteDescription(data.sdp);
        const answer = await pc.createAnswer();
        sig.sendAnswer(answer);
      } catch (err: unknown) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    });

    sig.on('answer', async (...args: unknown[]) => {
      const data = args[0] as { sdp: RTCSessionDescriptionInit };
      try {
        await pc.setRemoteDescription(data.sdp);
        pc.startStatsPolling();
      } catch (err: unknown) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    });

    sig.on('ice-candidate', async (...args: unknown[]) => {
      const data = args[0] as { candidate: RTCIceCandidateInit };
      try {
        await pc.addIceCandidate(data.candidate);
      } catch {
        // Ignored — ICE candidates can fail harmlessly
      }
    });

    sig.on('chat:message', (...args: unknown[]) => {
      const data = args[0] as ChatMessagePayload;
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    // Start flow
    initMedia().then((stream) => {
      if (stream) {
        pc.addLocalStream(stream);
        sig.connect(wsUrl, token, sessionId);
      }
    });

    return () => {
      pc.close();
      sig.disconnect();
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [sessionId, iceConfig, isInitiator, wsUrl, token]);

  const toggleAudio = useCallback(() => {
    pcInfo.current?.toggleAudio(!isAudioEnabled);
    setIsAudioEnabled(!isAudioEnabled);
  }, [isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    pcInfo.current?.toggleVideo(!isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  }, [isVideoEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!pcInfo.current || !localStream) return;

    if (isScreenSharing) {
      const cameraTrack = localStream.getVideoTracks()[0];
      if (cameraTrack) {
        pcInfo.current.replaceVideoTrack(cameraTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          // @ts-expect-error — cursor is a valid option but not in all TS lib defs
          video: { cursor: 'always' },
          audio: false,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (screenTrack) {
          pcInfo.current.replaceVideoTrack(screenTrack);
          setIsScreenSharing(true);

          screenTrack.onended = () => {
            const cameraTrack = localStream.getVideoTracks()[0];
            if (cameraTrack) {
              pcInfo.current?.replaceVideoTrack(cameraTrack);
            }
            setIsScreenSharing(false);
          };
        }
      } catch (err: unknown) {
        // User cancelled picker
        console.warn('Screen share cancelled', err);
      }
    }
  }, [isScreenSharing, localStream]);

  const sendChat = useCallback((message: string) => {
    signaling.current?.sendChat(message);
  }, []);

  const endCall = useCallback(() => {
    pcInfo.current?.close();
    signaling.current?.disconnect();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    // We expect parent to also call the API PATCH /video-sessions/:id/end
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    connectionState,
    quality,
    messages,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    setMessages, // For initial history fetch
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChat,
    endCall,
  };
}
