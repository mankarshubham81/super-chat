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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500 p-6 text-white">
      {/* Heading Section */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
          Welcome to <span className="text-yellow-300">Super Private Chat</span>
        </h1>
        <p className="text-lg font-medium max-w-xl mx-auto leading-relaxed">
        Enter a room name to start your private chat instantly—no sign-up or login required! Simply share the room URL with anyone you'd like to chat with, and they can join you directly.
          <br />
          <span className="font-bold text-yellow-200">
          It's quick, hassle-free, and completely secure for seamless conversations. Create your room now and connect effortlessly!
          </span>
        </p>
      </div>

      {/* Room Input Section */}
      <div className="flex flex-col space-y-6 items-center w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <input
          type="text"
          id="room-name-input"
          placeholder="Enter room name"
          value={roomName}
          onChange={handleRoomNameChange}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-purple-500"
          aria-required="true"
          aria-describedby="room-name-error"
        />
        {roomName.trim() === "" && (
          <div id="room-name-error" className="text-red-500 text-sm">
            Please enter a room name.
          </div>
        )}
        <Link
          href={`/${roomName}`}
          className={`w-full text-center py-3 rounded-lg font-semibold text-lg transition-transform ${
            isRoomNameValid
              ? "bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-500 transform hover:scale-105"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          Go to Room
        </Link>
      </div>
    </div>
  );
}
