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
    setIsRoomNameValid(newRoomName.trim().length > 3);
  };

  const clearRoomName = () => {
    setRoomName("");
    setIsRoomNameValid(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 p-6 text-white">
      {/* Heading Section */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
          Welcome to <span className="text-yellow-300">Super Private Chat</span>
        </h1>
        <p className="text-lg font-medium max-w-xl mx-auto leading-relaxed">
          Enter a room name to start your private chat instantly—no sign-up or login required! Simply share the room URL with anyone you&apos;d like to chat with, and they can join you directly.
          <br />
          <span className="font-bold text-yellow-200">
            It&apos;s quick, hassle-free, and completely secure for seamless conversations. Create your room now and connect effortlessly!
          </span>
        </p>
      </div>

      {/* Room Input Section */}
      <div className="flex flex-col items-center w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="relative w-full">
          <input
            type="text"
            id="room-name-input"
            placeholder="Enter a room name (min 4 characters)"
            value={roomName}
            onChange={handleRoomNameChange}
            className="w-full border-2 border-gray-300 rounded-full px-5 py-4 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-purple-500 focus:border-purple-500 transition-all"
            aria-required="true"
            aria-describedby="room-name-error"
          />
          {roomName && (
            <button
              onClick={clearRoomName}
              className="absolute right-5 top-4 font-extrabold text-gray-500 hover:text-red-500 transition"
              aria-label="Clear input"
            >
              ✕
            </button>
          )}
        </div>
        {roomName.trim().length <= 3 && (
          <div id="room-name-error" className="text-red-500 text-sm">
            Room name must be at least 4 characters long.
          </div>
        )}
        <Link
          href={`/${roomName}`}
          className={`w-full text-center py-4 rounded-full text-lg font-semibold transition-transform ${
            isRoomNameValid
              ? "bg-gradient-to-r from-purple-600 to-blue-500 text-white hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 shadow-lg"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          Create Room
        </Link>
      </div>
    </div>
  );
}
