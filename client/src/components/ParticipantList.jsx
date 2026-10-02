import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function ParticipantList({ participants, currentUser }) {
  const { socket, addToast } = useSocket();
  const isHost = currentUser?.role === 'host';
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAssignRole = (userId, role) => {
    socket.emit('assign_role', { userId, role });
    setOpenDropdown(null);
  };

  const handleRemove = (userId, username) => {
    if (window.confirm(`Remove "${username}" from the room?`)) {
      socket.emit('remove_participant', { userId });
    }
  };

  const handleTransferHost = (userId, username) => {
    if (window.confirm(`Transfer host role to "${username}"?`)) {
      socket.emit('transfer_host', { userId });
    }
  };

  return (
    <div className="participant-list">
      {participants.map((p) => {
        const isMe = p.userId === currentUser?.userId;
        const initial = p.username.charAt(0).toUpperCase();
        const showActions = isHost && !isMe;

        return (
          <div key={p.userId} className="participant-item">
            <div className={`participant-avatar ${p.role}`}>
              {initial}
            </div>

            <div className="participant-info">
              <div className="participant-name">
                {p.username}
                {isMe && <span className="you-tag">(you)</span>}
              </div>
              <span className={`role-tag ${p.role}`}>{p.role}</span>
            </div>

            {showActions && (
              <div className="participant-actions" ref={openDropdown === p.userId ? dropdownRef : null}>
                {/* Role dropdown */}
                <div className="role-dropdown">
                  <button
                    className="participant-action-btn tooltip"
                    data-tooltip="Change role"
                    onClick={() => setOpenDropdown(openDropdown === p.userId ? null : p.userId)}
                  >
                    👑
                  </button>

                  {openDropdown === p.userId && (
                    <div className="role-dropdown-menu">
                      <button
                        className={`role-dropdown-item ${p.role === 'moderator' ? 'active' : ''}`}
                        onClick={() => handleAssignRole(p.userId, 'moderator')}
                      >
                        ⭐ Moderator
                      </button>
                      <button
                        className={`role-dropdown-item ${p.role === 'participant' ? 'active' : ''}`}
                        onClick={() => handleAssignRole(p.userId, 'participant')}
                      >
                        👤 Participant
                      </button>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />
                      <button
                        className="role-dropdown-item"
                        onClick={() => { setOpenDropdown(null); handleTransferHost(p.userId, p.username); }}
                      >
                        🔄 Transfer Host
                      </button>
                    </div>
                  )}
                </div>

                {/* Remove button */}
                <button
                  className="participant-action-btn danger tooltip"
                  data-tooltip="Remove"
                  onClick={() => handleRemove(p.userId, p.username)}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
