import { Participant } from './Participant.js';
import db from '../db.js';

/**
 * Room class – manages room state, participants, and broadcasts.
 * Uses OOP to encapsulate all room logic (bonus requirement).
 */
export class Room {
  constructor(id, code, name, videoId = '', playState = 'paused', currentTime = 0) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.videoId = videoId;
    this.playState = playState;     // 'playing' | 'paused'
    this.currentTime = currentTime; // seconds
    this.participants = new Map();  // socketId -> Participant
    this.chatHistory = [];          // { username, message, timestamp }
    this.lastSyncTimestamp = Date.now();
  }

  // ─── Participant Management ──────────────────────────────────

  addParticipant(socketId, username) {
    const isFirst = this.participants.size === 0;
    const role = isFirst ? Participant.ROLES.HOST : Participant.ROLES.PARTICIPANT;
    const participant = new Participant(socketId, username, role);
    this.participants.set(socketId, participant);
    return participant;
  }

  removeParticipant(socketId) {
    const participant = this.participants.get(socketId);
    if (!participant) return null;
    this.participants.delete(socketId);

    // If host left and there are still participants, transfer host
    if (participant.isHost() && this.participants.size > 0) {
      const nextHost = this.participants.values().next().value;
      nextHost.role = Participant.ROLES.HOST;
    }

    return participant;
  }

  getParticipant(socketId) {
    return this.participants.get(socketId) || null;
  }

  getParticipantByUserId(userId) {
    for (const [, p] of this.participants) {
      if (p.userId === userId) return p;
    }
    return null;
  }

  getHost() {
    for (const [, p] of this.participants) {
      if (p.isHost()) return p;
    }
    return null;
  }

  getParticipantList() {
    return Array.from(this.participants.values()).map(p => p.toJSON());
  }

  // ─── Role Management ────────────────────────────────────────

  assignRole(requesterId, targetUserId, newRole) {
    const requester = this.getParticipant(requesterId);
    if (!requester || !requester.isHost()) {
      return { success: false, error: 'Only the host can assign roles' };
    }

    const target = this.getParticipantByUserId(targetUserId);
    if (!target) {
      return { success: false, error: 'User not found in room' };
    }

    if (target.isHost()) {
      return { success: false, error: 'Cannot change the host role directly. Use transfer host instead.' };
    }

    if (!Object.values(Participant.ROLES).includes(newRole) || newRole === Participant.ROLES.HOST) {
      return { success: false, error: 'Invalid role' };
    }

    target.role = newRole;
    return { success: true, participant: target };
  }

  transferHost(requesterId, targetUserId) {
    const requester = this.getParticipant(requesterId);
    if (!requester || !requester.isHost()) {
      return { success: false, error: 'Only the host can transfer the host role' };
    }

    const target = this.getParticipantByUserId(targetUserId);
    if (!target) {
      return { success: false, error: 'User not found in room' };
    }

    requester.role = Participant.ROLES.PARTICIPANT;
    target.role = Participant.ROLES.HOST;
    return { success: true };
  }

  removeParticipantByHost(requesterId, targetUserId) {
    const requester = this.getParticipant(requesterId);
    if (!requester || !requester.isHost()) {
      return { success: false, error: 'Only the host can remove participants' };
    }

    const target = this.getParticipantByUserId(targetUserId);
    if (!target) {
      return { success: false, error: 'User not found in room' };
    }

    if (target.isHost()) {
      return { success: false, error: 'Cannot remove the host' };
    }

    this.participants.delete(target.socketId);
    return { success: true, participant: target };
  }

  // ─── Playback Control ────────────────────────────────────────

  validatePlaybackControl(socketId) {
    const participant = this.getParticipant(socketId);
    if (!participant) return { allowed: false, error: 'Not in room' };
    if (!participant.canControlPlayback()) {
      return { allowed: false, error: 'Insufficient permissions. Only Host or Moderator can control playback.' };
    }
    return { allowed: true, participant };
  }

  play(socketId) {
    const check = this.validatePlaybackControl(socketId);
    if (!check.allowed) return check;
    this.playState = 'playing';
    this.lastSyncTimestamp = Date.now();
    this.persistState();
    return { allowed: true };
  }

  pause(socketId) {
    const check = this.validatePlaybackControl(socketId);
    if (!check.allowed) return check;
    this.playState = 'paused';
    this.lastSyncTimestamp = Date.now();
    this.persistState();
    return { allowed: true };
  }

  seek(socketId, time) {
    const check = this.validatePlaybackControl(socketId);
    if (!check.allowed) return check;
    this.currentTime = time;
    this.lastSyncTimestamp = Date.now();
    this.persistState();
    return { allowed: true };
  }

  changeVideo(socketId, videoId) {
    const check = this.validatePlaybackControl(socketId);
    if (!check.allowed) return check;
    this.videoId = videoId;
    this.currentTime = 0;
    this.playState = 'paused';
    this.lastSyncTimestamp = Date.now();
    this.persistState();
    return { allowed: true };
  }

  // ─── Chat ────────────────────────────────────────────────────

  addChatMessage(socketId, message) {
    const participant = this.getParticipant(socketId);
    if (!participant) return null;

    const chatMsg = {
      username: participant.username,
      userId: participant.userId,
      message: message.slice(0, 500), // limit message length
      timestamp: new Date().toISOString(),
    };
    this.chatHistory.push(chatMsg);
    // Keep last 200 messages
    if (this.chatHistory.length > 200) {
      this.chatHistory = this.chatHistory.slice(-200);
    }
    return chatMsg;
  }

  // ─── State Sync ──────────────────────────────────────────────

  getSyncState() {
    return {
      videoId: this.videoId,
      playState: this.playState,
      currentTime: this.currentTime,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }

  getRoomInfo() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      ...this.getSyncState(),
      participants: this.getParticipantList(),
    };
  }

  // ─── Persistence ─────────────────────────────────────────────

  persistState() {
    try {
      const stmt = db.prepare(`
        UPDATE rooms SET video_id = ?, play_state = ?, current_time = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(this.videoId, this.playState, this.currentTime, this.id);
    } catch (err) {
      console.error('Failed to persist room state:', err.message);
    }
  }

  static createInDb(id, code, name) {
    try {
      const stmt = db.prepare(`
        INSERT INTO rooms (id, code, name) VALUES (?, ?, ?)
      `);
      stmt.run(id, code, name);
    } catch (err) {
      console.error('Failed to create room in DB:', err.message);
    }
  }

  static loadFromDb(code) {
    try {
      const stmt = db.prepare('SELECT * FROM rooms WHERE code = ?');
      const row = stmt.get(code);
      if (row) {
        return new Room(row.id, row.code, row.name, row.video_id, row.play_state, row.current_time);
      }
    } catch (err) {
      console.error('Failed to load room from DB:', err.message);
    }
    return null;
  }

  // ─── Utilities ───────────────────────────────────────────────

  isEmpty() {
    return this.participants.size === 0;
  }
}
