import { Room } from '../models/Room.js';

/**
 * RoomHandler – manages the lifecycle of rooms (create, join, leave).
 * Acts as a registry for all active rooms.
 */
export class RoomHandler {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
  }

  createRoom(id, code, name) {
    const room = new Room(id, code, name);
    this.rooms.set(id, room);
    Room.createInDb(id, code, name);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  getRoomByCode(code) {
    for (const [, room] of this.rooms) {
      if (room.code === code) return room;
    }
    // Try loading from DB
    const dbRoom = Room.loadFromDb(code);
    if (dbRoom) {
      this.rooms.set(dbRoom.id, dbRoom);
      return dbRoom;
    }
    return null;
  }

  /**
   * Find which room a socket is in
   */
  findRoomBySocket(socketId) {
    for (const [, room] of this.rooms) {
      if (room.getParticipant(socketId)) return room;
    }
    return null;
  }

  /**
   * Remove empty rooms from memory (not from DB — DB persists for rejoin)
   */
  cleanupEmptyRooms() {
    for (const [id, room] of this.rooms) {
      if (room.isEmpty()) {
        this.rooms.delete(id);
      }
    }
  }
}
