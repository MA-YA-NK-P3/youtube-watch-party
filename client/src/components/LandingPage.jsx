import { useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function LandingPage({ onJoined }) {
  const { socket, isConnected, addToast } = useSocket();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-logo">
          <div className="landing-logo-icon">▶</div>
          WatchParty
        </div>

        <h1 className="landing-title">
          Watch Together, <br />In Perfect Sync
        </h1>

        <p className="landing-subtitle">
          Create a room, invite friends, and enjoy YouTube videos together in real&#8209;time.
          Synchronized playback, live chat, and seamless controls&nbsp;—
          no matter where you are.
        </p>

        <div className="landing-actions">
          <button
            id="btn-create-room"
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            disabled={!isConnected}
          >
            🎬 Create a Room
          </button>
          <button
            id="btn-join-room"
            className="btn btn-secondary"
            onClick={() => setShowJoin(true)}
            disabled={!isConnected}
          >
            🔗 Join a Room
          </button>
        </div>

        {!isConnected && (
          <p style={{ marginTop: '1rem', color: 'var(--accent-warning)', fontSize: 'var(--font-size-sm)' }}>
            ⏳ Connecting to server…
          </p>
        )}
      </div>

      {showCreate && (
        <CreateModal
          socket={socket}
          addToast={addToast}
          onJoined={onJoined}
          onClose={() => setShowCreate(false)}
        />
      )}

      {showJoin && (
        <JoinModal
          socket={socket}
          addToast={addToast}
          onJoined={onJoined}
          onClose={() => setShowJoin(false)}
        />
      )}
    </div>
  );
}

function CreateModal({ socket, addToast, onJoined, onClose }) {
  const [roomName, setRoomName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!roomName.trim() || !username.trim()) {
      setError('Both fields are required');
      return;
    }
    setLoading(true);
    setError('');

    socket.emit('create_room', { roomName: roomName.trim(), username: username.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        addToast(`Room "${res.room.name}" created!`, 'success');
        onJoined(res);
      } else {
        setError(res.error || 'Failed to create room');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create a Room</h2>
        <p className="modal-description">Start a new watch party and invite friends with a room code.</p>

        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label" htmlFor="create-room-name">Room Name</label>
            <input
              id="create-room-name"
              className="form-input"
              type="text"
              placeholder="e.g. Movie Night 🍿"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoFocus
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="create-username">Your Name</label>
            <input
              id="create-username"
              className="form-input"
              type="text"
              placeholder="Enter your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
            />
          </div>

          {error && <p className="form-error">⚠️ {error}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Creating…' : '🎬 Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinModal({ socket, addToast, onJoined, onClose }) {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomCode.trim() || !username.trim()) {
      setError('Both fields are required');
      return;
    }
    setLoading(true);
    setError('');

    socket.emit('join_room', { roomCode: roomCode.trim(), username: username.trim() }, (res) => {
      setLoading(false);
      if (res.success) {
        addToast(`Joined "${res.room.name}"!`, 'success');
        onJoined(res);
      } else {
        setError(res.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Join a Room</h2>
        <p className="modal-description">Enter the room code shared by your friend.</p>

        <form onSubmit={handleJoin}>
          <div className="form-group">
            <label className="form-label" htmlFor="join-room-code">Room Code</label>
            <input
              id="join-room-code"
              className="form-input"
              type="text"
              placeholder="e.g. ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              autoFocus
              maxLength={10}
              style={{ letterSpacing: '0.15em', fontWeight: 600 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="join-username">Your Name</label>
            <input
              id="join-username"
              className="form-input"
              type="text"
              placeholder="Enter your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
            />
          </div>

          {error && <p className="form-error">⚠️ {error}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Joining…' : '🔗 Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
