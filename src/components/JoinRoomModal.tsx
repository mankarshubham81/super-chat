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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center space-y-4 w-full max-w-md bg-white rounded-lg shadow-lg p-6"
    >
      <input
        type="text"
        placeholder="Enter your name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
      >
        Join Room
      </button>
    </form>
  );
}