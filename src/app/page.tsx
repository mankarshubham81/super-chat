"use client";

import Link from "next/link";
import { useState } from "react";
import "./globals.css";

export default function HomePage() {
  const [roomName, setRoomName] = useState("");
  const [isRoomNameValid, setIsRoomNameValid] = useState(false);

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRoomName = e.target.value;
    setRoomName(newRoomName);
    setIsRoomNameValid(newRoomName.trim() !== "");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-500 to-blue-800 p-6 text-white">
      <h1 className="text-4xl font-extrabold mb-4 text-center">Welcome to Super Private Chat</h1>
      <p className="text-lg mb-8 text-center max-w-xl">
        Enter a room name to start chatting privately. Share the room URL with someone to join the same room. Chats are cleared after 10 minutes for maximum privacy.
      </p>
      <div className="flex flex-col space-y-4 items-center w-full max-w-md">
        <input
          type="text"
          id="room-name-input"
          placeholder="Enter room name"
          value={roomName}
          onChange={handleRoomNameChange}
          className="w-full border-2 border-blue-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-required="true"
          aria-describedby="room-name-error"
        />
        {roomName.trim() === "" && (
          <div id="room-name-error" className="text-red-400 text-sm">
            Please enter a room name.
          </div>
        )}
        <Link
          href={`/${roomName}`}
          className={`w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-center ${
            !isRoomNameValid ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
          }`}
        >
          Go to Room
        </Link>
      </div>
    </div>
  );
}