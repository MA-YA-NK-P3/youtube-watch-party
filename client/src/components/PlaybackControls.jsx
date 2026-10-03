import { useState, useRef, useCallback } from 'react';
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

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function PlaybackControls({
  playState,
  videoId,
  canControl,
  localTime,
  duration,
  onSync,
  onSeek,
}) {
  const { socket } = useSocket();
  const [urlInput, setUrlInput] = useState('');
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

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
    if (!vid) return;
    socket.emit('change_video', { videoId: vid });
    setUrlInput('');
  };

  // ─── Seek bar handlers ──────────────────────────────────
  const handleSeekStart = () => {
    setIsSeeking(true);
    setSeekValue(localTime);
  };

  const handleSeekChange = (e) => {
    setSeekValue(Number(e.target.value));
  };

  const handleSeekEnd = (e) => {
    const time = Number(e.target.value);
    setIsSeeking(false);
    if (canControl) {
      socket.emit('seek', { time });
    }
    onSeek?.(time);
  };

  const isPlaying = playState === 'playing';
  const progress = duration > 0 ? ((isSeeking ? seekValue : localTime) / duration) * 100 : 0;

  return (
    <div className="playback-controls-wrapper">
      {/* ─── Seek Bar ────────────────────────────────────── */}
      {videoId && (
        <div className="seek-bar-container">
          <span className="seek-time">{formatTime(isSeeking ? seekValue : localTime)}</span>
          <div className="seek-bar-track">
            <div
              className="seek-bar-fill"
              style={{ width: `${progress}%` }}
            />
            <input
              id="input-seek-bar"
              type="range"
              className="seek-bar-input"
              min={0}
              max={duration || 100}
              step={0.5}
              value={isSeeking ? seekValue : localTime}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              onChange={handleSeekChange}
              onMouseUp={handleSeekEnd}
              onTouchEnd={handleSeekEnd}
              disabled={!canControl}
              title={canControl ? 'Drag to seek' : 'Only Host/Moderator can seek'}
            />
          </div>
          <span className="seek-time">{formatTime(duration)}</span>
        </div>
      )}

      {/* ─── Controls Row ────────────────────────────────── */}
      <div className="playback-controls">
        <div className="playback-btn-group">
          <button
            id="btn-play-pause"
            className={`playback-btn ${isPlaying ? 'active' : ''}`}
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!canControl || !videoId}
            title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Only Host/Moderator can control'}
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

        {/* ─── Sync Button ─────────────────────────────── */}
        <button
          id="btn-sync"
          className="btn btn-secondary btn-sm sync-btn"
          onClick={onSync}
          disabled={!videoId}
          title="Force-sync your player to the host's current position"
        >
          🔄 Sync
        </button>
      </div>
    </div>
  );
}
