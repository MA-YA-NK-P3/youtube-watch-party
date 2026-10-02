import { useState } from 'react';
import { SocketProvider } from './context/SocketContext';
import LandingPage from './components/LandingPage';
import RoomView from './components/RoomView';
import ToastContainer from './components/ToastContainer';

export default function App() {
  const [roomState, setRoomState] = useState(null);
  // roomState = { room, user, chatHistory }

  const handleJoinedRoom = (data) => {
    setRoomState(data);
  };

  const handleLeaveRoom = () => {
    setRoomState(null);
  };

  return (
    <SocketProvider>
      <div className="app-bg" />
      <div className="app-content">
        {roomState ? (
          <RoomView
            initialRoom={roomState.room}
            currentUser={roomState.user}
            initialChatHistory={roomState.chatHistory || []}
            onLeave={handleLeaveRoom}
          />
        ) : (
          <LandingPage onJoined={handleJoinedRoom} />
        )}
      </div>
      <ToastContainer />
    </SocketProvider>
  );
}
