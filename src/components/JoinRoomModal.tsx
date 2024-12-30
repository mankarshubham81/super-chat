import { useState } from 'react';

type Props = {
  onJoin: (name: string) => void;
};

export default function JoinRoomForm({ onJoin }: Props) {
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userName.trim()) {
      onJoin(userName);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center space-y-4">
      <input
        type="text"
        placeholder="Enter your name"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        className="border rounded p-2"
      />
      <button type="submit" className="bg-blue-500 text-white rounded px-4 py-2">
        Join Room
      </button>
    </form>
  );
}
