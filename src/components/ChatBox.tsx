import React, { useEffect, useState, useRef, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import MessageInput, { MessageInputHandle } from "./MessageInput";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useSwipeable } from "react-swipeable";

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
  const [isMobile, setIsMobile] = useState(false);
  const socketRef = useRef<typeof Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement>>({});
  const messageInputRef = useRef<MessageInputHandle>(null);

  // Detect mobile devices
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      );
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

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

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);
  

  useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  useEffect(() => {
    if (highlightedMessageId) {
      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId]);

  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      setHighlightedMessageId(messageId);
    }
  }, []);

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    // Focus the input after a short delay
    setTimeout(() => {
      messageInputRef.current?.focus();
      scrollToMessage(msg.id);
    }, 100);
  };

  const handleDoubleTap = (msg: Message) => {
    if (!isMobile) {
      handleReply(msg);
    }
  };

  const toggleUserList = () => setShowUserList((prev) => !prev);

  const sendMessage = (text: string, imageUrl?: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    const message = { text, replyTo: replyingTo?.id || null, imageUrl };
    socket.emit("send-message", { room, message });

    setReplyingTo(null);
  };

  const handleTyping = () => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("typing", { room });
  };

  const formatTimestamp = (isoTimestamp: string) => {
    return formatDistanceToNow(new Date(isoTimestamp), { addSuffix: true });
  };

  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      try {
        if (part.match(urlRegex)) {
          const url = new URL(part);
          return (
            <a
              key={index}
              href={url.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {url.hostname + url.pathname}
            </a>
          );
        }
      } catch (e) {
        console.error("Error parsing URL:", part, e);
        return part;
      }
      return part;
    });
  };

  const setMessageRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) messageRefs.current[id] = el;
  }, []);

  // MessageItem component with swipe functionality
  const MessageItem = React.memo(({
    msg,
    isOriginalMessage,
    isHighlighted,
    setMessageRef,
    handleReply,
    handleDoubleTap,
    isMobile,
    userName,
    scrollToMessage,
    repliedMessage
  }: {
    msg: Message;
    isOriginalMessage: boolean;
    isHighlighted: boolean;
    setMessageRef: (id: string) => (el: HTMLDivElement | null) => void;
    handleReply: (msg: Message) => void;
    handleDoubleTap: (msg: Message) => void;
    isMobile: boolean;
    userName: string;
    scrollToMessage: (messageId: string) => void;
    repliedMessage: Message | null;
  }) => {
    // Swipe handlers for mobile
    const swipeHandlers = useSwipeable({
      onSwipedRight: () => handleReply(msg),
      delta: 50,
      preventScrollOnSwipe: true,
      trackTouch: true,
      trackMouse: false,
      rotationAngle: 0,
      swipeDuration: 500,
    });

    const { ref: swipeRef, ...swipeProps } = swipeHandlers;

    // Create a combined ref that handles both our message ref and the swipe ref
    const combinedRef = useCallback(
      (el: HTMLDivElement | null) => {
        setMessageRef(msg.id)(el);
        if (el) swipeRef(el);
      },
      [setMessageRef, msg.id, swipeRef]
    );

    return (
      <motion.div
        key={msg.id}
        ref={combinedRef}
        {...(isMobile ? swipeProps : {})}
        className={`flex my-1 md:my-2 transition-all duration-300`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onDoubleClick={() => handleDoubleTap(msg)}
      >
        <div
          className={`p-3 md:p-4 rounded-xl shadow-md text-sm font-medium ${isHighlighted ? "ring-4 ring-amber-400/80 bg-amber-100/10 shadow-xl animate-pulse rounded-2xl" : ""} max-w-[85%] md:max-w-xl w-full ${
            msg.sender === userName 
              ? "bg-purple-700 text-white ml-auto" 
              : "bg-indigo-600 text-white"
          } ${isOriginalMessage ? "ring-2 ring-yellow-400" : ""}`}
        >
          {msg.replyTo && (
            <div 
              className="mb-2 p-2 rounded bg-indigo-800 border-l-4 border-blue-400 text-gray-200 text-xs italic cursor-pointer truncate"
              onClick={() => {
                if (msg.replyTo) {
                  scrollToMessage(msg.replyTo);
                }
              }}
            >
              Replying to:{" "}
              <span className="font-semibold">
                {repliedMessage?.text || (repliedMessage?.imageUrl ? "[Image]" : "Message")}
              </span>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-300 truncate" title={msg.sender === userName ? "You" : msg.sender}>
            {msg.sender === userName ? "You" : msg.sender}
          </div>
          {msg.imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden relative w-full h-48">
              <Image
                src={msg.imageUrl}
                alt="Uploaded content"
                fill
                className="object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.parentElement!.innerHTML = '<div class="bg-gray-800 p-4 text-center text-gray-400">Image failed to load</div>';
                }}
              />
            </div>
          )}
          <p className="break-words mt-1">{renderMessageText(msg.text)}</p>
          <div className="text-right text-xs text-gray-300 mt-1">
            {formatTimestamp(msg.timestamp)}
          </div>
        </div>
      </motion.div>
    );
  });
  
  // Add display name to fix ESLint error
  MessageItem.displayName = "MessageItem";

  return (
    <div className="flex flex-col h-screen max-w-screen-xl mx-auto bg-gradient-to-tr from-purple-900 via-indigo-700 to-purple-900">
      {/* Chat Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-tr from-purple-900 via-indigo-800 to-purple-900 text-white p-3 md:p-4 shadow-md flex justify-between items-center">
        <div className="text-lg font-bold truncate max-w-[50%]" title={room}>
          {room}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-xs md:text-sm ${socketConnected ? "text-green-400" : "text-red-400"}`}>
            {socketConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </span>
          <button
            onClick={toggleUserList}
            className="text-xs md:text-sm bg-purple-700 px-2 py-1 md:px-3 md:py-1 rounded-md hover:bg-purple-900 transition-colors flex items-center"
          >
            👥 <span className="ml-1">{activeUsers.length}</span>
          </button>
        </div>
      </div>

      {/* User List */}
      <AnimatePresence>
        {showUserList && (
          <motion.div
            className="bg-white p-4 shadow-md z-10"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="font-bold text-gray-800 mb-2">Active Users:</h3>
            <ul className="max-h-60 overflow-y-auto">
              {activeUsers.map((user, idx) => (
                <li key={idx} className="text-gray-800 py-1 flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${user.status === "online" ? "bg-green-500" : user.status === "typing" ? "bg-yellow-500" : "bg-gray-500"}`}></span>
                  <span className="truncate" title={user.userName}>{user.userName}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Section */}
      <div className="flex-1 overflow-y-auto flex flex-col p-3 md:p-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <div className="text-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="mt-2">No messages yet</p>
              <p className="text-sm">Be the first to send a message!</p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isOriginalMessage = replyingTo?.id === msg.id;
          const isHighlighted = highlightedMessageId === msg.id;
          const repliedMessage = msg.replyTo ? messages.find(m => m.id === msg.replyTo) || null : null;
          
          return (
            <MessageItem
              key={msg.id}
              msg={msg}
              isOriginalMessage={isOriginalMessage}
              isHighlighted={isHighlighted}
              setMessageRef={setMessageRef}
              handleReply={handleReply}
              handleDoubleTap={handleDoubleTap}
              isMobile={isMobile}
              userName={userName}
              scrollToMessage={scrollToMessage}
              repliedMessage={repliedMessage}
            />
          )
        })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Replying to Section */}
      {replyingTo && (
        <motion.div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-gray-700 p-2 md:p-3 flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="truncate flex-1">
            <strong>Replying to:</strong>{" "}
            <span className="italic truncate" title={replyingTo.text || (replyingTo.imageUrl ? "[Image]" : "")}>
              {replyingTo.text || (replyingTo.imageUrl ? "[Image]" : "")}
            </span>
          </div>
          <div className="flex space-x-2 ml-2">
            <button
              className="text-blue-500 hover:text-blue-700"
              onClick={() => scrollToMessage(replyingTo.id)}
              aria-label="View original message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <motion.div
            className="px-4 py-1 text-sm italic text-purple-300 bg-purple-900 rounded-t-md w-full"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {typingUsers.length > 2 
              ? "Several people are typing..." 
              : `${typingUsers.join(", ")} ${typingUsers.length > 1 ? "are" : "is"} typing...`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="sticky bottom-0 bg-gradient-to-tr from-purple-900 via-indigo-800 to-purple-900 p-3 md:p-4 shadow-lg">
      <MessageInput ref={messageInputRef} onSend={sendMessage} onTyping={handleTyping} />
      </div>
    </div>
  );
}
