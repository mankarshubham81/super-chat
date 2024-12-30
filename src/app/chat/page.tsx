"use client"
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const router = useRouter();

  const handleJoinRoom = () => {
    if (roomName.trim()) router.push(`/${roomName}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Welcome to Super Private Chat</h1>
      <input
        type="text"
        placeholder="Enter Room Name"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        className="p-2 border border-gray-300 rounded mb-4"
      />
      <button
        onClick={handleJoinRoom}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Join Room
      </button>
    </div>
  );
}
