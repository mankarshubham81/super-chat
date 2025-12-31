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
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [newMessagesIndicator, setNewMessagesIndicator] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState<{ id: string; distance: number } | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  const isMobile = useMediaQuery("(max-width: 768px)");

  const socketRef = useRef<typeof Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const messageInputRef = useRef<MessageInputRef>(null);
  const touchStartX = useRef<number | null>(null);
  const swipeThreshold = isMobile ? 80 : 100;
  const scrollToBottomTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Scroll management
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      setIsAtBottom(isBottom);
      if (isBottom && newMessagesIndicator) {
        setNewMessagesIndicator(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [newMessagesIndicator]);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => setHighlightedMessageId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const scrollToBottom = useCallback(() => {
    if (scrollToBottomTimeout.current) {
      clearTimeout(scrollToBottomTimeout.current);
    }
    
    scrollToBottomTimeout.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setNewMessagesIndicator(false);
    }, 100);
  }, []);

  const sendMessage = (text: string, imageUrl?: string, videoUrl?: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send-message", {
      room,
      message: { text, replyTo: replyingTo?.id || null, imageUrl, videoUrl },
    });
    setReplyingTo(null);
    scrollToBottom();
  };

  const handleReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
    setSwipeProgress(null);
    
    setTimeout(() => {
      messageRefs.current[msg.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msg.id);
      messageInputRef.current?.focus();
    }, 100);
  }, []);

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
          className="text-blue-300 underline break-all hover:text-blue-200 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  // === ENHANCED SWIPE HANDLING === //
  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipeProgress({ id: msg.id, distance: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent, msg: Message) => {
    if (touchStartX.current === null) return;
    
    const currentX = e.touches[0].clientX;
    const distance = Math.max(0, currentX - touchStartX.current);
    
    if (distance > 0) {
      setSwipeProgress({ 
        id: msg.id, 
        distance: Math.min(distance, swipeThreshold + 50)
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, msg: Message) => {
    if (touchStartX.current === null) return;
    
    const endX = e.changedTouches[0].clientX;
    const distance = endX - touchStartX.current;
    
    if (distance > swipeThreshold) {
      handleReply(msg);
    } else {
      setSwipeProgress(null);
    }
    
    touchStartX.current = null;
  };

  const renderMessageItem = (msg: Message) => {
    const isMine = msg.sender === userName;
    const isReplyHighlight = highlightedMessageId === msg.id;
    const isSwiping = swipeProgress?.id === msg.id;
    const swipeDistance = isSwiping ? swipeProgress.distance : 0;
    const swipePercentage = Math.min(100, (swipeDistance / swipeThreshold) * 100);

    return (
      <motion.div
        key={msg.id}
        ref={(el: HTMLDivElement | null) => {
          if (el) messageRefs.current[msg.id] = el;
        }}
        className={`flex my-2 relative ${isMine ? "justify-end" : "justify-start"}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onDoubleClick={() => handleReply(msg)}
        onTouchStart={(e) => handleTouchStart(e, msg)}
        onTouchMove={(e) => handleTouchMove(e, msg)}
        onTouchEnd={(e) => handleTouchEnd(e, msg)}
      >
        {/* Swipe Feedback Indicator */}
        {isSwiping && (
          <motion.div 
            className="absolute inset-y-0 left-0 flex items-center pl-2 z-0"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: swipePercentage > 10 ? 1 : 0,
              x: Math.min(swipeDistance, swipeThreshold) - 30
            }}
          >
            <FiCornerDownLeft className="w-6 h-6 text-purple-400" />
          </motion.div>
        )}

        {/* Message Content */}
        <motion.div
          className={`relative p-4 rounded-2xl shadow-md text-sm font-medium ${isMobile ? 'max-w-[85%]' : 'max-w-xs md:max-w-md'} w-full break-words z-10 transition-all ${
            isMine 
              ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white ml-auto" 
              : "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white"
          } ${isReplyHighlight ? "ring-4 ring-yellow-400" : ""}`}
          style={{ 
            transform: isSwiping ? `translateX(${swipeDistance}px)` : 'none',
            transition: isSwiping ? 'none' : 'transform 0.2s ease'
          }}
        >
          {msg.replyTo && (
            <div
              className="mb-2 p-2 rounded-lg bg-indigo-800/60 border-l-2 border-blue-400 text-gray-200 text-xs italic cursor-pointer hover:bg-indigo-700/60 transition-colors"
              onClick={() => {
                const original = messages.find((m) => m.id === msg.replyTo);
                if (original) {
                  messageRefs.current[original.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                  setHighlightedMessageId(original.id);
                  messageInputRef.current?.focus();
                }
              }}
            >
              <span className="font-semibold text-blue-300">
                {messages.find((m) => m.id === msg.replyTo)?.sender === userName ? "You" : messages.find((m) => m.id === msg.replyTo)?.sender}
              </span>
              :{" "}
              <span className="truncate max-w-[180px]">
                {messages.find((m) => m.id === msg.replyTo)?.text || "Message"}
              </span>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-200 mb-1 flex items-center">
            {msg.sender === userName ? (
              <>
                <span>You</span>
                <BsLightningChargeFill className="ml-1 text-yellow-300" />
              </>
            ) : (
              msg.sender
            )}
          </div>
          {msg.imageUrl && (
            <div className="relative w-full h-48 mb-2 rounded-xl overflow-hidden border border-white/20">
              <Image
                src={msg.imageUrl}
                alt="Attached image"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          {msg.videoUrl && (
            <div className="relative w-full mb-2 rounded-xl overflow-hidden border border-white/20 bg-black/30">
              <video
                src={msg.videoUrl}
                controls
                preload="metadata"
                className="w-full h-48 object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="text-[15px] leading-snug">
            {renderMessageText(msg.text)}
          </div>
          <div className="text-right text-[11px] text-gray-300 mt-1">
            {formatTimestamp(msg.timestamp)}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-screen max-w-screen-xl mx-auto overflow-hidden bg-gradient-to-r from-purple-900/90 via-indigo-800/90 to-purple-900/90">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-purple-900/90 via-indigo-800/90 to-purple-900/90 backdrop-blur-sm text-white p-3 shadow-lg flex justify-between items-center border-b border-white/10">
        <div className="flex items-center">
          <div className="text-lg font-bold truncate max-w-[120px] sm:max-w-xs">{room}</div>
          <div className="ml-2 flex items-center">
            <span className={`w-2 h-2 rounded-full mr-1 ${socketConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></span>
            <span className="text-xs text-gray-300">
              {socketConnected ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUserList((prev) => !prev)}
            className="flex items-center text-sm bg-purple-700/60 hover:bg-purple-600 transition-colors px-3 py-1.5 rounded-lg group"
          >
            <FiUsers className="mr-1.5" />
            <span className="hidden sm:inline">{activeUsers.length}</span>
          </button>
        </div>
      </div>

      {/* User List */}
      <AnimatePresence>
        {showUserList && (
          <motion.div
            className={`bg-gray-800/90 backdrop-blur-lg p-4 shadow-xl border-b border-white/10 ${
              isMobile ? 'fixed inset-0 z-50' : ''
            }`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-200">Active Users</h3>
              <button 
                onClick={() => setShowUserList(false)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>
            <ul className="max-h-60 overflow-y-auto space-y-2">
              {activeUsers.map((user, idx) => (
                <li key={idx} className="text-gray-200 py-1.5 px-3 rounded-lg bg-gray-700/50 flex items-center">
                  <span className={`inline-block w-2 h-2 rounded-full mr-3 ${
                    user.status === "online" ? "bg-green-500" :
                    user.status === "typing" ? "bg-yellow-500 animate-pulse" : "bg-gray-500"
                  }`} />
                  <span className="truncate flex-1">{user.userName}</span>
                  {user.status === "typing" && (
                    <span className="text-xs text-yellow-400 italic ml-2">typing...</span>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gradient-to-r from-purple-900/90 via-indigo-800/90 to-purple-900/90 relative pb-24"
      >
        {messages.map(renderMessageItem)}
        <div ref={messagesEndRef} />
        
        {/* New Messages Indicator */}
        {newMessagesIndicator && (
          <motion.button
            className="fixed bottom-24 right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg z-10 flex items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToBottom}
          >
            New messages
            <FiChevronDown className="ml-2 animate-bounce" />
          </motion.button>
        )}
      </div>

      {/* Replying To */}
      {replyingTo && (
        <motion.div
          className="bg-yellow-900/30 border-l-4 border-yellow-500 text-gray-200 p-3 flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="truncate pr-2">
            <strong className="text-yellow-300">Replying to:</strong>{" "}
            <span className="italic">
              {replyingTo.text || (replyingTo.imageUrl ? "[Image]" : replyingTo.videoUrl ? "[Video]" : "")}
            </span>
          </div>
          <div className="flex gap-2 ml-4 shrink-0">
            <button
              className="text-blue-300 hover:text-blue-200 transition-colors"
              onClick={() => {
                messageRefs.current[replyingTo.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
                setHighlightedMessageId(replyingTo.id);
              }}
            >
              View
            </button>
            <button className="text-red-300 hover:text-red-200 transition-colors" onClick={() => setReplyingTo(null)}>
              Cancel
            </button>
          </div>
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
