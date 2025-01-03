import React, { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import MessageInput from "./MessageInput";

type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, number>;
  replyTo?: string | null;
  readBy?: string[]; // List of users who read the message
};

type User = {
  userName: string;
  status: "online" | "typing" | "offline";
};

export default function ChatBox({ room, userName }: { room: string; userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<typeof Socket | null>(null);

  useEffect(() => {
    // const socket = io(process.env.REACT_APP_BACKEND_URL || "http://localhost:3001", {
    //   transports: ["websocket", "polling"],
    // });
    const socket = io("https://super-chat-backend.onrender.com", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join-room", { room, userName });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("user-list", (users: User[]) => {
      setActiveUsers(users);
    });

    socket.on("notification", (message: string) => {
      setNotifications((prev) => [...prev, message]);
      setTimeout(() => {
        setNotifications((prev) => prev.slice(1));
      }, 5000); // Auto-dismiss notifications after 5 seconds
    });

    socket.on("typing", (typingUser: string) => {
      setTypingUsers((prev) => [...new Set([...prev, typingUser])]);
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((user) => user !== typingUser));
      }, 2000);
    });

    socket.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, { ...message, reactions: {}, readBy: [] }]);
    });

    socket.on("message-reaction", ({ messageId, reaction }: { messageId: string; reaction: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: {
                  ...msg.reactions,
                  [reaction]: (msg.reactions?.[reaction] || 0) + 1,
                },
              }
            : msg
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [room, userName]);

  const sendMessage = (text: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    const message = { text, replyTo: replyingTo?.id || null };
    socket.emit("send-message", { room, message });

    setReplyingTo(null);
  };

  const reactToMessage = (messageId: string, reaction: string) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("react-message", { room, messageId, reaction });
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
  };

  const handleTyping = () => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit("typing", { room });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-white border-b p-4 shadow-md flex justify-between items-center">
        <div className="text-lg font-semibold text-indigo-600">{room}</div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-sm font-semibold ${
              socketConnected ? "text-green-500" : "text-red-500"
            }`}
          >
            {socketConnected ? "Connected" : "Disconnected"}
          </span>
          <button
            onClick={() => console.log("Show active users")}
            className="text-sm bg-indigo-500 text-white px-3 py-1 rounded-md shadow-md hover:bg-indigo-600 transition-transform transform hover:scale-105"
          >
            Active Users ({activeUsers.length})
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="absolute top-16 right-4 z-30 space-y-2">
        {notifications.map((note, idx) => (
          <div
            key={idx}
            className="bg-indigo-500 text-white px-4 py-2 rounded-md shadow-md animate-fadeIn"
          >
            {note}
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      <div className="px-4 text-sm italic text-gray-500">
        {typingUsers.length > 0 && `${typingUsers.join(", ")} is typing...`}
      </div>

      {/* Messages Section */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-200 via-white to-gray-200">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === userName ? "justify-end" : "justify-start"
            }`}
            onDoubleClick={() => handleReply(msg)}
          >
            <div
              className={`p-4 rounded-xl shadow-md text-sm font-medium max-w-xs transition-transform transform hover:scale-105 ${
                msg.sender === userName
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {msg.replyTo && (
                <div className="mb-2 text-xs italic text-green-500">
                  Replying to: {messages.find((m) => m.id === msg.replyTo)?.text || "Message"}
                </div>
              )}
              <div className="text-xs font-semibold text-gray-400">
                {msg.sender === userName ? "You" : msg.sender}
              </div>
              <p>{msg.text}</p>
              <div className="text-right text-xs text-gray-400 mt-1">
                {msg.timestamp}
              </div>
              <div className="flex space-x-2 mt-2">
                {["👍", "❤️", "😂"].map((reaction) => (
                  <button
                    key={reaction}
                    className="text-xs bg-indigo-100 hover:bg-indigo-200 rounded px-1 py-0.5 transition-all duration-200"
                    onClick={() => reactToMessage(msg.id, reaction)}
                  >
                    {reaction} {msg.reactions?.[reaction] || 0}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input Section */}
      <div className="sticky bottom-0 bg-white border-t p-4 shadow-md">
        {replyingTo && (
          <div className="mb-2 text-sm bg-yellow-100 text-yellow-700 p-2 rounded-md shadow-sm animate-fadeIn">
            Replying to: <strong>{replyingTo.text}</strong>
            <button
              className="text-indigo-500 underline ml-2"
              onClick={() => setReplyingTo(null)}
            >
              Cancel
            </button>
          </div>
        )}
        <MessageInput onSend={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}
