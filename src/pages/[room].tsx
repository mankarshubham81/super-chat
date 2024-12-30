import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ChatBox from '../components/ChatBox';
import JoinRoomForm from './../components/JoinRoomModal';

export default function Room() {
  const [name, setName] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const { query } = useRouter();

  const handleJoin = (userName: string) => {
    setName(userName);
    setJoined(true);
  };

  if (!joined) {
    return <JoinRoomForm onJoin={handleJoin} />;
  }

  return <ChatBox room={query.room as string} userName={name!} />;
}
