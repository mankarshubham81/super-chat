import { useState } from 'react';

type Props = {
  onSend: (message: string) => void;
};

export default function MessageInput({ onSend }: Props) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="flex">
      <input
        type="text"
        placeholder="Type your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-grow border rounded p-2"
      />
      <button onClick={handleSend} className="bg-green-500 text-white rounded px-4">
        Send
      </button>
    </div>
  );
}
