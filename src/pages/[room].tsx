import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ChatBox from '../components/ChatBox';
import JoinRoomForm from './../components/JoinRoomModal';
import '../app/globals.css';

export default function Room() {
  const [name, setName] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState<string | null>(null);  // Added room state
  const { query } = useRouter();

  // Set room in localStorage and state when query.room changes
  useEffect(() => {
    if (query.room) {
      localStorage.setItem("room", query.room as string);  // Save room to localStorage
      setRoom(query.room as string);  // Set room state
    }
  }, [query.room]);

  const handleJoin = (userName: string) => {
    setName(userName);
    localStorage.setItem("userName", userName);
    setJoined(true);
  };

  if (!joined) {
    return <JoinRoomForm onJoin={handleJoin} />;
  }

  return <ChatBox room={room!} userName={name!} />;
}
