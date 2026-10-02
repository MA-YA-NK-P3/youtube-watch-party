/**
 * PlaybackHandler – processes all playback-related WebSocket events.
 * Validates permissions via Room model before broadcasting state changes.
 */
export class PlaybackHandler {
  constructor(io, roomHandler) {
    this.io = io;
    this.roomHandler = roomHandler;
  }

  /**
   * Register playback event listeners on a socket
   */
  register(socket) {
    socket.on('play', () => this.handlePlay(socket));
    socket.on('pause', () => this.handlePause(socket));
    socket.on('seek', (data) => this.handleSeek(socket, data));
    socket.on('change_video', (data) => this.handleChangeVideo(socket, data));
  }

  handlePlay(socket) {
    const room = this.roomHandler.findRoomBySocket(socket.id);
    if (!room) return socket.emit('error', { message: 'Not in a room' });

    const result = room.play(socket.id);
    if (!result.allowed) {
      return socket.emit('error', { message: result.error });
    }

    this.io.to(room.id).emit('sync_state', room.getSyncState());
  }

  handlePause(socket) {
    const room = this.roomHandler.findRoomBySocket(socket.id);
    if (!room) return socket.emit('error', { message: 'Not in a room' });

    const result = room.pause(socket.id);
    if (!result.allowed) {
      return socket.emit('error', { message: result.error });
    }

    this.io.to(room.id).emit('sync_state', room.getSyncState());
  }

  handleSeek(socket, data) {
    const room = this.roomHandler.findRoomBySocket(socket.id);
    if (!room) return socket.emit('error', { message: 'Not in a room' });

    const time = parseFloat(data?.time);
    if (isNaN(time) || time < 0) {
      return socket.emit('error', { message: 'Invalid seek time' });
    }

    const result = room.seek(socket.id, time);
    if (!result.allowed) {
      return socket.emit('error', { message: result.error });
    }

    this.io.to(room.id).emit('sync_state', room.getSyncState());
  }

  handleChangeVideo(socket, data) {
    const room = this.roomHandler.findRoomBySocket(socket.id);
    if (!room) return socket.emit('error', { message: 'Not in a room' });

    const videoId = data?.videoId?.trim();
    if (!videoId) {
      return socket.emit('error', { message: 'Video ID is required' });
    }

    const result = room.changeVideo(socket.id, videoId);
    if (!result.allowed) {
      return socket.emit('error', { message: result.error });
    }

    this.io.to(room.id).emit('sync_state', room.getSyncState());
  }
}
