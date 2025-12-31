import React, { useEffect, useState, useRef, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import MessageInput, { MessageInputRef } from "./MessageInput";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { FiX, FiCornerDownLeft, FiUsers, FiChevronDown } from "react-icons/fi";
import { BsLightningChargeFill } from "react-icons/bs";

type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, number>;
  replyTo?: string | null;
  imageUrl?: string;
  videoUrl?: string;
};

type User = {
  userName: string;
  status: "online" | "typing" | "offline";
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}

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
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("join-room", { room, userName });
    });

    socket.on("disconnect", () => setSocketConnected(false));
    socket.on("user-list", (users: User[]) => setActiveUsers(users));
    socket.on("typing", (typingUsersList: string[]) => {
      if (Array.isArray(typingUsersList)) {
        setTypingUsers(typingUsersList.filter((u) => u !== userName));
      }
    });

    socket.on("recent-messages", (msgs: Message[]) => setMessages(msgs));
    socket.on("receive-message", (msg: Message) => {
      setMessages((prev) => [...prev, { ...msg, reactions: {} }]);
      if (!isAtBottom) {
        setNewMessagesIndicator(true);
      }
    });
    socket.on("message-reaction", (payload: { messageId: string; reaction: string }) => {
      const { messageId, reaction } = payload;
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
  }, [room, userName, isAtBottom]);

  let lastTapTime: number | null = null;

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, []);

  // Highlight message temporarily
  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const handleDoubleTap = (msg: Message) => {
    handleReply(msg);
  };

  const toggleUserList = () => setShowUserList((prev) => !prev);

  const sendMessage = (text: string, imageUrl?: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    const message = { text, replyTo: replyingTo?.id || null, imageUrl };
    socket.emit("send-message", { room, message });

    setReplyingTo(null);
    scrollToBottom();
  };

  const handleReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
  };

  const formatTimestamp = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

    socket.emit("typing", { room });
  };

  const formatTimestamp = (isoTimestamp: string) => {
    return formatDistanceToNow(new Date(isoTimestamp), { addSuffix: true });
  };

  return (
    <div className="flex flex-col h-screen max-w-screen-xl mx-auto">
      {/* Chat Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="text-lg font-bold">{room}</div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-sm ${socketConnected ? "text-green-400" : "text-red-400"}`}
          >
            {socketConnected ? "Connected" : "Disconnected"}
          </span>
          <button
            onClick={toggleUserList}
            className="text-sm bg-purple-700 px-3 py-1 rounded-md hover:bg-purple-900 transition-transform transform hover:scale-105"
          >
            Users ({activeUsers.length})
          </button>
        </div>
      </div>

      {/* User List */}
      {showUserList && (
        <motion.div
          className="bg-white p-4 shadow-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ul>
            {activeUsers.map((user, idx) => (
              <li key={idx} className="text-gray-800">
                {user.userName}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Messages Section */}
      <div
        className="flex-1 overflow-y-auto flex flex-col-reverse p-4 space-y-4 space-y-reverse rounded-b-lg bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900"
      >
        {[...messages].reverse().map((msg) => (
          <motion.div
            key={msg.id}
            className={`flex ${
              msg.sender === userName ? "justify-end" : "justify-start"
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(event, info) => {
              if (info.offset.x > 100) {
                handleReply(msg);
              }
            }}
            onDoubleClick={() => handleReply(msg)}
            onPointerDown={(e) => handleDoubleTap(e, msg)}
          >
            <div
              className={`p-4 rounded-xl shadow-md text-sm font-medium max-w-xl select-none ${
                msg.sender === userName ? "bg-purple-700 text-white" : "bg-indigo-600 text-white"
              }`}
            >
              {msg.replyTo && (
                <div className="mb-2 p-2 rounded bg-green-100 border-l-4 border-green-500 text-gray-700 text-sm italic">
                  Replying to:{" "}
                  <span className="font-semibold">
                    {messages.find((m) => m.id === msg.replyTo)?.text || "Message"}
                  </span>
                </div>
              )}
              <div className="text-xs font-semibold text-gray-300">
                {msg.sender === userName ? "You" : msg.sender}
              </div>
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Uploaded content"
                  className="mt-2 rounded-lg max-w-full h-auto max-h-48 object-cover border-2 border-purple-100"
                />
              )}
              <p>{msg.text}</p>
              <div className="text-right text-xs text-gray-300 mt-1">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Replying To */}
      {replyingTo && (
        <motion.div
          className="bg-yellow-900/30 border-l-4 border-yellow-500 text-gray-200 p-3 flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div>
            <strong>Replying to:</strong>{" "}
            <span className="italic">{replyingTo.text}</span>
          </div>
          <button
            className="text-red-500 underline ml-2"
            onClick={() => setReplyingTo(null)}
          >
            Cancel
          </button>
        </motion.div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <motion.div
          className="sticky bottom-20 px-4 text-sm text-purple-300 bg-purple-900/30 backdrop-blur-sm rounded-full w-max mx-auto py-1.5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className="flex items-center">
            <span className="flex">
              {Array(3).fill(0).map((_, i) => (
                <motion.span 
                  key={i}
                  className="w-1.5 h-1.5 bg-purple-400 rounded-full mx-0.5"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 1.2,
                    delay: i * 0.2
                  }}
                />
              ))}
            </span>
            <span className="ml-2">
              {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
            </span>
          </div>
        </motion.div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 z-10 border-t border-white/5 pb-[env(safe-area-inset-bottom)] bg-gradient-to-r from-purple-900/90 via-indigo-800/90 to-purple-900/90">
        <MessageInput ref={messageInputRef} onSend={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}
