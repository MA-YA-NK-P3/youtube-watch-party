/**
 * Participant class – represents a user in a room.
 * Encapsulates user identity and role state.
 */
export class Participant {
  static ROLES = {
    HOST: 'host',
    MODERATOR: 'moderator',
    PARTICIPANT: 'participant',
  };

  constructor(socketId, username, role = Participant.ROLES.PARTICIPANT) {
    this.socketId = socketId;
    this.userId = socketId; // use socketId as unique identifier
    this.username = username;
    this.role = role;
    this.joinedAt = new Date().toISOString();
  }

  /**
   * Check if this participant has playback control permissions
   */
  canControlPlayback() {
    return this.role === Participant.ROLES.HOST || this.role === Participant.ROLES.MODERATOR;
  }

  /**
   * Check if this participant is the host
   */
  isHost() {
    return this.role === Participant.ROLES.HOST;
  }

  /**
   * Serialize to a plain object for transmission
   */
  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt,
    };
  }
}
