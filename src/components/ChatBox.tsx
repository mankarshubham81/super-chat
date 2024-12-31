import { useEffect, useState } from "react";
import { default as io, Socket } from "socket.io-client";
import MessageInput from "./MessageInput";

type Props = {
  room: string;
  userName: string;
};

type Message = {
  sender: string;
  text: string;
};

let socket: typeof Socket | null = null;

export default function ChatBox({ room, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Initialize the socket connection
    socket = io("https://chat-super.vercel.app", {
      path: "/api/socket",
    });

    // Join the specified room
    socket.emit("join-room", room);

    // Listen for incoming messages
    socket.on("receive-message", (data: { sender: string; text: string }) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [room]);

  const sendMessage = (message: string) => {
    if (!socket) return;

    const messageData = { sender: userName, text: message };

    // Emit the message to the server (server will broadcast it back)
    socket.emit("send-message", { room, message: messageData });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 space-y-6 bg-white rounded-xl shadow-lg">
      <div className="border border-gray-200 p-6 h-[500px] sm:h-[600px] overflow-y-auto bg-gray-50 rounded-xl shadow-inner">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg shadow-md text-sm font-medium max-w-xs w-fit ${
                msg.sender === userName
                  ? "ml-auto bg-blue-500 text-white"
                  : "mr-auto bg-gray-200 text-gray-800"
              }`}
            >
              <strong className="block mb-1 text-xs font-semibold text-gray-600">
                {msg.sender === userName ? "You" : msg.sender}
              </strong>
              <p>{msg.text}</p>
            </div>
          ))}
        </div>
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
