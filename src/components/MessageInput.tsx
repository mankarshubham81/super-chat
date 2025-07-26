import React, { 
  useState, 
  useRef, 
  forwardRef, 
  useImperativeHandle,
  useEffect,
  useCallback
} from "react";
import Image from "next/image";

export type MessageInputRef = {
  focus: () => void;
  clear: () => void;
  cancelUpload: () => void;
};

type MessageInputProps = {
  onSend: (message: string, imageUrl?: string) => void;
  onTyping?: () => void;
};

const MAX_FILE_SIZE_MB = 20;
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
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
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-purple-700">
        {progress}%
      </div>
    </div>
  );
};

const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
  ({ onSend, onTyping }, ref) => {
    const [message, setMessage] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => {
        setMessage("");
        resetTextareaHeight();
        cancelUpload();
      },
      cancelUpload: () => cancelUpload()
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
        textareaRef.current.style.height = `${Math.min(
          textareaRef.current.scrollHeight,
          132
        )}px`;
      }
    }, []);

    useEffect(() => {
      autoResizeTextarea();
    }, [message, autoResizeTextarea]);

    const validateFile = (file: File): boolean => {
      if (!VALID_MIME_TYPES.includes(file.type)) {
        setError("Unsupported file type. Please upload an image (JPEG, PNG, GIF, WEBP).");
        return false;
      }

      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File size exceeds limit (max ${MAX_FILE_SIZE_MB}MB)`);
        return false;
      }

      return true;
    };

    const handleFile = (file: File | null) => {
      if (!file) return;
      
      setError(null);
      
      if (!validateFile(file)) {
        return;
      }

      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      startImageUpload(file);
    };

    const startImageUpload = (file: File) => {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setImageUrl(data.secure_url);
          URL.revokeObjectURL(previewUrl!);
          setPreviewUrl(null);
          setError(null);
        } else {
          handleUploadError(`Upload failed: ${xhr.statusText}`);
        }
        setUploading(false);
        xhrRef.current = null;
        textareaRef.current?.focus();
      };

      xhr.onerror = () => {
        handleUploadError("Network error during upload");
      };

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    };

    const handleUploadError = (message: string) => {
      setError(message);
      setUploading(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      xhrRef.current = null;
    };

    const cancelUpload = () => {
      if (uploading && xhrRef.current) {
        xhrRef.current.abort();
      }
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      
      setImageUrl(null);
      setUploading(false);
      setError(null);
    };

    const handleSend = () => {
      if (message.trim() || imageUrl) {
        onSend(message.trim(), imageUrl || undefined);
        setMessage("");
        setImageUrl(null);
        resetTextareaHeight();
        setError(null);
        
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
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
      if (files.length > 0) {
        handleFile(files[0]);
      }
    };

    // Paste image from clipboard
    const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    return (
      <div className="flex flex-col w-full">
        {/* Error message */}
        {error && (
          <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-lg text-sm flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Image preview */}
        {(previewUrl || imageUrl) && (
          <div className="relative mb-3 max-w-[200px] rounded-lg overflow-hidden border-2 border-purple-500 bg-gray-100">
            <div className="relative w-full aspect-square">
              <img
                src={previewUrl || imageUrl || ""}
                alt="Preview"
                className="object-contain w-full h-full"
              />
            </div>
            
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                <CircularProgress progress={uploadProgress} size={80} strokeWidth={6} />
              </div>
            )}
            
            <button
              onClick={cancelUpload}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        )}

        {/* Main input area */}
        <div 
          ref={dropZoneRef}
          className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-200 ${
            isDragging ? "bg-purple-100 ring-2 ring-purple-400" : "bg-gray-100"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File input with enhanced label */}
          <label 
            className={`cursor-pointer p-2 rounded-lg transition-colors flex-shrink-0 ${
              uploading ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-100"
            }`}
            title="Attach an image"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = ""; // Reset to allow selecting same file again
              }}
            />
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>

          {/* Textarea with paste support */}
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
            className="flex-grow bg-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[44px] max-h-32 transition-all border border-gray-300"
            rows={1}
            disabled={uploading}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={uploading || (!message.trim() && !imageUrl)}
            className={`bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px] flex items-center justify-center ${
              uploading ? "cursor-wait" : ""
            }`}
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploadProgress}%
              </>
            ) : "Send"}
          </button>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-xl border-2 border-dashed border-purple-500 flex flex-col items-center">
              <CircularProgress progress={0} size={100} strokeWidth={8} />
              <p className="text-xl font-semibold mt-4">Drop image to upload</p>
              <p className="text-gray-600 mt-2">Supports JPG, PNG, GIF (max {MAX_FILE_SIZE_MB}MB)</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
