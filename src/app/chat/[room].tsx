import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ChatBox from '../../components/ChatBox';
import JoinRoomModal from '../../components/JoinRoomModal';
import Timer from '../../components/Timer';
import { socket } from '../../utils/socket';

interface Message {
  user: string;
  text: string;
}

export default function Room() {
  const router = useRouter();
  const { room } = router.query;
  const [userName, setUserName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!room) return;

    socket.emit('joinRoom', { room });

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [room]);

  if (!userName) {
    return <JoinRoomModal setUserName={setUserName} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-center my-4">
        Room: {room}
      </h1>
      <ChatBox messages={messages} userName={userName} />
      <Timer onTimeout={() => setMessages([])} />
    </div>
  );
}
