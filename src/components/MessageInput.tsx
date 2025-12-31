import React, { 
  useState, 
  useRef, 
  forwardRef, 
  useImperativeHandle,
  useEffect,
  useCallback
} from "react";
import Image from "next/image";
import { FiSend, FiX, FiPaperclip, FiSmile } from "react-icons/fi";
import dynamic from "next/dynamic";

// Dynamically load emoji picker for better performance
const EmojiPicker = dynamic(() => import("./EmojiPicker"), {
  loading: () => <div className="text-gray-400">Loading emojis...</div>,
  ssr: false
});

export type MessageInputRef = {
  focus: () => void;
  clear: () => void;
  cancelUpload: () => void;
  setMessage: (text: string) => void;
};

type MessageInputProps = {
  onSend: (message: string, imageUrl?: string, videoUrl?: string) => void;
  onTyping?: () => void;
};

const MAX_FILE_SIZE_MB = 20;
const MAX_VIDEO_SIZE_MB = 50;
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VALID_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

const CircularProgress = ({ progress, size = 60, strokeWidth = 6 }: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number; 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={strokeWidth}
          strokeOpacity="0.2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-purple-600">
        {progress}%
      </div>
    </div>
  );
};

type EmojiSelectData = {
  id: string;
  name: string;
  native: string;
  unified: string;
  shortcodes: string;
  keywords?: string[];
};

