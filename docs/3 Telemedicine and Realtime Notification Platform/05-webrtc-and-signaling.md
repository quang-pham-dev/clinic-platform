# WebRTC & Signaling
### P3: Telemedicine & Realtime Notification Platform

> **Document type:** Technical Design — WebRTC
> **Version:** 1.0.0

---

## 1. Architecture Overview

P3 uses a **signaling-only WebRTC architecture**. The NestJS server acts as a message relay for the SDP and ICE candidate exchange. Once ICE negotiation succeeds and a direct path is found, all media (video, audio, screen share) flows peer-to-peer — the server is removed from the media path entirely.

```
BROWSER A (Doctor)               NestJS SignalingWS              BROWSER B (Patient)
        │                              │                                  │
        │── join:session ─────────────►│◄──── join:session ───────────────│
        │                              │                                  │
        │◄── peer:joined ──────────────│                                  │
        │                              │                                  │
        │── signal:offer ─────────────►│──── signal:offer ───────────────►│
        │◄── signal:answer ───────────────── signal:answer ───────────────│
        │── ice-candidate ────────────►│──── ice-candidate ──────────────►│
        │◄── ice-candidate ──────────────── ice-candidate ────────────────│
        │                              │                                  │
        │◄═══════════════ P2P VIDEO / AUDIO / DATA CHANNEL ══════════════►│
        │                (server NOT in media path after this point)       │
        │── chat:message ─────────────►│──── chat:message ───────────────►│
        │                              │  (only chat remains server-relay) │
```

---

## 2. SDP Negotiation Detail

### Step-by-step flow

**1. Doctor joins room**
```javascript
// doctor's browser
socket.emit('join:session', { roomId });

// Requests camera + microphone access
const localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
});
localVideoEl.srcObject = localStream;

// Create peer connection with ICE servers from /ice-credentials
const pc = new RTCPeerConnection(iceConfig);
localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
```

**2. Patient joins → server notifies doctor**
```javascript
// Server emits to doctor
socket.on('peer:joined', async () => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('signal:offer', { roomId, sdp: pc.localDescription });
});
```

**3. Patient receives offer, creates answer**
```javascript
socket.on('signal:offer', async ({ sdp }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('signal:answer', { roomId, sdp: pc.localDescription });
});
```

**4. Doctor receives answer**
```javascript
socket.on('signal:answer', async ({ sdp }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  // ICE gathering begins automatically
});
```

**5. ICE candidates exchanged**
```javascript
// Both sides
pc.onicecandidate = ({ candidate }) => {
  if (candidate) {
    socket.emit('signal:ice-candidate', { roomId, candidate });
  }
};

socket.on('signal:ice-candidate', async ({ candidate }) => {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});
```

**6. Remote stream arrives**
```javascript
pc.ontrack = ({ streams: [remoteStream] }) => {
  remoteVideoEl.srcObject = remoteStream;
};
```

---

## 3. ICE & NAT Traversal

### When STUN is enough
If both peers are on open networks (typical home broadband or mobile), STUN is sufficient:
- STUN server returns the peer's public IP and port
- Both peers send media directly to each other's public IP

### When TURN is required
TURN is needed when one or both peers are behind **symmetric NAT** — common in:
- Corporate or hospital LAN networks
- Mobile carrier NAT (CGNAT)
- Some hotel or public Wi-Fi

Signs of TURN fallback: ICE state stays `checking` for 3+ seconds before succeeding, or `connectionState` becomes `failed` when STUN-only is set.

### ICE server configuration

```typescript
// server-side: video.service.ts
async getIceCredentials(sessionId: string, userId: string): Promise<IceConfig> {
  // Generate time-limited TURN credentials via Twilio NTS
  const client = twilio(
    process.env.TWILIO_TURN_ACCOUNT_SID,
    process.env.TWILIO_TURN_AUTH_TOKEN,
  );

  const token = await client.tokens.create({ ttl: 3600 });  // 1 hour

  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },             // Free public STUN
      ...token.iceServers,                                   // Twilio TURN servers
    ],
    expiresAt: new Date(Date.now() + 3600 * 1000),
  };
}
```

### Local / staging TURN (coturn)

```yaml
# docker-compose.yml (dev/staging only)
coturn:
  image: coturn/coturn:4.6
  network_mode: host           # Must use host networking for TURN to work
  command: >
    -n
    --log-file=stdout
    --lt-cred-mech
    --fingerprint
    --no-multicast-peers
    --no-cli
    --no-tlsv1
    --no-tlsv1_1
    --realm=clinic.local
    --static-auth-secret=dev-turn-secret
  ports:
    - "3478:3478/udp"
    - "3478:3478/tcp"
```

