import { useState } from "react";

type Props = {
  onSend: (message: string) => void;
};

export default function MessageInput({ onSend }: Props) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <input
        type="text"
        placeholder="Type your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-grow border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <button
        onClick={handleSend}
        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
      >
        Send
      </button>
    </div>
  );
}