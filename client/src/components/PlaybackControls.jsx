import { useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractVideoId(input) {
  if (!input) return null;

  // Already a plain video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }

  try {
    const url = new URL(input.trim());

    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null;
    }

    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;

      // youtube.com/embed/VIDEO_ID
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      // youtube.com/shorts/VIDEO_ID
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch (_) {
    // Not a URL
  }

  return null;
}

export default function PlaybackControls({
  playState,
  videoId,
  canControl,
}) {
  const { socket } = useSocket();
  const [urlInput, setUrlInput] = useState('');
  const playerRef = useRef(null);

  const handlePlay = () => {
    if (!canControl) return;
    socket.emit('play');
  };

  const handlePause = () => {
    if (!canControl) return;
    socket.emit('pause');
  };

  const handleChangeVideo = (e) => {
    e.preventDefault();
    if (!canControl || !urlInput.trim()) return;

    const vid = extractVideoId(urlInput);
    if (!vid) {
      return; // Could show error toast
    }
    socket.emit('change_video', { videoId: vid });
    setUrlInput('');
  };

  const isPlaying = playState === 'playing';

  return (
    <div className="playback-controls">
      <div className="playback-btn-group">
        <button
          id="btn-play-pause"
          className={`playback-btn ${isPlaying ? 'active' : ''}`}
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={!canControl || !videoId}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <form className="video-url-form" onSubmit={handleChangeVideo}>
        <input
          id="input-video-url"
          className="video-url-input"
          type="text"
          placeholder={
            canControl
              ? 'Paste YouTube URL or video ID…'
              : 'Only Host/Moderator can change video'
          }
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          disabled={!canControl}
        />
        <button
          id="btn-change-video"
          className="btn btn-primary btn-sm"
          type="submit"
          disabled={!canControl || !urlInput.trim()}
        >
          Load
        </button>
      </form>

      <div className="sync-indicator">
        <span className="sync-dot" />
        Synced
      </div>
    </div>
  );
}
