"use client"
import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [roomName, setRoomName] = useState('');

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomName(e.target.value);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Welcome to Super Private Chat</h1>
      <p className="text-gray-600 mb-8 text-center">
        Enter a room name to start chatting privately. Share the room URL with someone to join the same room.
        Chats are cleared after 10 minutes for maximum privacy.
      </p>
      <div className="flex flex-col space-y-4 items-center">
        <input
          type="text"
          placeholder="Enter room name"
          value={roomName}
          onChange={handleRoomNameChange}
          className="border rounded px-4 py-2 w-64"
        />
        <Link
          href={`/${roomName}`}
          className={`bg-blue-500 text-white px-6 py-2 rounded ${
            roomName.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {roomName.trim() === '' ? 'Enter a Room Name' : 'Go to Room'}
        </Link>
      </div>
    </div>
  );
}
