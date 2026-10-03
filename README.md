# 🎬 YouTube Watch Party

A real-time Watch Party system that lets multiple users watch YouTube videos together in perfect sync. Built with React, Node.js, Express, Socket.IO, and SQLite.

![Watch Party](https://img.shields.io/badge/Status-Live-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-18-blue) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4-blueviolet)

## 🚀 Live Demo

> **Deployed URL:** [https://youtube-watch-party-uwdl.onrender.com](https://youtube-watch-party-uwdl.onrender.com)
>
> ⚠️ Free Render tier — first load after inactivity may take ~30s to wake up.

---

## ✨ Features

### Core
- **Room-based model** — Create or join watch rooms with unique 6-character codes
- **Real-time synchronization** — All participants see the same video state (play/pause, seek position, current video)
- **YouTube integration** — Play any YouTube video via URL, short link, or video ID
- **WebSocket communication** — Powered by Socket.IO for bidirectional real-time events
- **Seek bar / Timeline** — Draggable progress slider with live time display (MM:SS)
- **Force Sync button** — Any participant can click "🔄 Sync" to instantly re-align their player to the host's current state

### Role-Based Access Control
| Role | Assigned By | Permissions |
|------|-------------|-------------|
| **Host** | Auto (room creator) | Full control: play/pause, seek, change video, assign roles, remove participants, transfer host |
| **Moderator** | Host | Play/pause, seek, change video |
| **Participant** | Default for joiners | Watch only; cannot control playback. Can click Sync to re-align. |

### Extras
- 💬 **Live chat** in rooms with message history
- 🔄 **Host transfer** — Pass host role to another participant
- 🚫 **Kick participants** — Host can remove users from the room
- 📋 **Copy room code** — One-click copy to clipboard
- 🎨 **Premium dark UI** — Glassmorphism, gradients, micro-animations, Inter font
- 💾 **Persistent rooms** — Room state saved to SQLite database

---

## 🏗 Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Client (React 18 + Vite)                   │
│                                                               │
│  LandingPage ──▶ RoomView ──▶ YouTubePlayer (forwardRef)     │
│                      │                                        │
│                      ├── PlaybackControls (seek bar + sync)   │
│                      ├── ParticipantList (role mgmt)          │
│                      └── ChatPanel (live messages)            │
│                                                               │
│  SocketContext ──▶ Socket.IO Client (auto-reconnect)          │
└───────────────────────┬───────────────────────────────────────┘
                        │  WebSocket (Socket.IO)
┌───────────────────────▼───────────────────────────────────────┐
│                 Server (Node.js + Express)                     │
│                                                               │
│  socketServer.js ──▶ RoomHandler ──▶ Room (OOP class)         │
│                  ──▶ PlaybackHandler    └── Participant (OOP)  │
│                  ──▶ SQLite DB (better-sqlite3)                │
└───────────────────────────────────────────────────────────────┘
```

### How WebSockets Enable Real-Time Sync

1. **Connection**: Each client connects via Socket.IO, which establishes a persistent WebSocket connection with automatic fallback to long-polling.
2. **Room joining**: When a user joins, they're added to a Socket.IO room (server-side channel). The server sends them the current video state via `sync_state`.
3. **Action → Validate → Broadcast**: When a Host/Moderator performs an action (play, pause, seek, change video), the client emits an event. The server **validates permissions** using the `Room` model, updates state, persists to SQLite, and **broadcasts** the new state to all room members.
4. **Sync on join**: New participants immediately receive `sync_state` with the current video ID, play state, and seek position, so they start watching from the exact same point.
5. **Manual re-sync**: Any participant can click the "🔄 Sync" button, which sends `request_sync` to the server. The server responds with the latest room state, and the client force-seeks the YouTube player to match.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | Component-based UI, room management, video player |
| Backend | Node.js + Express | HTTP API, static file serving, health check |
| Real-time | Socket.IO | WebSocket-based bidirectional communication |
| Database | SQLite (better-sqlite3) | Room persistence across server restarts |
| Video | YouTube IFrame Player API | Embedded, programmable YouTube player |
| Styling | Vanilla CSS | Custom design system with CSS variables |
| Deployment | Render | Free-tier web service with WebSocket support |

---

## 📁 Project Structure

```
youtube-watch-party/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx      # Hero page + create/join modals
│   │   │   ├── RoomView.jsx         # Main room orchestrator
│   │   │   ├── YouTubePlayer.jsx    # YT IFrame API wrapper (forwardRef)
│   │   │   ├── PlaybackControls.jsx # Play/pause, seek bar, sync, URL input
│   │   │   ├── ParticipantList.jsx  # Users list + role management
│   │   │   ├── ChatPanel.jsx        # Live chat with auto-scroll
│   │   │   └── ToastContainer.jsx   # Notification toasts
│   │   ├── context/
│   │   │   └── SocketContext.jsx    # Socket.IO provider + connection state
│   │   ├── App.jsx                  # Root component with state routing
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Complete design system (~1300 lines)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── models/
│   │   │   ├── Room.js              # OOP Room class (state, roles, chat, DB)
│   │   │   └── Participant.js       # OOP Participant class (identity, perms)
│   │   ├── handlers/
│   │   │   ├── RoomHandler.js       # Room lifecycle registry
│   │   │   └── PlaybackHandler.js   # Playback event processing + validation
│   │   ├── db.js                    # SQLite initialization (WAL mode)
│   │   ├── socketServer.js          # Socket.IO event orchestrator
│   │   └── index.js                 # Express entry point
│   └── package.json
├── render.yaml                      # Render deployment blueprint
├── README.md
└── package.json                     # Root scripts (dev, build, deploy)
```

---

## 📦 Setup & Run Locally

### Prerequisites
- **Node.js** 18+ and **npm**

### 1. Clone the repository
```bash
git clone https://github.com/MA-YA-NK-P3/youtube-watch-party.git
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

## 🌐 Deployment (Render)

The app is deployed as a **single Render Web Service** — the Express server serves the built React frontend and handles WebSocket connections.

| Setting | Value |
|---------|-------|
| **Build Command** | `npm run render-build` |
| **Start Command** | `npm start` |
| **Runtime** | Node |
| **Plan** | Free |
| **Env var** | `NODE_ENV=production` |

### What the commands do:
- **`npm run render-build`** → `cd client && npm install --include=dev && npm run build && cd ../server && npm install`
- **`npm start`** → `cd server && npm start` → Express serves `client/dist/` + Socket.IO

### Deploy steps:
1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New+ → Web Service** → connect the repo
3. Fill in the settings above → **Create Web Service**
4. Wait ~2-3 min for the build → your app is live!

---

## 📡 WebSocket Events

### Client → Server
| Event | Payload | Role Required |
|-------|---------|---------------|
| `create_room` | `{ roomName, username }` | Any |
| `join_room` | `{ roomCode, username }` | Any |
| `leave_room` | `{}` | Any |
| `play` | `{}` | Host/Moderator |
| `pause` | `{}` | Host/Moderator |
| `seek` | `{ time }` | Host/Moderator |
| `change_video` | `{ videoId }` | Host/Moderator |
| `request_sync` | `{}` | Any |
| `assign_role` | `{ userId, role }` | Host only |
| `remove_participant` | `{ userId }` | Host only |
| `transfer_host` | `{ userId }` | Host only |
| `chat_message` | `{ message }` | Any |

### Server → Clients
| Event | Payload |
|-------|---------|
| `sync_state` | `{ playState, currentTime, videoId, lastSyncTimestamp }` |
| `user_joined` | `{ username, userId, role, participants }` |
| `user_left` | `{ username, userId, participants }` |
| `role_assigned` | `{ userId, username, role, participants }` |
| `participant_removed` | `{ userId, participants }` |
| `chat_message` | `{ username, userId, message, timestamp }` |
| `kicked` | `{ message }` |
| `error` | `{ message }` |

---

## 🎓 Code Understanding

### Libraries & Tools
- **Socket.IO** (`socket.io` / `socket.io-client`): Provides WebSocket abstraction with auto-reconnect, room-based broadcasting, acknowledgement callbacks, and fallback to long-polling. Used for all real-time communication between clients and server.
- **React 18**: Component-based UI with hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useImperativeHandle`, `forwardRef`) for state management. The `SocketContext` provides the socket instance across all components via React Context.
- **Express**: HTTP server that serves the built React SPA in production, provides a `/api/health` endpoint, and handles SPA fallback routing.
- **better-sqlite3**: Synchronous SQLite driver for Node.js. Uses WAL mode for concurrent performance. Stores room metadata (ID, code, name, video state) so rooms can survive server restarts.
- **YouTube IFrame Player API**: Official Google API for embedding and programmatically controlling YouTube videos. We disable native controls (`controls: 0`) and provide our own seek bar, play/pause, and sync buttons.
- **Vite**: Fast dev server with HMR (Hot Module Replacement) and proxy support for forwarding WebSocket connections to the backend during development.
- **nanoid**: Generates unique room IDs (12 chars) and room codes (6 chars uppercase).

### Role-Based Logic (Backend)
All permission checks happen **server-side** in the `Room` class:
1. When a socket emits a playback event (play/pause/seek/change_video), the `PlaybackHandler` calls `room.validatePlaybackControl(socketId)`
2. This method looks up the `Participant` object and calls `participant.canControlPlayback()`
3. Only `host` and `moderator` roles return `true`
4. If the role is insufficient, the event is **rejected** with an error message — the client cannot bypass this

### OOP Structure (Bonus)
The backend uses object-oriented design to encapsulate room logic:
- **`Room` class**: Manages participants (Map), playback state, role assignments, chat history (capped at 200), and DB persistence. Contains methods like `play()`, `pause()`, `seek()`, `changeVideo()`, `assignRole()`, `transferHost()`, `removeParticipantByHost()`
- **`Participant` class**: Encapsulates user identity (socketId, username) and role with helper methods `canControlPlayback()` and `isHost()`. Defines role constants (`HOST`, `MODERATOR`, `PARTICIPANT`)
- **`RoomHandler` class**: Registry of all active rooms with lookup by ID, code, or socket. Handles room creation, persistence, and cleanup of empty rooms
- **`PlaybackHandler` class**: Processes playback WebSocket events, validates permissions via the Room model, and broadcasts state changes

### Sync Mechanism
- **Automatic sync**: Server broadcasts `sync_state` to all room members whenever a Host/Moderator performs an action
- **Manual sync**: Any participant can emit `request_sync` → server responds with current room state → client calls `forceSync()` on the YouTube player, which seeks to the exact timestamp and matches the play/pause state
- **Drift tolerance**: The YouTube player only seeks if the time difference exceeds 2 seconds, preventing unnecessary jitter during normal playback

### Trade-offs & Design Decisions
1. **In-memory rooms + SQLite**: Room participant lists live in memory (Map) for fast access; room metadata is persisted to SQLite so video state survives restarts. Trade-off: participants are lost on restart.
2. **YouTube controls disabled**: Native YT controls are hidden (`controls: 0`) to prevent participants from independently seeking/pausing, which would break sync. Custom controls enforce role-based permissions.
3. **Socket ID as User ID**: Simplifies the system by avoiding a separate auth layer. Trade-off: users get a new identity on reconnect.
4. **Event suppression**: When the player receives a sync event, we suppress its `onStateChange` callback for 500-800ms to prevent feedback loops (sync → state change → emit → sync → ...).

---

## 📝 License

MIT
