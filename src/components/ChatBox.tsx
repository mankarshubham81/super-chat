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
};

type User = {
  userName: string;
  status: "online" | "typing" | "offline";
};

export default function ChatBox({ room, userName }: { room: string; userName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<typeof Socket | null>(null);

  useEffect(() => {
    const socket = io("https://super-chat-backend.onrender.com", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join-room", { room, userName });
    });

    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("user-list", (users: User[]) => setActiveUsers(users));

    socket.on("typing", (typingUsersList: string[]) => {
      setTypingUsers(
        typingUsersList.filter((typingUser) => typingUser !== userName)
      );
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

  const toggleUserList = () => setShowUserList((prev) => !prev);

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

  const formatTimestamp = (isoTimestamp: string) => {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return `${Math.floor(diff)} secs ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    return date.toLocaleString("en-US", { hour: "numeric", minute: "numeric", hour12: true });
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-purple-700 text-white p-4 shadow-md flex justify-between items-center">
        <div className="text-lg font-bold">{room}</div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-sm ${
              socketConnected ? "text-green-300" : "text-red-300"
            }`}
          >
            {socketConnected ? "Connected" : "Disconnected"}
          </span>
          <button
            onClick={toggleUserList}
            className="text-sm bg-purple-500 px-3 py-1 rounded-md hover:bg-purple-600 transition-transform transform hover:scale-105"
          >
            Users ({activeUsers.length})
          </button>
        </div>
      </div>

      {/* User List */}
      {showUserList && (
        <div className="bg-white p-4 shadow-md">
          <ul>
            {activeUsers.map((user, idx) => (
              <li key={idx} className="text-gray-800">
                {user.userName}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                {formatTimestamp(msg.timestamp)}
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

      {/* Typing Indicator */}
      <div className="sticky bottom-28 px-4 text-sm italic text-purple-500">
        {typingUsers.length > 0 && `${typingUsers.join(", ")} ${typingUsers.length > 1 ? "are" : "is"} typing...`}
      </div>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-purple-700 p-4 shadow-md">
        <MessageInput onSend={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}
