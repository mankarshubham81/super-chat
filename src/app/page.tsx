"use client";

import Link from 'next/link';
import { useState } from 'react';
import "./globals.css";

export default function HomePage() {
  const [roomName, setRoomName] = useState('');
  const [isRoomNameValid, setIsRoomNameValid] = useState(false);

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRoomName = e.target.value;
    setRoomName(newRoomName);
    setIsRoomNameValid(newRoomName.trim() !== '');
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
          id="room-name-input"
          placeholder="Enter room name"
          value={roomName}
          onChange={handleRoomNameChange}
          className="border rounded px-4 py-2 w-64"
          aria-required="true"
          aria-describedby="room-name-error"
        />
        {roomName.trim() === '' && (
          <div id="room-name-error" className="text-red-500 text-sm">
            Please enter a room name.
          </div>
        )}
        <Link
          href={`/${roomName}`}
          className={`bg-blue-500 text-white px-6 py-2 rounded ${
            !isRoomNameValid ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Go to Room
        </Link>
      </div>
    </div>
  );
}