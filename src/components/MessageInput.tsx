import React, { 
  useState, 
  useRef, 
  forwardRef, 
  useImperativeHandle,
  useEffect
} from "react";
import Image from "next/image";

export type MessageInputRef = {
  focus: () => void;
  clear: () => void;
};

type MessageInputProps = {
  onSend: (message: string, imageUrl?: string) => void;
  onTyping?: () => void;
};

const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
  ({ onSend, onTyping }, ref) => {
    const [message, setMessage] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const xhrRef = useRef<XMLHttpRequest | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      clear: () => {
        setMessage("");
        resetTextareaHeight();
      }
    }));

    const resetTextareaHeight = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = "44px";
      }
    };

    const autoResizeTextarea = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(
          textareaRef.current.scrollHeight,
          132
        )}px`;
      }
    };

    useEffect(() => {
      autoResizeTextarea();
    }, [message]);

    const startImageUpload = (file: File) => {
      if (file.size > 20 * 1024 * 1024) {
        alert("File size too large (max 20MB)");
        return;
      }

      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
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
          URL.revokeObjectURL(preview);
          setPreviewUrl(null);
        } else {
          console.error("Upload failed:", xhr.statusText);
          alert("Image upload failed");
          URL.revokeObjectURL(preview);
          setPreviewUrl(null);
        }
        setUploading(false);
        xhrRef.current = null;
        textareaRef.current?.focus();
      };

      xhr.onerror = () => {
        console.error("Upload error");
        alert("Image upload failed");
        URL.revokeObjectURL(preview);
        setPreviewUrl(null);
        setUploading(false);
        xhrRef.current = null;
        textareaRef.current?.focus();
      };

      xhr.open("POST", `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(formData);
    };

    const handleSend = () => {
      if (message.trim() || imageUrl) {
        onSend(message.trim(), imageUrl || undefined);
        setMessage("");
        setImageUrl(null);
        resetTextareaHeight();
        
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

    return (
      <div className="flex flex-col w-full">
        {(previewUrl || imageUrl) && (
          <div className="relative mb-2 w-[150px] h-[150px]">
            <Image
              src={previewUrl || imageUrl || ""}
              alt="Preview"
              fill
              className="object-cover rounded-lg border-2 border-purple-500"
              unoptimized
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-sm rounded-lg">
                Uploading: {uploadProgress}%
              </div>
            )}
            <button
              onClick={() => {
                if (uploading) {
                  xhrRef.current?.abort();
                  setUploading(false);
                  setUploadProgress(0);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                } else {
                  setImageUrl(null);
                }
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <label className="cursor-pointer p-2 hover:bg-purple-100 rounded-lg transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  startImageUpload(file);
                }
                e.target.value = ""; // Reset to allow selecting same file again
              }}
            />
            <svg
              className="w-6 h-6 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </label>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (onTyping) onTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-grow bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[44px] max-h-32 transition-all"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={uploading || (!message.trim() && !imageUrl)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[80px]"
          >
            {uploading ? "Uploading..." : "Send"}
          </button>
        </div>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";

export default MessageInput;
