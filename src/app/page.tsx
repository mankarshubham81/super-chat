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
    <>
      <head>
        <meta name="description" content="Join private chat rooms instantly. No sign-up or login required. Start chatting securely in just a few seconds." />
        <meta name="keywords" content="private chat, secure messaging, instant chat, no sign-up chat, online communication" />
        <meta name="author" content="Shubham Mankar" />
        <meta property="og:title" content="Super Private Chat - Secure and Instant Messaging" />
        <meta property="og:description" content="Join private chat rooms instantly. No sign-up or login required. Start chatting securely in just a few seconds." />
        <meta property="og:image" content="./icon.png"/>
        <meta property="og:url" content="https://chat-super.vercel.app/" />
      </head>
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white">
        {/* Heading Section */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
            Welcome to <span className="text-yellow-300">Super Private Chat</span>
          </h1>
          <p className="text-lg font-medium max-w-xl mx-auto leading-relaxed">
            Start a private chat instantly—no sign-up or login required! Begin chatting in seconds by entering a room name and name, then share the link for friends, family, or loved ones to join easily.
            <br />
            <span className="font-bold text-yellow-200">
              It&apos;s fast, secure, and effortless—create your room and start chatting now!
            </span>
          </p>
        </div>

        {/* Room Input Section */}
        <div className="flex flex-col items-center w-full max-w-lg bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="relative w-full">
            <input
              type="text"
              id="room-name-input"
              placeholder="Enter a room name (min 4 characters)"
              value={roomName}
              onChange={handleRoomNameChange}
              className="w-full border-none rounded-full px-5 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-500 transition-all"
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
          <Link
            href={`/${roomName}`}
            className={`w-full text-center py-4 rounded-full text-lg font-semibold transition-transform ${
              isRoomNameValid
                ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-500 shadow-lg"
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
            }`}
          >
            Create Room
          </Link>
        </div>
      </div>
    </>
  );
}
