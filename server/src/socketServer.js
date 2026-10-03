import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { RoomHandler } from './handlers/RoomHandler.js';
import { PlaybackHandler } from './handlers/PlaybackHandler.js';

/**
 * Initialize the Socket.IO server with all event handlers.
 * Orchestrates room, playback, role, and chat logic.
 */
export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const roomHandler = new RoomHandler();
  const playbackHandler = new PlaybackHandler(io, roomHandler);

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.id}`);

    // ─── Create Room ─────────────────────────────────────────
    socket.on('create_room', (data, callback) => {
      const { roomName, username } = data || {};
      if (!roomName || !username) {
        return callback?.({ success: false, error: 'Room name and username are required' });
      }

      const roomId = nanoid(12);
      const roomCode = nanoid(6).toUpperCase();
      const room = roomHandler.createRoom(roomId, roomCode, roomName.trim());
      const participant = room.addParticipant(socket.id, username.trim());

      socket.join(roomId);
      console.log(`[Room] Created: ${roomCode} by ${username} (${socket.id})`);

      callback?.({
        success: true,
        room: room.getRoomInfo(),
        user: participant.toJSON(),
      });
    });

    // ─── Join Room ───────────────────────────────────────────
    socket.on('join_room', (data, callback) => {
      const { roomCode, username } = data || {};
      if (!roomCode || !username) {
        return callback?.({ success: false, error: 'Room code and username are required' });
      }

      const room = roomHandler.getRoomByCode(roomCode.trim().toUpperCase());
      if (!room) {
        return callback?.({ success: false, error: 'Room not found' });
      }

      // Check if username already taken in this room
      const existing = room.getParticipantList().find(
        p => p.username.toLowerCase() === username.trim().toLowerCase()
      );
      if (existing) {
        return callback?.({ success: false, error: 'Username already taken in this room' });
      }

      const participant = room.addParticipant(socket.id, username.trim());
      socket.join(room.id);

      console.log(`[Room] ${username} joined room ${roomCode} (${socket.id})`);

      // Notify existing participants
      socket.to(room.id).emit('user_joined', {
        username: participant.username,
        userId: participant.userId,
        role: participant.role,
        participants: room.getParticipantList(),
      });

      callback?.({
        success: true,
        room: room.getRoomInfo(),
        user: participant.toJSON(),
        chatHistory: room.chatHistory,
      });
    });

    // ─── Leave Room ──────────────────────────────────────────
    socket.on('leave_room', () => {
      handleDisconnect(socket);
    });

    // ─── Assign Role ─────────────────────────────────────────
    socket.on('assign_role', (data) => {
      const room = roomHandler.findRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });

      const { userId, role } = data || {};
      const result = room.assignRole(socket.id, userId, role);

      if (!result.success) {
        return socket.emit('error', { message: result.error });
      }

      io.to(room.id).emit('role_assigned', {
        userId: result.participant.userId,
        username: result.participant.username,
        role: result.participant.role,
        participants: room.getParticipantList(),
      });
    });

    // ─── Transfer Host ───────────────────────────────────────
    socket.on('transfer_host', (data) => {
      const room = roomHandler.findRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });

      const { userId } = data || {};
      const result = room.transferHost(socket.id, userId);

      if (!result.success) {
        return socket.emit('error', { message: result.error });
      }

      io.to(room.id).emit('role_assigned', {
        userId,
        username: room.getParticipantByUserId(userId)?.username,
        role: 'host',
        participants: room.getParticipantList(),
      });
    });

    // ─── Remove Participant ──────────────────────────────────
    socket.on('remove_participant', (data) => {
      const room = roomHandler.findRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });

      const { userId } = data || {};
      const result = room.removeParticipantByHost(socket.id, userId);

      if (!result.success) {
        return socket.emit('error', { message: result.error });
      }

      // Notify the removed user
      const removedSocket = io.sockets.sockets.get(result.participant.socketId);
      if (removedSocket) {
        removedSocket.leave(room.id);
        removedSocket.emit('kicked', { message: 'You have been removed from the room by the host.' });
      }

      io.to(room.id).emit('participant_removed', {
        userId: result.participant.userId,
        participants: room.getParticipantList(),
      });
    });

    // ─── Chat ────────────────────────────────────────────────
    socket.on('chat_message', (data) => {
      const room = roomHandler.findRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });

      const message = data?.message?.trim();
      if (!message) return;

      const chatMsg = room.addChatMessage(socket.id, message);
      if (chatMsg) {
        io.to(room.id).emit('chat_message', chatMsg);
      }
    });

    // ─── Request Sync (any participant can request current state) ──
    socket.on('request_sync', () => {
      const room = roomHandler.findRoomBySocket(socket.id);
      if (!room) return socket.emit('error', { message: 'Not in a room' });
      socket.emit('sync_state', room.getSyncState());
    });

    // ─── Playback Events ────────────────────────────────────
    playbackHandler.register(socket);

    // ─── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  function handleDisconnect(socket) {
    const room = roomHandler.findRoomBySocket(socket.id);
    if (!room) return;

    const participant = room.removeParticipant(socket.id);
    if (!participant) return;

    socket.leave(room.id);
    console.log(`[Room] ${participant.username} left room ${room.code} (${socket.id})`);

    io.to(room.id).emit('user_left', {
      username: participant.username,
      userId: participant.userId,
      participants: room.getParticipantList(),
    });

    // Notify of host change if applicable
    const newHost = room.getHost();
    if (newHost && participant.isHost()) {
      io.to(room.id).emit('role_assigned', {
        userId: newHost.userId,
        username: newHost.username,
        role: 'host',
        participants: room.getParticipantList(),
      });
    }

    roomHandler.cleanupEmptyRooms();
  }

  return io;
}
