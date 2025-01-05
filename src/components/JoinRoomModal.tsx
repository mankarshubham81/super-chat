import { useState } from "react";

type Props = {
  onJoin: (name: string) => void;
};

export default function JoinRoomForm({ onJoin }: Props) {
  const [userName, setUserName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      onJoin(userName);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900 rounded-lg shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-6">
          Join Chat Room
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full rounded-lg px-4 py-3 bg-gray-700 text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
          />
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-lg"
          >
            Join Room
          </button>
        </form>
        <p className="text-sm text-gray-400 mt-4 text-center">
          Ensure your name is unique within the room.
        </p>
      </div>
    </div>
  );
}
