import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import YouTubePlayer from './YouTubePlayer';
import PlaybackControls from './PlaybackControls';
import ParticipantList from './ParticipantList';
import ChatPanel from './ChatPanel';

export default function RoomView({ initialRoom, currentUser: initialUser, initialChatHistory, onLeave }) {
  const { socket, addToast, isConnected } = useSocket();

  const [room, setRoom] = useState(initialRoom);
  const [user, setUser] = useState(initialUser);
  const [participants, setParticipants] = useState(initialRoom.participants || []);
  const [videoId, setVideoId] = useState(initialRoom.videoId || '');
  const [playState, setPlayState] = useState(initialRoom.playState || 'paused');
  const [currentTime, setCurrentTime] = useState(initialRoom.currentTime || 0);
  const [messages, setMessages] = useState(initialChatHistory || []);
  const [activeTab, setActiveTab] = useState('participants');
  const [kicked, setKicked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local playback tracking
  const [localTime, setLocalTime] = useState(initialRoom.currentTime || 0);
  const [duration, setDuration] = useState(0);

  const ytPlayerRef = useRef(null); // ref to YouTubePlayer component
  const playerObjRef = useRef(null); // raw YT player object
  const timeIntervalRef = useRef(null);

  // Determine current user's role from latest participants list
  const myRole = participants.find(p => p.userId === user.userId)?.role || user.role;
  const canControl = myRole === 'host' || myRole === 'moderator';

  // Update user role when it changes
  useEffect(() => {
    setUser(prev => ({ ...prev, role: myRole }));
  }, [myRole]);

  // ─── Poll local player time every 500ms ─────────────────
  useEffect(() => {
    timeIntervalRef.current = setInterval(() => {
      if (ytPlayerRef.current) {
        const t = ytPlayerRef.current.getCurrentTime();
        const d = ytPlayerRef.current.getDuration();
        if (t >= 0) setLocalTime(t);
        if (d > 0) setDuration(d);
      }
    }, 500);

    return () => clearInterval(timeIntervalRef.current);
  }, []);

  // ─── Socket Event Listeners ─────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onSyncState = (data) => {
      setVideoId(data.videoId || '');
      setPlayState(data.playState || 'paused');
      setCurrentTime(data.currentTime || 0);
    };

    const onUserJoined = (data) => {
      setParticipants(data.participants);
      setMessages(prev => [...prev, {
        system: true,
        message: `${data.username} joined the room`,
      }]);
      addToast(`${data.username} joined`, 'info');
    };

    const onUserLeft = (data) => {
      setParticipants(data.participants);
      setMessages(prev => [...prev, {
        system: true,
        message: `${data.username} left the room`,
      }]);
    };

    const onRoleAssigned = (data) => {
      setParticipants(data.participants);
      addToast(`${data.username} is now ${data.role}`, 'info');
      setMessages(prev => [...prev, {
        system: true,
        message: `${data.username} is now ${data.role}`,
      }]);
    };

    const onParticipantRemoved = (data) => {
      setParticipants(data.participants);
    };

    const onChatMessage = (data) => {
      setMessages(prev => [...prev, data]);
    };

    const onKicked = (data) => {
      setKicked(true);
    };

    socket.on('sync_state', onSyncState);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('chat_message', onChatMessage);
    socket.on('kicked', onKicked);

    return () => {
      socket.off('sync_state', onSyncState);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('chat_message', onChatMessage);
      socket.off('kicked', onKicked);
    };
  }, [socket, addToast]);

  // ─── Leave Room ─────────────────────────────────────────
  const handleLeave = () => {
    socket.emit('leave_room');
    onLeave();
  };

  // ─── Copy Room Code ─────────────────────────────────────
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      addToast('Room code copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('Failed to copy', 'error');
    }
  };

  // ─── Player Callbacks ──────────────────────────────────
  const handlePlayerReady = (player) => {
    playerObjRef.current = player;
  };

  const handleLocalPlay = () => {
    if (canControl) socket.emit('play');
  };

  const handleLocalPause = () => {
    if (canControl) socket.emit('pause');
  };

  // ─── Sync Button — request state from server and force-sync player ──
  const handleSync = useCallback(() => {
    socket.emit('request_sync');
    // The sync_state event will update currentTime/playState,
    // and the YouTubePlayer useEffect will apply it.
    // But also force the player to jump immediately:
    const handleForceSyncResponse = (data) => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.forceSync(data.currentTime || 0, data.playState || 'paused');
      }
      addToast('Synced to host!', 'success');
    };
    socket.once('sync_state', handleForceSyncResponse);
  }, [socket, addToast]);

  // ─── Seek from slider ──────────────────────────────────
  const handleSeek = useCallback((time) => {
    // Update local player immediately for responsiveness
    if (ytPlayerRef.current) {
      ytPlayerRef.current.forceSync(time, playState);
    }
  }, [playState]);

  // ─── Kicked Overlay ────────────────────────────────────
  if (kicked) {
    return (
      <div className="kicked-overlay">
        <div className="kicked-icon">🚫</div>
        <h2 className="kicked-title">You've been removed</h2>
        <p className="kicked-message">The host removed you from the watch party.</p>
        <button className="btn btn-primary" onClick={onLeave}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="room-view">
      {/* ─── Header ──────────────────────────────────────── */}
      <header className="room-header">
        <div className="room-header-left">
          <div className="room-header-logo">
            <div className="room-header-logo-icon">▶</div>
            WatchParty
          </div>
          <span className="room-name">{room.name}</span>
          <button
            className={`room-code-badge ${copied ? 'copied' : ''}`}
            onClick={handleCopyCode}
            title="Click to copy room code"
          >
            🔗 {room.code}
          </button>
        </div>

        <div className="room-header-right">
          <div className="user-badge">
            <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
            <span>{user.username}</span>
            <span className={`role-tag ${myRole}`}>{myRole}</span>
          </div>
          <button
            id="btn-leave-room"
            className="btn btn-danger btn-sm"
            onClick={handleLeave}
          >
            Leave
          </button>
        </div>
      </header>

      {/* ─── Main Video Area ─────────────────────────────── */}
      <main className="room-main">
        <div className="video-container">
          <YouTubePlayer
            ref={ytPlayerRef}
            videoId={videoId}
            playState={playState}
            currentTime={currentTime}
            canControl={canControl}
            onPlayerReady={handlePlayerReady}
            onLocalPlay={handleLocalPlay}
            onLocalPause={handleLocalPause}
          />
        </div>

        <PlaybackControls
          playState={playState}
          videoId={videoId}
          canControl={canControl}
          localTime={localTime}
          duration={duration}
          onSync={handleSync}
          onSeek={handleSeek}
        />
      </main>

      {/* ─── Sidebar ─────────────────────────────────────── */}
      <aside className="room-sidebar">
        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            People
            <span className="sidebar-tab-count">{participants.length}</span>
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
            <span className="sidebar-tab-count">{messages.filter(m => !m.system).length}</span>
          </button>
        </div>

        {activeTab === 'participants' ? (
          <ParticipantList
            participants={participants}
            currentUser={{ ...user, role: myRole }}
          />
        ) : (
          <ChatPanel
            messages={messages}
            currentUser={user}
          />
        )}
      </aside>
    </div>
  );
}
