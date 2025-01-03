import { useState } from "react";

type Props = {
  onSend: (message: string) => void;
  onTyping?: () => void; // Optional callback for typing indicator
  placeholder?: string;  // Customizable placeholder text
};

export default function MessageInput({ onSend, onTyping, placeholder = "Type your message" }: Props) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (onTyping) onTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <input
        type="text"
        placeholder={placeholder}
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="flex-grow border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <button
        onClick={handleSend}
        disabled={!message.trim()}
        className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 focus:ring-2 focus:ring-green-400 focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </div>
  );
}
