// ChatBox.tsx
import React, { useEffect, useState, useRef, TouchEvent } from "react";
import io, { Socket } from "socket.io-client";
import MessageInput from "./MessageInput";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

type Message = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  reactions?: Record<string, number>;
  replyTo?: string | null;
  imageUrl?: string;
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
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const socketRef = useRef<typeof Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const touchStartX = useRef<number | null>(null);

  // ========== SOCKET SETUP ========== //
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
    socket.on("receive-message", (msg: Message) =>
      setMessages((prev) => [...prev, { ...msg, reactions: {} }])
    );
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
  }, [room, userName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => setHighlightedMessageId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const sendMessage = (text: string, imageUrl?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send-message", {
      room,
      message: { text, replyTo: replyingTo?.id || null, imageUrl },
    });
    setReplyingTo(null);
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    setTimeout(() => {
      messageRefs.current[msg.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msg.id);
    }, 100);
  };

  const handleTyping = (() => {
    let lastEmit = 0;
    return () => {
      const now = Date.now();
      if (now - lastEmit > 1000 && socketRef.current) {
        socketRef.current.emit("typing", { room });
        lastEmit = now;
      }
    };
  })();

  const formatTimestamp = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true });

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, idx) =>
      urlRegex.test(part) ? (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  // === HANDLE TOUCH FOR SWIPE RIGHT TO REPLY === //
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent, msg: Message) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0].clientX;
    if (start !== null && end - start > 80) handleReply(msg);
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col h-screen max-w-screen-xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="text-lg font-bold">{room}</div>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${socketConnected ? "text-green-400" : "text-red-400"}`}>
            {socketConnected ? "Connected" : "Disconnected"}
          </span>
          <button
            onClick={() => setShowUserList((prev) => !prev)}
            className="text-sm bg-purple-700 px-3 py-1 rounded-md hover:bg-purple-900"
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
          <h3 className="font-bold text-gray-800 mb-2">Active Users:</h3>
          <ul className="max-h-60 overflow-y-auto">
            {activeUsers.map((user, idx) => (
              <li key={idx} className="text-gray-800 py-1 flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  user.status === "online" ? "bg-green-500" :
                  user.status === "typing" ? "bg-yellow-500" : "bg-gray-500"
                }`} />
                {user.userName}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900">
        {messages.map((msg) => {
          const isMine = msg.sender === userName;
          const isReplyHighlight = highlightedMessageId === msg.id;

          return (
            <motion.div
              key={msg.id}
              ref={(el: HTMLDivElement | null) => {
                if (el) messageRefs.current[msg.id] = el;
              }}
              className={`flex my-2 ${isMine ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onDoubleClick={() => handleReply(msg)}
              onTouchStart={(e) => handleTouchStart(e, msg.id)}
              onTouchEnd={(e) => handleTouchEnd(e, msg)}
            >
              <div
                className={`relative p-4 rounded-xl shadow-md text-sm font-medium max-w-sm w-full break-words ${
                  isMine ? "bg-purple-700 text-white ml-auto" : "bg-indigo-600 text-white"
                } ${isReplyHighlight ? "ring-4 ring-yellow-400" : ""}`}
              >
                {msg.replyTo && (
                  <div
                    className="mb-2 p-2 rounded bg-indigo-800 border-l-4 border-blue-400 text-gray-200 text-sm italic cursor-pointer"
                    onClick={() => {
                      const original = messages.find((m) => m.id === msg.replyTo);
                      if (original) {
                        messageRefs.current[original.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setHighlightedMessageId(original.id);
                      }
                    }}
                  >
                    Replying to:{" "}
                    <span className="font-semibold">
                      {messages.find((m) => m.id === msg.replyTo)?.text || "Message"}
                    </span>
                  </div>
                )}
                <div className="text-xs font-semibold text-gray-300 mb-1">
                  {msg.sender === userName ? "You" : msg.sender}
                </div>
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="Attached"
                    className="rounded-lg max-w-full max-h-48 border border-white mb-2"
                  />
                )}
                {renderMessageText(msg.text)}
                <div className="text-right text-xs text-gray-300 mt-1">
                  {formatTimestamp(msg.timestamp)}
                </div>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying To */}
      {replyingTo && (
        <motion.div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-gray-700 p-3 shadow-inner rounded-t-md flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="truncate">
            <strong>Replying to:</strong>{" "}
            <span className="italic">
              {replyingTo.text || (replyingTo.imageUrl ? "[Image]" : "")}
            </span>
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              className="text-blue-500 underline"
              onClick={() => {
                messageRefs.current[replyingTo.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlightedMessageId(replyingTo.id);
              }}
            >
              View
            </button>
            <button className="text-red-500 underline" onClick={() => setReplyingTo(null)}>
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <motion.div
          className="sticky bottom-24 px-4 text-sm italic text-purple-700 bg-purple-50 rounded-md shadow w-max mx-auto py-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
        </motion.div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 z-10 bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900 p-4 shadow-md rounded-t-lg">
        <MessageInput onSend={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}
