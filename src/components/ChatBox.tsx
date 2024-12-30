import { useEffect, useState } from "react";
import { default as io, Socket } from "socket.io-client"; // Correct import for io
import MessageInput from "./MessageInput";

type Props = {
  room: string;
  userName: string;
};

type Message = {
  sender: string;
  text: string;
};

let socket: any | null = null;

export default function ChatBox({ room, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Initialize the socket connection
    socket = io({
      path: "/api/socket",
    });

    // Join the specified room
    socket.emit("join-room", room);

    // Listen for incoming messages
    socket.on("receive-message", (message: string) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "Other", text: message },
      ]);
    });

    // Cleanup on component unmount
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [room]);

  const sendMessage = (message: string) => {
    if (!socket) return;

    const fullMessage = `${userName}: ${message}`;
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "You", text: fullMessage },
    ]);

    // Emit the message to the server
    socket.emit("send-message", { room, message: fullMessage });
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="border p-4 h-96 overflow-y-auto bg-white rounded shadow">
        {messages.map((msg, idx) => (
          <div key={idx} className={`text-sm ${msg.sender === "You" ? "text-blue-600" : "text-gray-800"}`}>
            <strong>{msg.sender}: </strong>
            {msg.text}
          </div>
        ))}
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
