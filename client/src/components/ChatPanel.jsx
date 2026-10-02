import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export default function ChatPanel({ messages, currentUser }) {
  const { socket } = useSocket();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg) return;

    socket.emit('chat_message', { message: msg });
    setInput('');
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <span>No messages yet</span>
            <span style={{ fontSize: 'var(--font-size-xs)' }}>Be the first to say hello!</span>
          </div>
        ) : (
          messages.map((msg, i) => {
            // System messages
            if (msg.system) {
              return (
                <div key={i} className="chat-system-message">
                  {msg.message}
                </div>
              );
            }

            const isMe = msg.userId === currentUser?.userId;
            return (
              <div key={i} className="chat-message">
                <div className="chat-message-header">
                  <span className="chat-message-author" style={isMe ? { color: 'var(--accent-tertiary)' } : {}}>
                    {isMe ? 'You' : msg.username}
                  </span>
                  <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chat-message-text">{msg.message}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          id="input-chat-message"
          className="chat-input"
          type="text"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
        />
        <button
          id="btn-send-chat"
          className="chat-send-btn"
          type="submit"
          disabled={!input.trim()}
        >
          ↑
        </button>
      </form>
    </div>
  );
}
