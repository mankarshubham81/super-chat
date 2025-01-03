import React, { useState } from "react";

export default function MessageInput({
  onSend,
  onTyping,
}: {
  onSend: (message: string) => void;
  onTyping?: () => void;
}) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <input
        type="text"
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (onTyping) onTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
        }}
        placeholder="Type a message..."
        className="flex-grow border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
      >
        Send
      </button>
    </div>
  );
}