Generate short-term TURN credentials for `coturn`:
```typescript
// Hmac-sha1 based credential generation for coturn lt-cred-mech
const username = `${Math.floor(Date.now() / 1000) + 3600}:${userId}`;
const credential = createHmac('sha1', process.env.COTURN_SECRET)
  .update(username)
  .digest('base64');
```

---

## 4. Screen Sharing

Screen sharing replaces the local video track — no additional signaling required.

```javascript
// doctor's browser — triggered by "Share Screen" button
let screenStream: MediaStream | null = null;

async function startScreenShare() {
  screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: false,
  });

  const screenTrack = screenStream.getVideoTracks()[0];
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  await sender?.replaceTrack(screenTrack);

  // Notify peer via chat that screen share started
  socket.emit('chat:message', {
    roomId,
    message: 'Screen sharing started',
    messageType: 'text',
  });

  // Stop sharing when user clicks browser "Stop sharing" button
  screenTrack.onended = stopScreenShare;
}

async function stopScreenShare() {
  const cameraTrack = localStream.getVideoTracks()[0];
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  await sender?.replaceTrack(cameraTrack);
  screenStream?.getTracks().forEach(t => t.stop());
  screenStream = null;
}
```

The remote peer's `ontrack` event fires automatically with the replaced track — no additional WS event needed for track replacement.

---

## 5. In-call Chat & File Share

### Chat flow

1. Sender types message → `socket.emit('chat:message', ...)`
2. `SignalingGateway.handleChat()` saves to `video_chat_messages` table
3. Gateway re-emits to all members of `room:video:{roomId}` including sender
4. Both clients update their chat panel

> Why save to DB before re-emitting? If the gateway re-emits first and a DB write fails, the message appears on screen but is not in history. DB-first ensures consistency.

### File share flow

```
Client ──── POST /video-sessions/:id/files (multipart) ────► API
                                                               │
                                                    ├── Validate size (max 10 MB)
                                                    ├── Upload to S3: video/{sessionId}/{uuid}-{filename}
                                                    ├── Generate signed URL (TTL: 1 hour)
                                                    ├── Save to video_chat_messages (type: 'file')
                                                    └── Emit 'file:shared' WS event to room
                                                               │
Client ◄── file:shared { fileUrl, fileName } ─────────────────┘
```

Signed URL TTL is 1 hour — sufficient for an in-call session. After the session ends, files are retained in S3 for 24 hours then deleted by the `VideoWorker` cleanup job.

---

## 6. Call Control UI Reference

Minimum required UI controls:

| Control | Action |
|---------|--------|
| Mute/unmute mic | `localStream.getAudioTracks()[0].enabled = !enabled` |
| Camera on/off | `localStream.getVideoTracks()[0].enabled = !enabled` |
| Share screen | `getDisplayMedia()` + `replaceTrack()` |
| Stop sharing | `replaceTrack(cameraTrack)` |
| End call | `pc.close()` + `socket.emit` session ended + `PATCH /video-sessions/:id/status { status: 'ended' }` |

### Connection quality indicator

```javascript
// Poll every 3 seconds
setInterval(async () => {
  const stats = await pc.getStats();
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      const lost = report.packetsLost ?? 0;
      const received = report.packetsReceived ?? 1;
      const lossRate = lost / (lost + received);

      setQuality(
        lossRate < 0.02 ? 'good' :    // < 2% loss
        lossRate < 0.08 ? 'fair' :    // < 8% loss
        'poor'
      );
    }
  });
}, 3000);
```

---

## 7. Disconnection & Reconnection Handling

### Peer disconnects unexpectedly

```javascript
pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === 'disconnected') {
    // Give 10 seconds for ICE to recover before declaring failed
    reconnectTimeout = setTimeout(() => {
      if (pc.iceConnectionState !== 'connected') {
        socket.emit('session:disconnected', { roomId });
        // API call: PATCH /video-sessions/:id/status { status: 'failed' }
      }
    }, 10_000);
  }

  if (pc.iceConnectionState === 'connected') {
    clearTimeout(reconnectTimeout);  // ICE recovered
  }
};
```

### Server emits `peer:left` on WS disconnect

```typescript
// signaling.gateway.ts
async handleDisconnect(client: Socket) {
  const rooms = [...client.rooms].filter(r => r.startsWith('room:video:'));
  for (const room of rooms) {
    client.to(room).emit('peer:left', { peerId: client.data.user?.sub });
  }
}
```
