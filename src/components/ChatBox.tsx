import React, { useEffect, useState, useRef } from "react";
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

  useEffect(() => {
    const socket = io("https://super-chat-backend.onrender.com", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setSocketConnected(true);
      socket.emit("join-room", { room, userName });
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleUserList = (users: User[]) => setActiveUsers(users);

    const handleTypingUsers = (typingUsersList: unknown) => {
      if (Array.isArray(typingUsersList)) {
        setTypingUsers(
          typingUsersList.filter((typingUser) => typingUser !== userName)
        );
      } else {
        console.warn("Invalid typingUsersList received:", typingUsersList);
        setTypingUsers([]);
      }
    };

    const handleRecentMessages = (recentMessages: Message[]) => {
      setMessages(recentMessages);
    };

    const handleReceiveMessage = (message: Message) => {
      setMessages((prev) => [...prev, { ...message, reactions: {} }]);
    };

    const handleMessageReaction = ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: string;
    }) => {
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
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("user-list", handleUserList);
    socket.on("typing", handleTypingUsers);
    socket.on("recent-messages", handleRecentMessages);
    socket.on("receive-message", handleReceiveMessage);
    socket.on("message-reaction", handleMessageReaction);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("user-list", handleUserList);
      socket.off("typing", handleTypingUsers);
      socket.off("recent-messages", handleRecentMessages);
      socket.off("receive-message", handleReceiveMessage);
      socket.off("message-reaction", handleMessageReaction);
      socket.disconnect();
    };
  }, [room, userName]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    
    // Scroll to message being replied to
    setTimeout(() => {
      messageRefs.current[msg.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      setHighlightedMessageId(msg.id);
    }, 100);
  };

  const handleTyping = () => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("typing", { room });
  };

  const formatTimestamp = (isoTimestamp: string) => {
    return formatDistanceToNow(new Date(isoTimestamp), { addSuffix: true });
  };

  // Make URLs clickable
  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
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
          <h3 className="font-bold text-gray-800 mb-2">Active Users:</h3>
          <ul className="max-h-60 overflow-y-auto">
            {activeUsers.map((user, idx) => (
              <li key={idx} className="text-gray-800 py-1 flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${user.status === "online" ? "bg-green-500" : user.status === "typing" ? "bg-yellow-500" : "bg-gray-500"}`}></span>
                {user.userName}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Messages Section */}
      <div
        className="flex-1 overflow-y-auto flex flex-col p-4 rounded-b-lg bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900"
      >
        {messages.map((msg) => {
          const isOriginalMessage = replyingTo?.id === msg.id;
          const isHighlighted = highlightedMessageId === msg.id;
          
          return (
            <motion.div
              key={msg.id}
              ref={(el: any) => el && (messageRefs.current[msg.id] = el)}
              className={`flex my-2 transition-all duration-300 ${isHighlighted ? "ring-4 ring-yellow-400 rounded-xl" : ""}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onDoubleClick={() => handleDoubleTap(msg)}
            >
              <div
                className={`p-4 rounded-xl shadow-md text-sm font-medium max-w-xl w-full ${
                  msg.sender === userName 
                    ? "bg-purple-700 text-white ml-auto" 
                    : "bg-indigo-600 text-white"
                } ${isOriginalMessage ? "ring-2 ring-yellow-400" : ""}`}
              >
                {msg.replyTo && (
                  <div 
                    className="mb-2 p-2 rounded bg-indigo-800 border-l-4 border-blue-400 text-gray-200 text-sm italic cursor-pointer"
                    onClick={() => {
                      const originalMsg = messages.find(m => m.id === msg.replyTo);
                      if (originalMsg) {
                        messageRefs.current[originalMsg.id]?.scrollIntoView({
                          behavior: "smooth",
                          block: "center"
                        });
                        setHighlightedMessageId(originalMsg.id);
                      }
                    }}
                  >
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
                <p className="break-words">{renderMessageText(msg.text)}</p>
                <div className="text-right text-xs text-gray-300 mt-1">
                  {formatTimestamp(msg.timestamp)}
                </div>
              </div>
            </motion.div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Replying to Section */}
      {replyingTo && (
        <motion.div
          className="mb-2 bg-yellow-100 border-l-4 border-yellow-500 text-gray-700 p-3 rounded-md shadow-sm flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="truncate">
            <strong>Replying to:</strong>{" "}
            <span className="italic">
              {replyingTo.text || (replyingTo.imageUrl ? "[Image]" : "")}
            </span>
          </div>
          <div>
            <button
              className="text-blue-500 underline ml-2"
              onClick={() => {
                messageRefs.current[replyingTo.id]?.scrollIntoView({
                  behavior: "smooth",
                  block: "center"
                });
                setHighlightedMessageId(replyingTo.id);
              }}
            >
              View
            </button>
            <button
              className="text-red-500 underline ml-2"
              onClick={() => setReplyingTo(null)}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Typing Indicator */}
      <motion.div
        className="sticky bottom-28 px-4 text-sm italic text-purple-700 bg-purple-50 rounded-md shadow-md w-max mx-auto py-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: typingUsers.length > 0 ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {typingUsers.length > 0 &&
          `${typingUsers.join(", ")} ${
            typingUsers.length > 1 ? "are" : "is"
          } typing...`}
      </motion.div>

      {/* Message Input */}
      <div className="sticky bottom-0 rounded-t-lg bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900 p-4 shadow-md">
        <MessageInput onSend={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}
