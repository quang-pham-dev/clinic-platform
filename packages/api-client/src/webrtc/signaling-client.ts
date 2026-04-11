import { type Socket, io } from 'socket.io-client';

type EventCallback = (...args: unknown[]) => void;

export type SignalingEvent =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'session:ready'
  | 'session:ended'
  | 'session:missed'
  | 'peer:joined'
  | 'peer:left'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'chat:message';

export interface ChatMessagePayload {
  id: string;
  senderId: string;
  message: string;
  createdAt: string;
}

export class SignalingClient {
  private socket: Socket | null = null;
  private listeners: Map<SignalingEvent, Set<EventCallback>> = new Map();

  constructor() {
    this.handleSocketEvent = this.handleSocketEvent.bind(this);
  }

  connect(wsUrl: string, token: string, sessionId: string) {
    if (this.socket?.connected) {
      if (this.socket.io.opts.query?.sessionId === sessionId) return;
      this.disconnect();
    }

    this.socket = io(`\${wsUrl}/video`, {
      auth: { token },
      query: { sessionId },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => this.emit('connected'));
    this.socket.on('disconnect', () => this.emit('disconnected'));
    this.socket.on('connect_error', (err) => this.emit('error', err));
    this.socket.on('error', (err) => this.emit('error', err));

    this.socket.on('session:ready', (data) => this.emit('session:ready', data));
    this.socket.on('session:ended', () => this.emit('session:ended'));
    this.socket.on('session:missed', () => this.emit('session:missed'));

    this.socket.on('peer:joined', (data) => this.emit('peer:joined', data));
    this.socket.on('peer:left', (data) => this.emit('peer:left', data));

    this.socket.on('offer', (data) => this.emit('offer', data));
    this.socket.on('answer', (data) => this.emit('answer', data));
    this.socket.on('ice-candidate', (data) => this.emit('ice-candidate', data));
    this.socket.on('chat:message', (data) => this.emit('chat:message', data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // --- Emit to Server ---

  sendOffer(sdp: RTCSessionDescriptionInit) {
    this.socket?.emit('offer', { sdp });
  }

  sendAnswer(sdp: RTCSessionDescriptionInit) {
    this.socket?.emit('answer', { sdp });
  }

  sendIceCandidate(candidate: RTCIceCandidate | RTCIceCandidateInit) {
    this.socket?.emit('ice-candidate', { candidate });
  }

  sendChat(message: string) {
    this.socket?.emit('chat:message', { message });
  }

  // --- Local Event Emitter ---

  on(event: SignalingEvent, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: SignalingEvent, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: SignalingEvent, ...args: unknown[]) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  private handleSocketEvent() {
    // Utility to bind socket events dynamically if needed
  }
}
