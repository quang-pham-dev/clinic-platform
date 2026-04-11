export type ConnectionQuality = 'good' | 'fair' | 'poor' | 'unknown';

export class PeerConnectionManager {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private statsInterval: ReturnType<typeof setInterval> | null = null;

  // Callbacks
  public onRemoteStream?: (stream: MediaStream) => void;
  public onIceCandidate?: (candidate: RTCIceCandidate) => void;
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onQualityChange?: (quality: ConnectionQuality) => void;

  constructor(configuration?: RTCConfiguration) {
    this.pc = new RTCPeerConnection(configuration);

    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0] && this.onRemoteStream) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }

      // Stop stats polling on disconnect
      if (
        this.pc.connectionState === 'disconnected' ||
        this.pc.connectionState === 'failed' ||
        this.pc.connectionState === 'closed'
      ) {
        this.stopStatsPolling();
      }
    };
  }

  addLocalStream(stream: MediaStream) {
    this.localStream = stream;
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return this.pc.localDescription!;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return this.pc.localDescription!;
  }

  async setRemoteDescription(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (candidate) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  replaceVideoTrack(newTrack: MediaStreamTrack) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  startStatsPolling(intervalMs = 3000) {
    if (this.statsInterval) clearInterval(this.statsInterval);

    this.statsInterval = setInterval(async () => {
      if (this.pc.connectionState !== 'connected') return;

      try {
        const stats = await this.pc.getStats();
        let quality: ConnectionQuality = 'unknown';

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            const lost = report.packetsLost ?? 0;
            const received = report.packetsReceived ?? 1;
            const lossRate = lost / (lost + received);

            if (lossRate < 0.02) quality = 'good';
            else if (lossRate < 0.08) quality = 'fair';
            else quality = 'poor';
          }
        });

        if (quality !== 'unknown' && this.onQualityChange) {
          this.onQualityChange(quality);
        }
      } catch {
        // Ignore stats errors
      }
    }, intervalMs);
  }

  stopStatsPolling() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  close() {
    this.stopStatsPolling();
    this.pc.close();
  }
}
