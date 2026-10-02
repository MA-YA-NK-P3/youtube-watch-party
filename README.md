# 🎬 YouTube Watch Party

A real-time Watch Party system that lets multiple users watch YouTube videos together in perfect sync. Built with React, Node.js, Express, Socket.IO, and SQLite.

![Watch Party](https://img.shields.io/badge/Status-Live-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-18-blue)

## 🚀 Live Demo

> **Deployed URL:** `https://your-app.onrender.com` _(update after deployment)_

---

## ✨ Features

### Core
- **Room-based model** — Create or join watch rooms with unique codes
- **Real-time synchronization** — All participants see the same video state (play/pause, seek, current video)
- **YouTube integration** — Play any YouTube video via URL or video ID
- **WebSocket communication** — Powered by Socket.IO for bidirectional real-time events

### Role-Based Access Control
| Role | Assigned By | Permissions |
|------|-------------|-------------|
| **Host** | Auto (room creator) | Full control: play/pause, seek, change video, assign roles, remove participants, transfer host |
| **Moderator** | Host | Play/pause, seek, change video |
| **Participant** | Default for joiners | Watch only; cannot control playback |

### Extras
- 💬 **Live chat** in rooms
- 🔄 **Host transfer** — Pass host role to another participant
- 🚫 **Kick participants** — Host can remove users
- 📋 **Copy room code** — One-click share
- 🎨 **Premium dark UI** — Glassmorphism, gradients, micro-animations
- 💾 **Persistent rooms** — Room state saved to SQLite

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React + Vite)                  │
│                                                             │
│  LandingPage ──▶ RoomView ──▶ YouTubePlayer                │
│                      │                                      │
│                      ├── PlaybackControls                   │
│                      ├── ParticipantList                    │
│                      └── ChatPanel                          │
└──────────────────────┬──────────────────────────────────────┘
                       │  WebSocket (Socket.IO)
┌──────────────────────▼──────────────────────────────────────┐
│                  Server (Node.js + Express)                  │
│                                                             │
│  socketServer.js ──▶ RoomHandler ──▶ Room (OOP class)       │
│                  ──▶ PlaybackHandler    └── Participant      │
│                  ──▶ SQLite DB                               │
└─────────────────────────────────────────────────────────────┘
```

### How WebSockets Enable Real-Time Sync

1. **Connection**: Each client connects via Socket.IO, which establishes a persistent WebSocket connection with fallback to long-polling.
2. **Room joining**: When a user joins, they're added to a Socket.IO room (server-side channel). The server sends them the current video state (`sync_state`).
3. **Action → Broadcast**: When a Host/Moderator performs an action (play, pause, seek, change video), the client emits an event. The server **validates permissions** using the Room model, updates state, persists to SQLite, and **broadcasts** the new state to all room members.
4. **Sync on join**: New participants immediately receive `sync_state` with the current video ID, play state, and seek position, so they start in sync.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | UI, room management, video player |
| Backend | Node.js + Express | HTTP API, static serving |
| Real-time | Socket.IO | WebSocket communication |
| Database | SQLite (better-sqlite3) | Room persistence |
| Video | YouTube IFrame Player API | Embedded, controllable player |
| Styling | Vanilla CSS | Custom design system |

---

## 📦 Setup & Run Locally

### Prerequisites
- **Node.js** 18+ and **npm**

### 1. Clone the repository
```bash
git clone <repo-url>
cd youtube-watch-party
```

### 2. Install dependencies
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Start the development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```
Server runs on `http://localhost:3001`

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```
Client runs on `http://localhost:5173` (proxies WebSocket to backend)

### 4. Open the app
Navigate to `http://localhost:5173` in your browser.

---

## 🌐 Deployment

### Build for Production
```bash
cd client
npm run build    # Creates client/dist/
```

### Deploy (Render)
1. Set **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
2. Set **Start Command**: `cd server && npm start`
3. The server serves the built client from `client/dist/`

---

## 📡 WebSocket Events

### Client → Server
| Event | Payload | Role Required |
|-------|---------|---------------|
| `create_room` | `{ roomName, username }` | Any |
| `join_room` | `{ roomCode, username }` | Any |
| `play` | `{}` | Host/Moderator |
| `pause` | `{}` | Host/Moderator |
| `seek` | `{ time }` | Host/Moderator |
| `change_video` | `{ videoId }` | Host/Moderator |
| `assign_role` | `{ userId, role }` | Host only |
| `remove_participant` | `{ userId }` | Host only |
| `transfer_host` | `{ userId }` | Host only |
| `chat_message` | `{ message }` | Any |

### Server → Clients
| Event | Payload |
|-------|---------|
| `sync_state` | `{ playState, currentTime, videoId }` |
| `user_joined` | `{ username, userId, role, participants }` |
| `user_left` | `{ username, userId, participants }` |
| `role_assigned` | `{ userId, username, role, participants }` |
| `participant_removed` | `{ userId, participants }` |
| `chat_message` | `{ username, message, timestamp }` |
| `kicked` | `{ message }` |

---

## 🎓 Code Understanding

### Libraries & Tools
- **Socket.IO**: Provides WebSocket abstraction with auto-reconnect, room-based broadcasting, and fallback to long-polling. Used for all real-time communication.
- **React**: Component-based UI with hooks for state management. The `SocketContext` provides the socket instance across all components.
- **Express**: HTTP server that serves the built React app in production and provides health check endpoints.
- **better-sqlite3**: Synchronous SQLite driver for Node.js. Stores room metadata so rooms survive server restarts.
- **YouTube IFrame Player API**: Official Google API for embedding and controlling YouTube videos programmatically.
- **Vite**: Fast dev server with HMR and proxy support for WebSocket forwarding.

### Role-Based Logic (Backend)
All permission checks happen **server-side** in the `Room` class. When a socket emits a playback event, the `PlaybackHandler` calls `room.validatePlaybackControl(socketId)`, which checks the participant's role. If the role is insufficient, the event is rejected with an error message. This prevents clients from bypassing controls.

### OOP Structure
- `Room` class: Manages participants, playback state, role assignments, chat history, and DB persistence
- `Participant` class: Encapsulates user identity and role with permission helper methods
- `RoomHandler` class: Registry of all active rooms with lookup by ID, code, or socket
- `PlaybackHandler` class: Processes playback WebSocket events with validation

---

## 📝 License

MIT
