import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * YouTubePlayer – Wraps the YouTube IFrame API.
 * Exposes getDuration(), getCurrentTime(), and forceSync() via ref.
 */
const YouTubePlayer = forwardRef(function YouTubePlayer({
  videoId,
  playState,
  currentTime,
  canControl,
  onPlayerReady,
  onLocalPlay,
  onLocalPause,
}, ref) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const isReadyRef = useRef(false);
  const suppressEventsRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      try {
        return playerRef.current?.getCurrentTime?.() || 0;
      } catch { return 0; }
    },
    getDuration: () => {
      try {
        return playerRef.current?.getDuration?.() || 0;
      } catch { return 0; }
    },
    forceSync: (time, state) => {
      if (!isReadyRef.current || !playerRef.current) return;
      suppressEventsRef.current = true;
      try {
        playerRef.current.seekTo(time, true);
        if (state === 'playing') {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch (_) { /* ignore */ }
      setTimeout(() => { suppressEventsRef.current = false; }, 800);
    },
  }));

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }, []);

  // Initialize player when videoId changes
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      // Destroy previous player if exists
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (_) { /* ignore */ }
        playerRef.current = null;
        isReadyRef.current = false;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,       // We provide our own controls
          disablekb: 1,      // Disable keyboard
          modestbranding: 1,
          rel: 0,
          fs: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            isReadyRef.current = true;
            onPlayerReady?.(event.target);

            // Apply initial state
            if (currentTime > 0) {
              event.target.seekTo(currentTime, true);
            }
            if (playState === 'playing') {
              event.target.playVideo();
            }
          },
          onStateChange: (event) => {
            if (suppressEventsRef.current || !canControl) return;

            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              onLocalPlay?.();
            } else if (state === window.YT.PlayerState.PAUSED) {
              onLocalPause?.();
            }
          },
        },
      });
    };

    // Wait for YT API to load
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [videoId]); // Only re-init when videoId changes

  // Sync play/pause state from server
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;

    suppressEventsRef.current = true;

    try {
      const player = playerRef.current;
      if (playState === 'playing') {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (_) { /* ignore */ }

    setTimeout(() => {
      suppressEventsRef.current = false;
    }, 500);
  }, [playState]);

  // Sync seek position from server
  useEffect(() => {
    if (!isReadyRef.current || !playerRef.current) return;
    if (currentTime === lastSyncTimeRef.current) return;

    suppressEventsRef.current = true;
    lastSyncTimeRef.current = currentTime;

    try {
      const player = playerRef.current;
      const playerTime = player.getCurrentTime();
      // Only seek if the difference is significant (> 2 seconds)
      if (Math.abs(playerTime - currentTime) > 2) {
        player.seekTo(currentTime, true);
      }
    } catch (_) { /* ignore */ }

    setTimeout(() => {
      suppressEventsRef.current = false;
    }, 500);
  }, [currentTime]);

  if (!videoId) {
    return (
      <div className="video-placeholder">
        <div className="video-placeholder-icon">🎬</div>
        <div className="video-placeholder-text">No video playing</div>
        <div className="video-placeholder-hint">
          {canControl
            ? 'Paste a YouTube URL below to get started'
            : 'Waiting for the host to add a video'}
        </div>
      </div>
    );
  }

  return (
    <div className="video-wrapper">
      <div ref={containerRef} />
    </div>
  );
});

export default YouTubePlayer;