const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
  ({ onSend, onTyping }, ref) => {
    const [message, setMessage] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewKind, setPreviewKind] = useState<"image" | "video" | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null); // Store xhr for proper abort
    const previewUrlRef = useRef<string | null>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => {
        setMessage("");
        resetTextareaHeight();
        cancelUpload();
      },
      cancelUpload: () => cancelUpload(),
      setMessage: (text: string) => setMessage(text)
    }));

    const resetTextareaHeight = useCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = "44px";
      }
    }, []);

    const autoResizeTextarea = useCallback(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        const newHeight = Math.min(
          textareaRef.current.scrollHeight,
          132
        );
        textareaRef.current.style.height = `${newHeight}px`;
        textareaRef.current.style.overflowY = newHeight >= 132 ? "auto" : "hidden";
      }
    }, []);

    useEffect(() => {
      autoResizeTextarea();
    }, [message, autoResizeTextarea]);

    useEffect(() => {
      return () => {
        if (xhrRef.current) {
          xhrRef.current.abort();
          xhrRef.current = null;
        }
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
      };
    }, []);

    const validateFile = (file: File, kind: "image" | "video"): boolean => {
      if (kind === "image") {
        if (!VALID_MIME_TYPES.includes(file.type)) {
          setError("Unsupported file type. Please upload an image (JPEG, PNG, GIF, WEBP)." );
          return false;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setError(`File size exceeds limit (max ${MAX_FILE_SIZE_MB}MB)`);
          return false;
        }
        return true;
      }

      if (!VALID_VIDEO_MIME_TYPES.includes(file.type)) {
        setError("Unsupported file type. Please upload a video (MP4, WebM, OGG, MOV)." );
        return false;
      }
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        setError(`File size exceeds limit (max ${MAX_VIDEO_SIZE_MB}MB)`);
        return false;
      }
      return true;
    };

    const handleFile = (file: File | null) => {
      if (!file) return;
      setError(null);
      const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
      if (!validateFile(file, kind)) return;

      setImageUrl(null);
      setVideoUrl(null);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      const preview = URL.createObjectURL(file);
      previewUrlRef.current = preview;
      setPreviewUrl(preview);
      setPreviewKind(kind);
      startMediaUpload(file, kind, preview);
    };

    const startMediaUpload = async (file: File, kind: "image" | "video", preview: string) => {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!uploadPreset || !cloudName) {
          handleUploadError("Cloudinary configuration is missing");
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        // Fixed Cloudinary URL (removed space)
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${kind}/upload`;
        
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr; // Store xhr for aborting

        xhr.open("POST", cloudinaryUrl);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(percentComplete));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (kind === "image") {
              setImageUrl(data.secure_url);
              setVideoUrl(null);
            } else {
              setVideoUrl(data.secure_url);
              setImageUrl(null);
            }
            if (preview) URL.revokeObjectURL(preview);
            if (previewUrlRef.current === preview) previewUrlRef.current = null;
            setPreviewUrl(null);
            setPreviewKind(null);
            setError(null);
          } else {
            let detailedMessage: string | null = null;
            try {
              const parsed = JSON.parse(xhr.responseText);
              detailedMessage = parsed?.error?.message || parsed?.message || null;
            } catch {
              detailedMessage = null;
            }
            handleUploadError(detailedMessage ? `Upload failed: ${detailedMessage}` : `Upload failed: ${xhr.statusText || "Unknown error"}`);
          }
          setUploading(false);
          textareaRef.current?.focus();
        };

        xhr.onerror = () => {
          handleUploadError("Network error during upload");
        };

        xhr.onabort = () => {
          handleUploadError("Upload aborted");
        };

        xhr.send(formData);
      } catch (e) {
        handleUploadError(`Upload failed: ${String(e)}`);
      }
    };

    const handleUploadError = (message: string) => {
      setError(message);
      setUploading(false);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      setPreviewKind(null);
      // Reset file input to allow re-selecting same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const cancelUpload = () => {
      if (xhrRef.current) {
        xhrRef.current.abort();
        xhrRef.current = null;
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      setImageUrl(null);
      setVideoUrl(null);
      setPreviewKind(null);
      setUploading(false);
      setError(null);
      // Reset file input to allow re-selecting same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleSend = () => {
      if (message.trim() || imageUrl || videoUrl) {
        onSend(message.trim(), imageUrl || undefined, videoUrl || undefined);
        setMessage("");
        setImageUrl(null);
        setVideoUrl(null);
        resetTextareaHeight();
        setError(null);
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        setPreviewUrl(null);
        setPreviewKind(null);
        // Reset file input after sending
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      textareaRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) handleFile(files[0]);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    const addEmoji = (emoji: EmojiSelectData) => {
      setMessage((prev) => prev + emoji.native);
      textareaRef.current?.focus();
    };

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (!(e.target instanceof Element)) return;
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node) &&
          !e.target.closest(".emoji-picker")
        ) {
          setShowEmojiPicker(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="w-full pb-[env(safe-area-inset-bottom)]" ref={containerRef}>
        {/* Error */}
        {error && (
          <div className="mb-2 p-2 bg-red-900/30 text-red-200 rounded-lg text-sm flex items-center border border-red-700/50">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Image preview */}
        {(previewUrl || imageUrl || videoUrl) && (
          <div className="relative mb-3 max-w-[200px] rounded-xl overflow-hidden border-2 border-purple-500/60 bg-gray-800">
            <div className="relative w-full aspect-square">
              {((previewUrl && previewKind === "video") || (!previewUrl && videoUrl)) ? (
                <video
                  src={previewUrl || videoUrl!}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={previewUrl || imageUrl!}
                  alt="Preview"
                  fill
                  style={{ objectFit: "contain" }}
                />
              )}
            </div>

            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <CircularProgress progress={uploadProgress} size={80} strokeWidth={6} />
              </div>
            )}

            <button
              type="button"
              onClick={cancelUpload}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-lg focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Remove image"
            >
              <FiX />
            </button>
          </div>
        )}

        {/* Main input */}
        <div
          ref={dropZoneRef}
          className={`flex items-end space-x-2 p-2 rounded-xl transition-all duration-200 ${
            isDragging
              ? "bg-purple-900/30 ring-2 ring-purple-500"
              : "bg-gray-700/30 backdrop-blur-sm"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File input - FIXED for mobile */}
          <label
            className={`cursor-pointer p-2 rounded-lg transition-colors flex-shrink-0 ${
              uploading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-600/50 text-gray-300 hover:text-white"
            }`}
            title="Attach an image"
            aria-label="Attach an image"
          >
            {/* Critical fix: Use absolute positioning instead of hidden class */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ 
                position: 'absolute', 
                left: '-9999px', 
                opacity: 0, 
                zIndex: -1 
              }}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            <FiPaperclip className="w-5 h-5" />
          </label>

          {/* Textarea */}
          <div className="flex-grow relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (onTyping) onTyping();
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Type a message..."
              className="w-full bg-gray-600/30 backdrop-blur-sm text-white rounded-xl p-2 pl-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[44px] max-h-32 transition-all border border-gray-600 pr-10"
              rows={1}
              disabled={uploading}
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="absolute right-2 bottom-2 text-gray-400 hover:text-white transition-colors"
              disabled={uploading}
              style={{ bottom: "12px" }}
              aria-label="Open emoji picker"
              aria-expanded={showEmojiPicker}
            >
              <FiSmile className="w-6 h-6" />
            </button>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={uploading || (!message.trim() && !imageUrl && !videoUrl)}
            className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full font-medium transition-colors ${
              uploading
                ? "bg-purple-600/50 cursor-wait"
                : !message.trim() && !imageUrl && !videoUrl
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg"
            }`}
          >
            {uploading ? (
              <div className="w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin"></div>
            ) : (
              <FiSend className="w-5 h-5 text-gray-200" />
            )}
          </button>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="fixed bottom-24 left-0 right-0 z-50 mx-auto max-w-md">
            <EmojiPicker
              onSelect={addEmoji}
              onClickOutside={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-xl border-2 border-dashed border-purple-500 flex flex-col items-center max-w-md text-center">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <FiPaperclip className="w-8 h-8 text-white" />
              </div>
              <p className="text-xl font-semibold text-white mb-2">
                Drop to upload media
              </p>
              <p className="text-gray-400">
                Supports images (max {MAX_FILE_SIZE_MB}MB) and videos (max {MAX_VIDEO_SIZE_MB}MB)
              </p>
              <p className="text-gray-500 text-sm mt-3">
                Release your file to attach it to the message
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";
export default MessageInput;
